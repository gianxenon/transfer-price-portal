import "server-only"

import { cookies } from "next/headers"
import type { TpUploaderResultItem } from "@/src/app/application/events/tp-uploader/upload"
import { validateTpUpload } from "@/src/app/application/use-cases/tp-uploader/validate"
import { sendTpUploadSummaryEmails } from "@/src/app/application/use-cases/tp-uploader/send-summary-emails"
import { getSessionById, getUserNameById } from "@/src/app/infrastructure/db/auth-repo"
import { syncTpUploadToEbtCtgiApi } from "@/src/app/infrastructure/data-sources/tp-uploader/ebtctgi-sync"
import { getPool } from "@/src/app/infrastructure/db"
import { upsertTpRows } from "@/src/app/infrastructure/db/tp-uploader-repo"
import type { TpUploadCtgiEmailRow } from "@/src/app/infrastructure/tp-uploader/email-summary"

export const runtime = "nodejs"
export const maxDuration = 60

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function buildWarningItem(message: string) {
  return {
    row: 0,
    message,
    status: "warning" as const,
  }
}

type InterCompanyLookupRow = {
  companyId?: number
  companyName?: string
  isInterCompany?: boolean | number
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData() 
    const file = formData.get("file")
    const effectivityDate = String(formData.get("effectivityDate") ?? "").trim()
    const companyIdRaw = String(formData.get("companyId") ?? "").trim()
    const emailList = String(formData.get("emailList") ?? "").trim()

    if(!(file instanceof File)) {
        return jsonResponse({ ok: false, summary: "No file uploaded.", items: [] }, 400)
    }
    if (!effectivityDate) {
      return jsonResponse({ ok: false, summary: "Effectivity date is required.", items: [] }, 400)
    }
    if (!companyIdRaw) {
      return jsonResponse({ ok: false, summary: "Company is required.", items: [] }, 400)
    }
    const customersMotherCompanyId = Number(companyIdRaw)
    if (Number.isNaN(customersMotherCompanyId)) {
      return jsonResponse({ ok: false, summary: "Company is invalid.", items: [] }, 400)
    }
    if (!emailList) {
      return jsonResponse({ ok: false, summary: "Email list is required.", items: [] }, 400)
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return jsonResponse(
        { ok: false, summary: "File exceeds the 10MB limit.", items: [] },
        413
      )
    }
    const isXlsx = file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || file.name.toLowerCase().endsWith(".xlsx")
    if (!isXlsx) {
        return jsonResponse({ ok: false, summary: "Only .xlsx files are allowed.", items: [] }, 400)
    }
    const validation = await validateTpUpload(file)
    if (!validation.ok) {
        return jsonResponse({ ok: false, summary: validation.summary, items: validation.items }, 400)
    }

    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value
    let createdBy = "system"
    if (sessionToken) {
      const session = await getSessionById(sessionToken)
      if (session?.Userid) {
        const userName = await getUserNameById(session.Userid)
        createdBy = userName ?? String(session.Userid)
      }
    }

    const pool = await getPool()
    const result = await pool
      .request()
      .input("companyId", customersMotherCompanyId)
      .query(`SELECT TOP 1
        CustomersMotherCompanyName AS companyName,
        CustomersMotherCompanyId AS companyId,
        isInterCompany
      FROM CustomersMotherCompany
      WHERE CustomersMotherCompanyId = @companyId`)

    const companyRow = result.recordset?.[0] as InterCompanyLookupRow | undefined
    const rawName = String(companyRow?.companyName ?? "").trim()
    const rawCompanyId = Number(companyRow?.companyId)
    const rawIsInterCompany = Number(companyRow?.isInterCompany ?? 0)

    if (!rawName || !Number.isInteger(rawCompanyId) || rawCompanyId <= 0) {
      return jsonResponse(
        { ok: false, summary: "Company is invalid.", items: [] },
        400
      )
    }

    const companyName = rawName
    const interCompanyId =
      rawIsInterCompany === 1 ? rawCompanyId : undefined

    const responseItems: TpUploaderResultItem[] = [...(validation.items || [])]
    const summaryParts: string[] = []
    const rows = validation.rows || []
    let ctgiRowsByBusinessCenter: Partial<Record<string, TpUploadCtgiEmailRow[]>> = {}
    let ctgiApiResponse: unknown = null
    await upsertTpRows({
      rows,
      customersMotherCompanyId,
      effectivityDate,
      emailList,
      filename: file.name,
      createdBy,
    })
   if (interCompanyId === customersMotherCompanyId) { 
      try {
        const ctgiResult = await syncTpUploadToEbtCtgiApi({
          rows,
          effectivityDate,
          filename: file.name,
          createdBy,
        })

        ctgiRowsByBusinessCenter = ctgiResult.emailRowsByBusinessCenter
        ctgiApiResponse = ctgiResult.apiResponse ?? null

        // if (ctgiResult.sent > 0) {
        //   summaryParts.push(`CTGI sync sent: ${ctgiResult.sent}.`)
        // }

        if (ctgiResult.warnings.length > 0) {
          summaryParts.push(`CTGI sync warnings: ${ctgiResult.warnings.length}.`)
          for (const warning of ctgiResult.warnings) {
            responseItems.push(buildWarningItem(warning))
          }
        }
      } catch (error) {
        const ctgiWarning = `CTGI sync warning: ${getErrorMessage(
          error,
          "Failed to sync to EBT-CTGI."
        )}`
        responseItems.push(buildWarningItem(ctgiWarning))
        summaryParts.push(ctgiWarning)
      }
    }

    try {
      const emailResult = await sendTpUploadSummaryEmails({
        rows,
        ctgiRowsByBusinessCenter,
        effectivityDate,
        emailList,
        filename: file.name,
        companyName,
        createdBy,
      })

      summaryParts.push(`Emails sent: ${emailResult.sent}.`)
    } catch (error) {
      const emailWarning = `Email warning: ${getErrorMessage(
        error,
        "Failed to send summary email."
      )}`
      responseItems.push(buildWarningItem(emailWarning))
      summaryParts.push(emailWarning)
    }

    return jsonResponse({
      ok: true,
      summary: [validation.summary, ...summaryParts].join(" ").trim(),
      items: responseItems,
      ctgiApiResponse,
    })
  
  } catch (error) {
     const message = getErrorMessage(error, "Error processing file.")
     return jsonResponse({ ok: false, summary: message, items: [] }, 500)
  } 
}

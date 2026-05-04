import "server-only"

import { cookies } from "next/headers"
import sql from "mssql"
import { validateTpUpload } from "@/src/app/application/use-cases/tp-uploader/validate"
import { sendTpUploadSummaryEmails } from "@/src/app/application/use-cases/tp-uploader/send-summary-emails"
import { getSessionById, getUserNameById } from "@/src/app/infrastructure/db/auth-repo"
import { getPool } from "@/src/app/infrastructure/db"
import { upsertTpRows } from "@/src/app/infrastructure/db/tp-uploader-repo"

export const runtime = "nodejs"
export const maxDuration = 60

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
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

    let companyName: string | undefined
    try {
      const pool = await getPool()
      const result = await pool
        .request()
        .input("companyId", sql.Int, customersMotherCompanyId)
        .query(
          "SELECT TOP 1 CustomersMotherCompanyName AS companyName FROM CustomersMotherCompany WHERE CustomersMotherCompanyId = @companyId"
        )
      const rawName = String(result.recordset?.[0]?.companyName ?? "").trim()
      companyName = rawName || undefined
    } catch {
      companyName = undefined
    }

    await upsertTpRows({
      rows: validation.rows || [],
      customersMotherCompanyId,
      effectivityDate,
      emailList,
      filename: file.name,
      createdBy,
    })

    try {
      const emailResult = await sendTpUploadSummaryEmails({
        rows: validation.rows || [],
        effectivityDate,
        emailList,
        filename: file.name,
        companyName,
        createdBy,
      })

      const bcCount = emailResult.sent.length
      const summary = `${validation.summary} Emails sent per BC: ${bcCount}.`
      return jsonResponse({ ok: true, summary, items: validation.items }, 200)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send summary email."
      const summary = `${validation.summary} Upload completed, but email sending failed: ${message}`
      return jsonResponse(
        {
          ok: true,
          summary,
          items: [
            ...(validation.items || []),
            { row: 0, message, status: "warning" },
          ],
        },
        200
      )
    }
  
  } catch (error) {
     const message = error instanceof Error ? error.message : "Error processing file."
     return jsonResponse({ ok: false, summary: message, items: [] }, 500)
  } 
}

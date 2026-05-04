import "server-only"

import { BUSINESS_CENTER_HEADERS } from "@/src/app/infrastructure/db/tp-uploader-repo"
import { sendHtmlMail } from "@/src/app/infrastructure/email/smtp-mailer"
import {
  buildTpUploadSummaryEmailHtml,
  TpUploadEmailRow,
} from "@/src/app/infrastructure/tp-uploader/email-summary"

type TpUploaderRow = Record<string, string | number>

type SendTpUploadSummaryEmailsInput = {
  rows: TpUploaderRow[]
  effectivityDate: string
  emailList: string
  filename: string
  companyName?: string
  createdBy: string
}

function parseEmailList(value: string) {
  return value
    .split(/[;,]+/g)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function formatEffectivityDate(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return trimmed
  const month = String(parsed.getMonth() + 1).padStart(2, "0")
  const day = String(parsed.getDate()).padStart(2, "0")
  const year = String(parsed.getFullYear())
  return `${month}/${day}/${year}`
}

function parseNumber(value: unknown) {
  if (typeof value === "number") return value
  const cleaned = String(value ?? "").replace(/,/g, "").trim()
  if (!cleaned) return NaN
  return Number(cleaned)
}

export async function sendTpUploadSummaryEmails(
  input: SendTpUploadSummaryEmailsInput
) {
  const recipients = parseEmailList(input.emailList)

  const effectivityDateFormatted = formatEffectivityDate(input.effectivityDate)
  const companyLabel = input.companyName?.trim()
  const introParts = [
    companyLabel ? `Company: ${companyLabel}` : null,
    input.filename ? `File: ${input.filename}` : null,
    input.createdBy ? `Uploaded by: ${input.createdBy}` : null,
    effectivityDateFormatted ? `Effectivity: ${effectivityDateFormatted}` : null,
  ].filter(Boolean)

  const subtitle = introParts.join(" | ")

  const sendResults: Array<{ businessCenter: string; rows: number }> = []

  for (const businessCenter of BUSINESS_CENTER_HEADERS) {
    const emailRows: TpUploadEmailRow[] = input.rows
      .map((row) => {
        const productId = String(row["ProductsId"] ?? "").trim()
        const productName = String(row["ProductsName"] ?? "").trim()
        const uom = String(row["SALES UOM"] ?? "").trim()
        const price = parseNumber(row[businessCenter])

        if (!productId || !productName || !uom || !Number.isFinite(price)) {
          return null
        }

        return {
          productId,
          productName,
          price,
          uom,
          effectivityDate: effectivityDateFormatted,
          customerGroup: "",
          distributionChannel: "",
          businessCenter,
          articleNo: "",
          remarks: "",
        }
      })
      .filter((row): row is TpUploadEmailRow => Boolean(row))

    if (emailRows.length === 0) continue

    const html = buildTpUploadSummaryEmailHtml({
      title: `Transfer Price Upload Summary - ${businessCenter}`,
      subtitle,
      rows: emailRows,
    })

    const subject = effectivityDateFormatted
      ? `Transfer Price Upload Summary - ${businessCenter} - ${effectivityDateFormatted}`
      : `Transfer Price Upload Summary - ${businessCenter}`

    await sendHtmlMail({
      to: recipients,
      subject,
      html,
    })

    sendResults.push({ businessCenter, rows: emailRows.length })
  }

  return {
    recipients,
    sent: sendResults,
  }
}

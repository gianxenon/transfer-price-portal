import "server-only"

import { BUSINESS_CENTER_HEADERS } from "@/src/app/infrastructure/db/tp-uploader-repo"
import { sendHtmlMail } from "@/src/app/infrastructure/email/smtp-mailer"
import {
  buildTpUploadSummaryEmailHtml,
  TpUploadCtgiEmailRow,
  TpUploadWmsEmailRow,
} from "@/src/app/infrastructure/tp-uploader/email-summary"

type TpUploaderRow = Record<string, string | number>

type SendTpUploadSummaryEmailsInput = {
  rows: TpUploaderRow[]
  ctgiRowsByBusinessCenter?: Partial<Record<string, TpUploadCtgiEmailRow[]>>
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
  return formatDateParts(parsed)
}

function formatDateParts(value: Date) {
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  const year = String(value.getFullYear())
  return `${month}/${day}/${year}`
}

function formatSubjectDate(value: Date) {
  return formatDateParts(value)
}

function parseNumber(value: unknown) {
  if (typeof value === "number") return value
  const cleaned = String(value ?? "").replace(/,/g, "").trim()
  if (!cleaned) return NaN
  return Number(cleaned)
}

function buildWmsEmailRows(rows: TpUploaderRow[]) {
  const wmsRows: TpUploadWmsEmailRow[] = []

  for (const row of rows) {
    const productId = String(row["ProductsId"] ?? "").trim()
    const productName = String(row["ProductsName"] ?? "").trim()
    const uom = String(row["SALES UOM"] ?? "").trim()

    if (!productId || !productName || !uom) {
      continue
    }

    const pricesByBusinessCenter: Partial<Record<string, number>> = {}
    let hasAtLeastOnePrice = false

    for (const businessCenter of BUSINESS_CENTER_HEADERS) {
      const price = parseNumber(row[businessCenter])
      if (!Number.isFinite(price)) {
        continue
      }

      pricesByBusinessCenter[businessCenter] = price
      hasAtLeastOnePrice = true
    }

    if (!hasAtLeastOnePrice) {
      continue
    }

    wmsRows.push({
      productId,
      productName,
      uom,
      pricesByBusinessCenter,
      remarks: "",
    })
  }

  return wmsRows
}

function flattenCtgiEmailRows(
  ctgiRowsByBusinessCenter?: Partial<Record<string, TpUploadCtgiEmailRow[]>>
) {
  const rows: TpUploadCtgiEmailRow[] = []

  for (const businessCenter of BUSINESS_CENTER_HEADERS) {
    const businessCenterRows = ctgiRowsByBusinessCenter?.[businessCenter] || []
    rows.push(...businessCenterRows)
  }

  return rows
}

export async function sendTpUploadSummaryEmails(
  input: SendTpUploadSummaryEmailsInput
) {
  const recipients = parseEmailList(input.emailList)

  const effectivityDateFormatted = formatEffectivityDate(input.effectivityDate)
  const subjectDate = formatSubjectDate(new Date())
  const companyLabel = input.companyName?.trim()
  const introParts = [
    companyLabel ? `Company: ${companyLabel}` : null,
    input.filename ? `File: ${input.filename}` : null,
    input.createdBy ? `Uploaded by: ${input.createdBy}` : null,
    effectivityDateFormatted ? `Effectivity: ${effectivityDateFormatted}` : null,
  ].filter(Boolean)

  const subtitle = introParts.join(" | ")
  const subject = `Transfer Price Upload Summary - ${subjectDate}`
  const wmsRows = buildWmsEmailRows(input.rows)
  const ctgiRows = flattenCtgiEmailRows(input.ctgiRowsByBusinessCenter)

  if (wmsRows.length === 0 && ctgiRows.length === 0) {
    return {
      recipients,
      sent: 0,
    }
  }

  const html = buildTpUploadSummaryEmailHtml({
    title: "Transfer Price Upload Summary",
    subtitle,
    sections: [
      {
        kind: "wms",
        title: "WMS TRANSFER PRICE",
        rows: wmsRows,
      },
      {
        kind: "ctgi",
        title: "BOS-CTGI",
        rows: ctgiRows,
      },
    ],
  })

  await sendHtmlMail({
    to: recipients,
    subject,
    html,
  })

  return {
    recipients,
    sent: 1,
  }
}

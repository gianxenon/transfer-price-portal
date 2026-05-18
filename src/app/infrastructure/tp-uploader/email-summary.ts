import "server-only"

import { BUSINESS_CENTER_HEADERS } from "@/src/app/infrastructure/db/tp-uploader-repo"

export type TpUploadWmsEmailRow = {
  productId: string
  productName: string
  uom: string
  pricesByBusinessCenter: Partial<Record<string, number>>
  remarks: string
}

export type TpUploadCtgiEmailRow = {
  productId: string
  productName: string
  uom: string
  warehouse: string
  businessCenter: string
  price: number
  remarks: string
}

type BuildEmailHtmlInput = {
  title: string
  subtitle?: string
  sections: Array<
    | {
        kind: "wms"
        title: string
        rows: TpUploadWmsEmailRow[]
      }
    | {
        kind: "ctgi"
        title: string
        rows: TpUploadCtgiEmailRow[]
      }
  >
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return ""
  return value.toLocaleString("en-US", { maximumFractionDigits: 6 })
}

function buildWmsTableHtml(rows: TpUploadWmsEmailRow[]) {
  const headerCells = [
    "Products ID",
    "Products Name",
    "Sales UOM",
    ...BUSINESS_CENTER_HEADERS,
    "Remarks",
  ]

  const rowsHtml = rows
    .map((row) => {
      const cells = [
        row.productId,
        row.productName,
        row.uom,
        ...BUSINESS_CENTER_HEADERS.map((businessCenter) =>
          formatNumber(row.pricesByBusinessCenter[businessCenter] ?? NaN)
        ),
        row.remarks,
      ].map((cell) => `<td style="border:1px solid #c9c9c9;padding:6px 8px;">${escapeHtml(String(cell ?? ""))}</td>`)

      return `<tr>${cells.join("")}</tr>`
    })
    .join("")

  return `<div style="margin-top:12px;overflow-x:auto;">
        <table style="border-collapse:separate;border-spacing:0;width:100%;min-width:1200px;font-size:12px;">
          <thead>
            <tr>
              ${headerCells
                .map(
                  (label) =>
                    `<th style="background:#cfe2f3;border:1px solid #b9cde5;padding:8px;text-align:center;white-space:nowrap;">${escapeHtml(label)}</th>`
                )
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>`
}

function buildCtgiTableHtml(rows: TpUploadCtgiEmailRow[]) {
  const headerCells = [
    "Products ID",
    "Products Name",
    "Sales UOM",
    "Warehouse",
    "Name of BC's",
    "Price",
    "Remarks",
  ]

  const rowsHtml = rows
    .map((row) => {
      const cells = [
        row.productId,
        row.productName,
        row.uom,
        row.warehouse,
        row.businessCenter,
        formatNumber(row.price),
        row.remarks,
      ].map((cell) => `<td style="border:1px solid #c9c9c9;padding:6px 8px;">${escapeHtml(String(cell ?? ""))}</td>`)

      return `<tr>${cells.join("")}</tr>`
    })
    .join("")

  return `<div style="margin-top:12px;overflow-x:auto;">
        <table style="border-collapse:separate;border-spacing:0;width:100%;min-width:980px;font-size:12px;">
          <thead>
            <tr>
              ${headerCells
                .map(
                  (label) =>
                    `<th style="background:#cfe2f3;border:1px solid #b9cde5;padding:8px;text-align:center;white-space:nowrap;">${escapeHtml(label)}</th>`
                )
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>`
}

export function buildTpUploadSummaryEmailHtml(input: BuildEmailHtmlInput) {
  const subtitle = input.subtitle ? `<div style="margin-top:4px;color:#4b5563;">${escapeHtml(input.subtitle)}</div>` : ""
  const sectionsHtml = input.sections
    .filter((section) => section.rows.length > 0)
    .map(
      (section) => `<div style="margin-top:16px;font-size:13px;font-weight:700;letter-spacing:0.04em;color:#1f2937;">${escapeHtml(section.title)}</div>
      ${
        section.kind === "wms"
          ? buildWmsTableHtml(section.rows)
          : buildCtgiTableHtml(section.rows)
      }`
    )
    .join("")

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;background:#ffffff;color:#111827;">
    <div style="font-size:14px;line-height:1.4;">
      <div style="font-size:16px;font-weight:700;">${escapeHtml(input.title)}</div>
      ${subtitle}
      ${sectionsHtml}
    </div>
  </body>
</html>`
}

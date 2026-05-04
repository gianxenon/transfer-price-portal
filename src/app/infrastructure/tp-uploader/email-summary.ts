import "server-only"

export type TpUploadEmailRow = {
  productId: string
  productName: string
  price: number
  uom: string
  effectivityDate: string
  customerGroup: string
  distributionChannel: string
  businessCenter: string
  articleNo: string
  remarks: string
}

type BuildEmailHtmlInput = {
  title: string
  subtitle?: string
  rows: TpUploadEmailRow[]
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

export function buildTpUploadSummaryEmailHtml(input: BuildEmailHtmlInput) {
  const headerCells = [
    "Product Id",
    "Product Name",
    "Price",
    "Uom",
    "Effectivity Date",
    "Customer Group",
    "Distribution Channel",
    "Business Center",
    "Article No",
    "Remarks",
  ]

  const rowsHtml = input.rows
    .map((row) => {
      const cells = [
        row.productId,
        row.productName,
        formatNumber(row.price),
        row.uom,
        row.effectivityDate,
        row.customerGroup,
        row.distributionChannel,
        row.businessCenter,
        row.articleNo,
        row.remarks,
      ].map((cell) => `<td style="border:1px solid #c9c9c9;padding:6px 8px;">${escapeHtml(String(cell ?? ""))}</td>`)

      return `<tr>${cells.join("")}</tr>`
    })
    .join("")

  const subtitle = input.subtitle ? `<div style="margin-top:4px;color:#4b5563;">${escapeHtml(input.subtitle)}</div>` : ""

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
      <div style="margin-top:12px;overflow-x:auto;">
        <table style="border-collapse:separate;border-spacing:0;width:100%;min-width:900px;font-size:12px;">
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
      </div>
    </div>
  </body>
</html>`
}

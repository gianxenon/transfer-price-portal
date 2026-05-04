import { parseExcel } from "@/src/app/infrastructure/tp-uploader/parse-excel"

export type TpUploaderRow = Record<string, string | number>

export type TpUploaderRowError = {
  row: number
  message: string
  status: "error"
}

export type TpUploaderValidationResult = {
  ok: boolean
  summary: string
  items: TpUploaderRowError[]
  rows?: TpUploaderRow[]
}

const EXPECTED_HEADERS = [
  "ProductsId",
  "ProductsName",
  "SALES UOM",
  "NCR",
  "UPPER LUZON",
  "CENTRAL LUZON",
  "BC BicoL",
  "BC Stag",
  "BC Ilocos",
  "BC Isabela",
  "BC Calbayog",
  "BC Ormoc",
  "BC Tacloban",
  "BC Iloilo",
  "BC Roxas",
  "BC Bacolod",
  "BC Dumaguete",
  "BC Cebu",
  "BC CDO",
  "BC Davao",
  "BC Gensan",
  "BC Zamboanga",
  "BC Ozamiz",
  "BC Butuan",
]

const NON_NUMERIC_HEADERS = ["ProductsId", "ProductsName", "SALES UOM"]

const NUMERIC_HEADERS = EXPECTED_HEADERS.filter(
  (header) => !NON_NUMERIC_HEADERS.includes(header)
)

function normalizeHeader(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase()
}

function isRowEmpty(row: unknown[]) {
  return row.every((cell) => String(cell ?? "").trim() === "")
}

function parseNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN
  const cleaned = String(value ?? "").replace(/,/g, "").trim()
  if (!cleaned) return NaN
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : NaN
}

export async function validateTpUpload(file: File): Promise<TpUploaderValidationResult> {
  const { headers, rows } = await parseExcel(file)
  const normalizedHeaders = headers.map(normalizeHeader)
  const headerIndex = new Map(normalizedHeaders.map((header, index) => [header, index]))

  const missingHeaders = EXPECTED_HEADERS.filter(
    (header) => !headerIndex.has(normalizeHeader(header))
  )

  if (missingHeaders.length > 0) {
    const message = `Missing headers: ${missingHeaders.join(", ")}`
    return {
      ok: false,
      summary: message,
      items: [{ row: 1, message, status: "error" }],
    }
  }

  const errors: TpUploaderRowError[] = []
  const parsedRows: TpUploaderRow[] = []

  rows.forEach((row, index) => {
    if (isRowEmpty(row)) {
      return
    }

    const rowNumber = index + 2
    const getValue = (header: string) => {
      const colIndex = headerIndex.get(normalizeHeader(header))
      if (colIndex === undefined) return ""
      return row[colIndex]
    }

    const productId = String(getValue("ProductsId") ?? "").trim()
    const productName = String(getValue("ProductsName") ?? "").trim()
    const salesUom = String(getValue("SALES UOM") ?? "").trim()

    if (!productId) {
      errors.push({ row: rowNumber, message: "ProductsId is required.", status: "error" })
    }
    if (!productName) {
      errors.push({ row: rowNumber, message: "ProductsName is required.", status: "error" })
    }
    if (!salesUom) {
      errors.push({ row: rowNumber, message: "SALES UOM is required.", status: "error" })
    }

    NUMERIC_HEADERS.forEach((header) => {
      const raw = getValue(header)
      const numberValue = parseNumber(raw)
      if (Number.isNaN(numberValue)) {
        errors.push({
          row: rowNumber,
          message: `${header} must be numeric.`,
          status: "error",
        })
        return
      }

      if (numberValue <= 0) {
        errors.push({
          row: rowNumber,
          message: `${header} must be greater than 0.`,
          status: "error",
        })
      }
    })

    const normalizedRow: TpUploaderRow = {}
    EXPECTED_HEADERS.forEach((header) => {
      const raw = getValue(header)
      if (NUMERIC_HEADERS.includes(header)) {
        const numberValue = parseNumber(raw)
        normalizedRow[header] = Number.isNaN(numberValue) ? 0 : numberValue
      } else {
        normalizedRow[header] = String(raw ?? "").trim()
      }
    })

    parsedRows.push(normalizedRow)
  })

  if (parsedRows.length === 0) {
    return {
      ok: false,
      summary: "No data rows found in the uploaded file.",
      items: [{ row: 2, message: "No data rows found in the uploaded file.", status: "error" }],
    }
  }

  if (errors.length > 0) {
    return {
      ok: false,
      summary: `Validation failed: ${errors.length} error${errors.length === 1 ? "" : "s"}.`,
      items: errors,
    }
  }

  return {
    ok: true,
    summary: `${parsedRows.length} rows validated successfully.`,
    items: [],
    rows: parsedRows,
  }
}

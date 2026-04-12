import * as XLSX from "xlsx"

type ParsedSheet = {
  headers: string[]
  rows: unknown[][]
}

function isRowEmpty(row: unknown[]) {
  return row.every((cell) => String(cell ?? "").trim() === "")
}

function normalizeRowLength(row: unknown[], length: number) {
  if (row.length >= length) return row
  const padded = [...row]
  for (let i = row.length; i < length; i += 1) {
    padded.push("")
  }
  return padded
}

function findHeaderRowIndex(raw: unknown[][]) {
  for (let i = 0; i < raw.length; i += 1) {
    if (!isRowEmpty(raw[i])) {
      return i
    }
  }
  return -1
}

export async function parseExcel(file: File): Promise<ParsedSheet> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array" })
  const sheetName = workbook.SheetNames[0]

  if (!sheetName) {
    return { headers: [], rows: [] }
  }

  const sheet = workbook.Sheets[sheetName]
  const raw = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  }) as unknown[][]

  if (!raw.length) {
    return { headers: [], rows: [] }
  }

  const headerRowIndex = findHeaderRowIndex(raw)
  if (headerRowIndex === -1) {
    return { headers: [], rows: [] }
  }

  const headers = raw[headerRowIndex].map((value) => String(value ?? "").trim())
  const dataRows = raw.slice(headerRowIndex + 1)

  const rows = dataRows
    .map((row) => normalizeRowLength(row, headers.length))
    .filter((row) => !isRowEmpty(row))

  return { headers, rows }
}

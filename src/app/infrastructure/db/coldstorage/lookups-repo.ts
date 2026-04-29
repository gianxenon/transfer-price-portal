import "server-only"
import { getPool } from "@/src/app/infrastructure/db"
import sql from "mssql"
export type LookupOption = {
  code: string
  name: string
}

function cleanString(value: unknown) {
  return String(value ?? "").trim()
}

function cleanOptions(rows: Record<string, unknown>[]): LookupOption[] {
  return rows
    .map((row) => ({
      code: cleanString(row.code),
      name: cleanString(row.name || row.code),
    }))
    .filter((item) => item.code)
}

// function cleanValues(rows: Record<string, unknown>[]): string[] {
//   return rows
//     .map((row) => cleanString(row.value))
//     .filter(Boolean)
// }

export async function getSeriesNames(
  { q = "" }: { q?: string } = {}
): Promise<LookupOption[]> {
  const pool = await getPool()
  const search = `%${q.trim()}%`
  const result = await pool
  .request()
  .input("q", sql.NVarChar, search)
  .query(" SELECT SeriesCode AS code,  SeriesName AS name FROM ics_series  WHERE SeriesCode IS NOT NULL AND SeriesName LIKE @q  ORDER BY SeriesCode ")

  return cleanOptions(result.recordset)
}

export async function getCustomers(
  { q = "" }: { q?: string } = {}
): Promise<LookupOption[]> {
  const pool = await getPool()
  const search = `%${q.trim()}%`

  const result = await pool
    .request()
    .input("q", sql.NVarChar, search)
    .query(" SELECT TOP 10 CustomersId AS code, CustomersName AS name FROM Customers WHERE CustomersId IS NOT NULL AND isActive = 1 AND CustomersName LIKE @q ORDER BY CustomersId ") 
  return cleanOptions(result.recordset)
}

// export async function getRoomTypes(): Promise<string[]> {
//   const pool = await getPool()
//   const result = await pool.request().query(`
//     SELECT DISTINCT
//       RoomType AS value
//     FROM your_room_type_table
//     WHERE RoomType IS NOT NULL
//     ORDER BY RoomType
//   `)

//   return cleanValues(result.recordset)
// }

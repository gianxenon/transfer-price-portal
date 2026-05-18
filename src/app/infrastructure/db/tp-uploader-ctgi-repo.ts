import "server-only"

import { getPool } from "@/src/app/infrastructure/db"
import { getMysqlPool } from "@/src/app/infrastructure/db/mysql"

const LOOKUP_CHUNK_SIZE = 500

function chunkValues<T>(values: T[], size: number) {
  const chunks: T[][] = []

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }

  return chunks
}

function normalizeString(value: unknown) {
  return String(value ?? "").trim()
}

function escapeSqlUnicodeString(value: string) {
  return `N'${value.replace(/'/g, "''")}'`
}

export async function findValidCtgiRawMatIds(skus: string[]): Promise<Set<string>> {
  const normalizedSkus = [...new Set(skus.map(normalizeString).filter(Boolean))]
  const validSkus = new Set<string>()

  if (!normalizedSkus.length) {
    return validSkus
  }

  const pool = await getPool()

  for (const skuChunk of chunkValues(normalizedSkus, LOOKUP_CHUNK_SIZE)) {
    const skuLiterals = skuChunk.map(escapeSqlUnicodeString).join(", ")
    const result = await pool.request().query(
      `SELECT CTGIRawMatId
       FROM CTGIRawMats
       WHERE CTGIRawMatId IN (${skuLiterals})`
    )

    for (const row of result.recordset) {
      const sku = normalizeString(row.CTGIRawMatId)
      if (sku) {
        validSkus.add(sku)
      }
    }
  }

  return validSkus
}

export async function findBosPlantCodeByBusinessCenterUnitId(
  businessCenterUnitIds: number[]
): Promise<Map<number, string>> {
  const normalizedIds = [
    ...new Set(
      businessCenterUnitIds.filter(
        (value) => Number.isInteger(value) && value > 0
      )
    ),
  ]
  const plantCodeByBusinessCenterUnitId = new Map<number, string>()

  if (!normalizedIds.length) {
    return plantCodeByBusinessCenterUnitId
  }

  const pool = await getPool()

  for (const idChunk of chunkValues(normalizedIds, LOOKUP_CHUNK_SIZE)) {
    const idLiterals = idChunk.join(", ")
    const result = await pool.request().query(
      `SELECT
         bc.BusinessCenterUnitId AS businessCenterUnitId,
         p.BOS_PlantCode AS bosPlantCode
        FROM Plant AS p
        INNER JOIN Customers AS c ON p.CustomersId = c.CustomersId
        INNER JOIN BusinessCenterUnit AS bc ON p.BusinessCenterUnitId = bc.BusinessCenterUnitId
        INNER JOIN CustomersType AS ct ON c.CustomersTypeId = ct.CustomersTypeId
        WHERE ct.CustomersTypeName = 'Dressing Plant'
          AND bc.BusinessCenterUnitId IN (${idLiterals})
          AND p.BOS_PlantCode IS NOT NULL
          AND LTRIM(RTRIM(p.BOS_PlantCode)) <> ''
        ORDER BY bc.BusinessCenterUnitId, p.PlantId`
    )

    for (const row of result.recordset) {
      const businessCenterUnitId = Number(row.businessCenterUnitId)
      const bosPlantCode = normalizeString(row.bosPlantCode)

      if (
        Number.isInteger(businessCenterUnitId) &&
        businessCenterUnitId > 0 &&
        bosPlantCode &&
        !plantCodeByBusinessCenterUnitId.has(businessCenterUnitId)
      ) {
        plantCodeByBusinessCenterUnitId.set(businessCenterUnitId, bosPlantCode)
      }
    }
  }

  return plantCodeByBusinessCenterUnitId
}

export async function findWarehouseByBosPlantCode(
  bosPlantCodes: string[]
): Promise<Map<string, string>> {
  const normalizedPlantCodes = [
    ...new Set(bosPlantCodes.map(normalizeString).filter(Boolean)),
  ]
  const warehouseByBosPlantCode = new Map<string, string>()

  if (!normalizedPlantCodes.length) {
    return warehouseByBosPlantCode
  }

  const pool = await getMysqlPool("ebtctgi")

  for (const plantCodeChunk of chunkValues(normalizedPlantCodes, LOOKUP_CHUNK_SIZE)) {
    const placeholders = plantCodeChunk.map(() => "?").join(", ")
    const [rows] = await pool.query(
      `SELECT warehouse, U_WMSID
       FROM warehouses
       WHERE U_WMSID IN (${placeholders})`,
      plantCodeChunk
    )

    for (const row of rows as Array<Record<string, unknown>>) {
      const bosPlantCode = normalizeString(row.U_WMSID)
      const warehouse = normalizeString(row.warehouse)

      if (bosPlantCode && warehouse) {
        warehouseByBosPlantCode.set(bosPlantCode, warehouse)
      }
    }
  }

  return warehouseByBosPlantCode
}

import "server-only"

import sql from "mssql"
import { getPool } from "@/src/app/infrastructure/db"

type TpUploaderRow = Record<string, string | number>

type UpsertTpRowsInput = {
  rows: TpUploaderRow[]
  customersMotherCompanyId: number
  effectivityDate: string
  emailList: string
  filename: string
  createdBy: string
}

const RECEIPT_TYPE_ID = 10
const APPROVAL_STATUS = 1

const BUSINESS_CENTER_UNIT_BY_HEADER: Record<string, number> = { 
  "NCR": 18,
  "UPPER LUZON": 23,
  "CENTRAL LUZON": 24,
  "BC BicoL": 2,
  "BC Stag": 1,
  "BC Ilocos": 3,
  "BC Isabela": 4,
  "BC Calbayog": 12,
  "BC Ormoc": 11,
  "BC Tacloban": 10,
  "BC Iloilo": 8,
  "BC Roxas": 9,
  "BC Bacolod": 6,
  "BC Dumaguete": 7,
  "BC Cebu": 5,
  "BC CDO": 17,
  "BC Davao": 14,
  "BC Gensan": 13,
  "BC Zamboanga": 15,
  "BC Ozamiz": 16,
  "BC Butuan": 20,
}

const BUSINESS_CENTER_HEADERS = Object.keys(BUSINESS_CENTER_UNIT_BY_HEADER)

function parseNumber(value: unknown) {
  if (typeof value === "number") return value
  const cleaned = String(value ?? "").replace(/,/g, "").trim()
  if (!cleaned) return NaN
  return Number(cleaned)
}

export async function upsertTpRows(input: UpsertTpRowsInput): Promise<void> {
  if (!input.rows.length) return
  if (!BUSINESS_CENTER_HEADERS.length) {
    throw new Error(
      "Business center mapping is not configured. Fill BUSINESS_CENTER_UNIT_BY_HEADER in tp-uploader-repo.ts."
    )
  }

  const effectivityDate = new Date(input.effectivityDate)

  const pool = await getPool()
  const transaction = new sql.Transaction(pool)
  await transaction.begin()

  try {
    await transaction
      .request()
      .input("companyId", sql.Int, input.customersMotherCompanyId)
      .input("effectivityDate", sql.Date, effectivityDate)
      .input("receiptTypeId", sql.Int, RECEIPT_TYPE_ID)
      .query(
        `DELETE FROM uploaded_transfer_price
         WHERE customersMotherCompanyId = @companyId
           AND effectivity_date = @effectivityDate
           AND receiptTypeId = @receiptTypeId`
      )

    for (const row of input.rows) {
      const productId = String(row["ProductsId"] ?? "").trim()
      const uom = String(row["SALES UOM"] ?? "").trim()

      for (const header of BUSINESS_CENTER_HEADERS) {
        const businessCenterUnitId = BUSINESS_CENTER_UNIT_BY_HEADER[header]
        const priceValue = parseNumber(row[header])

        if (Number.isNaN(priceValue)) {
          continue
        }

        await transaction
          .request()
          .input("businessCenterUnitId", sql.Int, businessCenterUnitId)
          .input("customersMotherCompanyId", sql.Int, input.customersMotherCompanyId)
          .input("products_id", sql.NVarChar(15), productId)
          .input("uom", sql.NVarChar(15), uom)
          .input("price", sql.Float, priceValue)
          .input("effectivity_date", sql.Date, effectivityDate)
          .input("created_by", sql.NVarChar(50), input.createdBy)
          .input("emailList", sql.Text, input.emailList)
          .input("filename", sql.NVarChar(255), input.filename)
          .input("receiptTypeId", sql.Int, RECEIPT_TYPE_ID)
          .input("approve_by", sql.NVarChar(50), input.createdBy)
          .input("approval", sql.Int, APPROVAL_STATUS)
          .query(
            `INSERT INTO uploaded_transfer_price (
               businessCenterUnitId,
               customersMotherCompanyId,
               products_id,
               uom,
               price,
               afno,
               effectivity_date,
               created_by,
               created_at,
               batchno,
               receiptTypeId,
               remarks,
               emailList,
               filename,
               approve_by,
               approve_at,
               approval,
               approve_remarks
             ) VALUES (
               @businessCenterUnitId,
               @customersMotherCompanyId,
               @products_id,
               @uom,
               @price,
               NULL,
               @effectivity_date,
               @created_by,
               GETUTCDATE(),
               NULL,
               @receiptTypeId,
               NULL,
               @emailList,
               @filename,
               @approve_by,
               GETUTCDATE(),
               @approval,
               NULL
             )`
          )
      }
    }

    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

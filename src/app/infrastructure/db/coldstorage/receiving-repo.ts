import "server-only"
import sql from "mssql"
import { getPool } from "@/src/app/infrastructure/db"

type RawReceivingItem = Record<string, unknown>

type ParsedQrCode = {
  barcodeId: string
  productsId: string
  heads: number
  pack: number
  netWeight: number
  productionDate: Date
}

export type SaveReceivingInput = {
  items: unknown[]
  username: string
  fullName: string
}

export class ReceivingValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ReceivingValidationError"
  }
}

function cleanString(value: unknown) {
  return String(value ?? "").trim()
}

function asReceivingItem(value: unknown): RawReceivingItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ReceivingValidationError("Invalid receiving item payload.")
  }
  return value as RawReceivingItem
}

function requiredString(item: RawReceivingItem, key: string, label: string) {
  const value = cleanString(item[key])
  if (!value) {
    throw new ReceivingValidationError(`${label} is required.`)
  }
  return value
}

function parseNumber(value: string, label: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw new ReceivingValidationError(`${label} is invalid.`)
  }
  return parsed
}

function parseInteger(value: string, label: string) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed)) {
    throw new ReceivingValidationError(`${label} is invalid.`)
  }
  return parsed
}

function parseUsDate(value: string, label: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) {
    throw new ReceivingValidationError(`${label} is invalid.`)
  }

  const month = Number(match[1])
  const day = Number(match[2])
  const year = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new ReceivingValidationError(`${label} is invalid.`)
  }

  return date
}

function parseQrCode(qrCode: string): ParsedQrCode {
  const rawParts = qrCode.split("|")
  const parts = rawParts.at(-1)?.trim() === "" ? rawParts.slice(0, -1) : rawParts
  const normalized = parts.map((part) => part.trim())

  if (normalized.length !== 10 || normalized.some((part) => !part)) {
    throw new ReceivingValidationError(
      "Invalid QR format. Please scan a valid receiving QR code."
    )
  }

  const barcodeId = normalized[0]
  const productsId = normalized[1]

  if (barcodeId.length > 12) {
    throw new ReceivingValidationError(`Barcode ${barcodeId} is too long.`)
  }

  if (productsId.length > 15) {
    throw new ReceivingValidationError(`Product ${productsId} is too long.`)
  }

  return {
    barcodeId,
    productsId,
    heads: parseInteger(normalized[2], "Heads"),
    pack: parseInteger(normalized[4], "Pack"),
    netWeight: parseNumber(normalized[3], "Net weight"),
    productionDate: parseUsDate(normalized[9], "Production date"),
  }
}

function buildRemarks(item: RawReceivingItem) {
  const parts = [
    "Mobile Receiving",
    cleanString(item.seriesname),
    cleanString(item.receivecategory),
    cleanString(item.roomtype),
    cleanString(item.palletAddress),
    cleanString(item.batch),
  ].filter(Boolean)

  return parts.join(" | ").slice(0, 255)
}

async function resolveLegacyUserId(input: {
  username: string
  fullName: string
}) {
  const pool = await getPool()
  const result = await pool
    .request()
    .input("username", sql.VarChar(225), input.username) 
    .query("SELECT DISTINCT TOP 1 Userid FROM tpp_users WHERE isActive = 1 AND  UserName = @username ORDER BY Userid")

  const legacyUserId = Number(result.recordset?.[0]?.Userid)
  if (Number.isInteger(legacyUserId) && legacyUserId > 0) {
    return legacyUserId
  }

  throw new ReceivingValidationError(
    "Mobile user is not mapped to an active inventory user."
  )
}

async function ensureBarcodeNotReceived(
  transaction: sql.Transaction,
  barcodeId: string
) {
  const existing = await new sql.Request(transaction)
    .input("barcodeId", sql.VarChar(12), barcodeId)
    .query("SELECT TOP 1 b.BarCode FROM ics_receivings a inner join ics_receivingitems b on b.TransactionId = a.TransactionId WHERE a.Status = 'DRAFT' and  BarCode = @barcodeId")

  if (existing.recordset.length > 0) {
    throw new ReceivingValidationError(`Barcode ${barcodeId} is already received.`)
  }
}

export async function saveReceiving(input: SaveReceivingInput) {
  if (!input.items.length) {
    throw new ReceivingValidationError("No receiving items to submit.")
  }

  const normalizedItems = input.items.map(asReceivingItem)
  const firstItem = normalizedItems[0]
  const remarks = buildRemarks(firstItem)
  const createdBy = await resolveLegacyUserId(input)
  const pool = await getPool()
  const transaction = new sql.Transaction(pool)

  await transaction.begin()

  try {
    const header = await new sql.Request(transaction)
      .input("createdBy", sql.Int, createdBy)
      .input("remarks", sql.VarChar(255), remarks)
      .query("INSERT INTO ics_receivings (Receiving_no ,CustomersId ,Reference_no ,Room_type ,Receive_category ,Receiving_date ,Status ,Remarks ,CreatedBy ,CreatedAt ,UpdatedAt ,UpdatedBy ,PutAwayBy ,IsPutAway ,PutAwayAt) OUTPUT INSERTED.TransactionId AS inventoryReceivingId  VALUES (1 ,'TEST1' ,'TEST1' ,'TEST1' ,'TEST1' ,'2026-04-19' ,'TEST1' ,'TEST1' ,'TEST1' ,'2026/04/19' ,'2026/04/19' ,'TEST1' ,'TEST1' ,1 ,'2026/04/19')")

    const inventoryReceivingId = Number(
      header.recordset?.[0]?.inventoryReceivingId
    )

    if (!Number.isInteger(inventoryReceivingId) || inventoryReceivingId <= 0) {
      throw new Error("Unable to create receiving header.")
    }

    const seen = new Set<string>()
    for (const [index, item] of normalizedItems.entries()) {
      requiredString(item, "seriesname", "Series name")
      requiredString(item, "custno", "Customer number")
      requiredString(item, "roomtype", "Room type")
      requiredString(item, "receivecategory", "Receiving category")
      requiredString(item, "palletAddress", "Pallet address")
      requiredString(item, "batch", "Batch")

      const qrCode = requiredString(item, "qrcode", "QR code")
      const qr = parseQrCode(qrCode)

      if (seen.has(qr.barcodeId)) {
        throw new ReceivingValidationError(
          `Barcode ${qr.barcodeId} is duplicated in this submit.`
        )
      }
      seen.add(qr.barcodeId)

      await ensureBarcodeNotReceived(transaction, qr.barcodeId)

      await new sql.Request(transaction)
        .input("inventoryReceivingId", sql.Int, inventoryReceivingId)
        .input("barcodeId", sql.VarChar(12), qr.barcodeId)
        .input("productsId", sql.VarChar(15), qr.productsId)
        .input("productionDate", sql.Date, qr.productionDate)
        .input("barcodeCreatedBy", sql.Int, createdBy)
        .input(
          "barcodeCreatedStamp",
          sql.DateTime,
          new Date("1990-01-01T00:00:00.000Z")
        )
        .input("heads", sql.Int, qr.heads)
        .input("pack", sql.Int, qr.pack)
        .input("netWeight", sql.Money, qr.netWeight)
        .input("createdBy", sql.Int, createdBy)
        .input("createdStampOffsetMs", sql.Int, index)
        .input("computerName", sql.VarChar(100), "MOBILE-SCANNER")
        .query(`
          INSERT INTO InventoryReceivingDetail
            (
              InventoryReceivingId,
              BarCodeId,
              ProductsId,
              ProductionDate,
              BarcodeCreatedBy,
              BarcodeCreatedStamp,
              Heads,
              Pack,
              NetWeight,
              CreatedBy,
              CreatedStamp,
              ComputerName,
              isPostedToWMS
            )
          VALUES
            (
              @inventoryReceivingId,
              @barcodeId,
              @productsId,
              @productionDate,
              @barcodeCreatedBy,
              @barcodeCreatedStamp,
              @heads,
              @pack,
              @netWeight,
              @createdBy,
              DATEADD(millisecond, @createdStampOffsetMs, GETDATE()),
              @computerName,
              0
            )
        `)
    }

    await transaction.commit()

    return {
      inventoryReceivingId,
      count: normalizedItems.length,
    }
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

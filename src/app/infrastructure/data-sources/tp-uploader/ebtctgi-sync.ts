import "server-only"

import {
  BUSINESS_CENTER_HEADERS,
  BUSINESS_CENTER_UNIT_BY_HEADER,
} from "@/src/app/infrastructure/db/tp-uploader-repo"
import {
  findBosPlantCodeByBusinessCenterUnitId,
  findValidCtgiRawMatIds,
  findWarehouseByBosPlantCode,
} from "@/src/app/infrastructure/db/tp-uploader-ctgi-repo"
import type { TpUploadCtgiEmailRow } from "@/src/app/infrastructure/tp-uploader/email-summary"

type TpUploaderRow = Record<string, string | number>

export type SyncTpUploadToEbtCtgiApiInput = {
  rows: TpUploaderRow[]
  effectivityDate: string
  filename: string
  createdBy: string
}

export type SyncTpUploadToEbtCtgiApiResult = {
  candidates: number
  sent: number
  emailRowsByBusinessCenter: Partial<Record<string, TpUploadCtgiEmailRow[]>>
  skippedInvalidSku: number
  skippedMissingPlantCode: number
  skippedMissingWarehouse: number
  warnings: string[]
  apiResponse?: unknown
}

type CtgiUploadCandidate = {
  sku: string
  productName: string
  price: number
  uom: string
  businessCenter: string
  businessCenterUnitId: number
}

type CtgiTransferPricePayload = {
  u_effectivitydate: string
  u_remarks: string
  u_referencekey: string
  u_whscode: string
  u_itemcode: string
  u_price: number
  createdby: string
}

const EBT_CTGI_TRANSFER_PRICE_API_URL = 
  "http://localhost:81/ctgi/udp.php?objectcode=dtwCTGITransferPrice"

function parseNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : NaN
  }

  const cleaned = String(value ?? "").replace(/,/g, "").trim()
  if (!cleaned) return NaN

  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : NaN
}

function normalizeString(value: unknown) {
  return String(value ?? "").trim()
}

function buildCtgiCandidates(rows: TpUploaderRow[]): CtgiUploadCandidate[] {
  const candidates: CtgiUploadCandidate[] = []

  for (const row of rows) {
    const sku = normalizeString(row["ProductsId"])
    const productName = normalizeString(row["ProductsName"])
    const uom = normalizeString(row["SALES UOM"])
    if (!sku) {
      continue
    }

    for (const businessCenter of BUSINESS_CENTER_HEADERS) {
      const businessCenterUnitId =
        BUSINESS_CENTER_UNIT_BY_HEADER[businessCenter]
      const price = parseNumber(row[businessCenter])

      if (!Number.isFinite(price) || price <= 0) {
        continue
      }

      candidates.push({
        sku,
        productName,
        price,
        uom,
        businessCenter,
        businessCenterUnitId,
      })
    }
  }

  return candidates
}

function readApiErrorMessage(
  payload: unknown,
  fallback: string
) {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim()
  }

  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string" &&
    payload.message.trim()
  ) {
    return payload.message.trim()
  }

  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string" &&
    payload.error.trim()
  ) {
    return payload.error.trim()
  }

  return fallback
}

function hasExplicitApiFailure(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return false
  }

  if ("ok" in payload && payload.ok === false) {
    return true
  }

  if ("success" in payload && payload.success === false) {
    return true
  }

  if ("status" in payload && typeof payload.status === "string") {
    return payload.status.toLowerCase() === "error"
  }

  return false
}

async function postCtgiTransferPricePayload(
  payload: CtgiTransferPricePayload[]
) {
  const response = await fetch(EBT_CTGI_TRANSFER_PRICE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  const responseText = await response.text()
  let responsePayload: unknown = responseText

  try {
    responsePayload = responseText ? JSON.parse(responseText) : null
  } catch {
    responsePayload = responseText
  }

  console.log("[EBT-CTGI response]", {
    status: response.status,
    ok: response.ok,
    payload: responsePayload,
  })

  if (!response.ok || hasExplicitApiFailure(responsePayload)) {
    const fallbackMessage = response.ok
      ? "EBT-CTGI API reported an error."
      : `EBT-CTGI API request failed with status ${response.status}.`

    throw new Error(readApiErrorMessage(responsePayload, fallbackMessage))
  }

  return responsePayload
}

export async function syncTpUploadToEbtCtgiApi(
  input: SyncTpUploadToEbtCtgiApiInput
): Promise<SyncTpUploadToEbtCtgiApiResult> {
  const candidates = buildCtgiCandidates(input.rows)
  const emailRowsByBusinessCenter: Partial<Record<string, TpUploadCtgiEmailRow[]>> = {}
  const warnings: string[] = []

  if (!candidates.length) {
    return {
      candidates: 0,
      sent: 0,
      emailRowsByBusinessCenter,
      skippedInvalidSku: 0,
      skippedMissingPlantCode: 0,
      skippedMissingWarehouse: 0,
      warnings,
    }
  }

  const validCtgiRawMatIds = await findValidCtgiRawMatIds(
    candidates.map((candidate) => candidate.sku)
  )

  const validCandidates = candidates.filter((candidate) =>
    validCtgiRawMatIds.has(candidate.sku)
  )

  const plantCodeByBusinessCenterUnitId =
    await findBosPlantCodeByBusinessCenterUnitId(
      validCandidates.map((candidate) => candidate.businessCenterUnitId)
    )

  const warehouseByBosPlantCode = await findWarehouseByBosPlantCode(
    validCandidates
      .map((candidate) =>
        plantCodeByBusinessCenterUnitId.get(candidate.businessCenterUnitId) || ""
      )
      .filter(Boolean)
  )

  let skippedMissingPlantCode = 0
  let skippedMissingWarehouse = 0
  const readyEntries: Array<{
    candidate: CtgiUploadCandidate
    warehouse: string
    payload: CtgiTransferPricePayload
  }> = []

  for (const candidate of validCandidates) {
    const bosPlantCode = plantCodeByBusinessCenterUnitId.get(
      candidate.businessCenterUnitId
    )

    if (!bosPlantCode) {
      skippedMissingPlantCode += 1
      continue
    }

    const warehouse = warehouseByBosPlantCode.get(bosPlantCode)
    if (!warehouse) {
      skippedMissingWarehouse += 1
      continue
    }

    readyEntries.push({
      candidate,
      warehouse,
      payload: {
        u_effectivitydate: input.effectivityDate.trim(),
        u_remarks: "BOS-CTGI",
        u_referencekey: "",
        u_whscode: warehouse,
        u_itemcode: candidate.sku,
        u_price: candidate.price,
        createdby: input.createdBy,
      },
    })
  }

  if (!readyEntries.length) {
    return {
      candidates: candidates.length,
      sent: 0,
      emailRowsByBusinessCenter,
      skippedInvalidSku: candidates.length - validCandidates.length,
      skippedMissingPlantCode,
      skippedMissingWarehouse,
      warnings,
      apiResponse: null,
    }
  }

  const payload = readyEntries.map((entry) => entry.payload)
  console.log("[EBT-CTGI payload batch]", JSON.stringify(payload, null, 2))

  let apiResponse: unknown
  try {
    apiResponse = await postCtgiTransferPricePayload(payload)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown EBT-CTGI API error."
    warnings.push(`Failed to sync EBT-CTGI batch: ${message}`)

    return {
      candidates: candidates.length,
      sent: 0,
      emailRowsByBusinessCenter,
      skippedInvalidSku: candidates.length - validCandidates.length,
      skippedMissingPlantCode,
      skippedMissingWarehouse,
      warnings,
      apiResponse: null,
    }
  }

  for (const entry of readyEntries) {
    const businessCenterRows =
      emailRowsByBusinessCenter[entry.candidate.businessCenter] || []

    businessCenterRows.push({
      productId: entry.candidate.sku,
      productName: entry.candidate.productName,
      uom: entry.candidate.uom,
      warehouse: entry.warehouse,
      businessCenter: entry.candidate.businessCenter,
      price: entry.candidate.price,
      remarks: "",
    })

    emailRowsByBusinessCenter[entry.candidate.businessCenter] = businessCenterRows
  }

  return {
    candidates: candidates.length,
    sent: readyEntries.length,
    emailRowsByBusinessCenter,
    skippedInvalidSku: candidates.length - validCandidates.length,
    skippedMissingPlantCode,
    skippedMissingWarehouse,
    warnings,
    apiResponse,
  }
}

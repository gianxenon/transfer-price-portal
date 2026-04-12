type UploadApiOk = {
  ok: true
  summary?: string
  items?: Array<{ row: number; message: string; status?: "error" | "warning" | "ok" }>
}

type UploadApiErr = {
  ok?: false
  message?: string
  summary?: string
  items?: Array<{ row: number; message: string; status?: "error" | "warning" | "ok" }>
}

type UploadApiResponse = UploadApiOk | UploadApiErr

export type UploadResult = {
  ok: boolean
  summary?: string
  message?: string
  items?: Array<{ row: number; message: string; status?: "error" | "warning" | "ok" }>
}

export async function uploadTransferPriceFile(formData: FormData): Promise<UploadResult> {
  try {
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return { ok: false, message: "File is required.", items: [] }
    }

    const isXlsx =
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.name.toLowerCase().endsWith(".xlsx")

    if (!isXlsx) {
      return { ok: false, message: "Only .xlsx files are allowed.", items: [] }
    }

    const res = await fetch("/api/tp-uploader", {
      method: "POST",
      body: formData,
    })

    const text = await res.text()
    let payload: UploadApiResponse = {}
    try {
      payload = text ? (JSON.parse(text) as UploadApiResponse) : {}
    } catch {
      payload = { message: "Unexpected upload response." }
    }

    if (!res.ok) {
      const message =
        "summary" in payload
          ? payload.summary
          : "message" in payload
          ? payload.message
          : "Upload failed"
      return {
        ok: false,
        message: message || "Upload failed",
        items: "items" in payload ? payload.items : [],
      }
    }

    return {
      ok: true,
      summary: "summary" in payload ? payload.summary : "Upload successful.",
      items: "items" in payload ? payload.items : [],
    }
  } catch {
    return {
      ok: false,
      message: "Cannot reach upload service. Please try again.",
      items: [],
    }
  }
}

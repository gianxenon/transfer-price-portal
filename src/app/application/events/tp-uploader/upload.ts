export type TpUploaderResultItem = {
  row: number
  message: string
  status?: "error" | "warning" | "ok"
}

export type TpUploaderField =
  | "effectivityDate"
  | "companyId"
  | "emails"
  | "file"

export type TpUploaderEvent =
  | { type: "EFFECTIVITY_CHANGED"; value: string }
  | { type: "COMPANY_CHANGED"; value: string }
  | { type: "FILE_CHANGED"; file: File | null }
  | { type: "FIELD_ERROR_SET"; field: TpUploaderField; message: string }
  | { type: "FIELD_ERROR_CLEARED"; field: TpUploaderField }
  | { type: "FILE_INPUT_RESET" }
  | { type: "UPLOAD_STARTED" }
  | { type: "UPLOAD_SUCCEEDED"; summary: string; items?: TpUploaderResultItem[] }
  | { type: "UPLOAD_FAILED"; summary: string; items?: TpUploaderResultItem[] }
  | { type: "UPLOAD_FINISHED" }
  | { type: "RESULT_CLEARED" }

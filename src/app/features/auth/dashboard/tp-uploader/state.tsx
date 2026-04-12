import {
  TpUploaderEvent,
  TpUploaderField,
  TpUploaderResultItem,
} from "@/src/app/application/events/tp-uploader/upload"

export type TpUploaderResult = {
  status: "success" | "error"
  summary: string
  items: TpUploaderResultItem[]
}

export type TpUploaderFieldErrors = Partial<Record<TpUploaderField, string>>

export type TpUploaderState = {
  effectivityDate: string
  companyId: string
  file: File | null
  uploading: boolean
  result: TpUploaderResult | null
  fieldErrors: TpUploaderFieldErrors
  fileInputKey: number
}

export const initialTpUploaderState: TpUploaderState = {
  effectivityDate: "",
  companyId: "",
  file: null,
  uploading: false,
  result: null,
  fieldErrors: {},
  fileInputKey: 0,
}

export function tpUploaderReducer(state: TpUploaderState, event: TpUploaderEvent): TpUploaderState {
  switch (event.type) {
    case "EFFECTIVITY_CHANGED":
      return {
        ...state,
        effectivityDate: event.value,
      }
    case "COMPANY_CHANGED":
      return {
        ...state,
        companyId: event.value,
      }
    case "FILE_CHANGED":
      return {
        ...state,
        file: event.file,
      }
    case "FIELD_ERROR_SET":
      return {
        ...state,
        fieldErrors: {
          ...state.fieldErrors,
          [event.field]: event.message,
        },
      }
    case "FIELD_ERROR_CLEARED": {
      const { [event.field]: _, ...rest } = state.fieldErrors
      return {
        ...state,
        fieldErrors: rest,
      }
    }
    case "FILE_INPUT_RESET":
      return {
        ...state,
        file: null,
        fileInputKey: state.fileInputKey + 1,
      }
    case "UPLOAD_STARTED":
      return {
        ...state,
        uploading: true,
        result: null,
      }
    case "UPLOAD_SUCCEEDED":
      return {
        ...state,
        result: {
          status: "success",
          summary: event.summary,
          items: event.items ?? [],
        },
      }
    case "UPLOAD_FAILED":
      return {
        ...state,
        result: {
          status: "error",
          summary: event.summary,
          items: event.items ?? [],
        },
      }
    case "UPLOAD_FINISHED":
      return {
        ...state,
        uploading: false,
      }
    case "RESULT_CLEARED":
      return {
        ...state,
        result: null,
      }
    default:
      return state
  }
}

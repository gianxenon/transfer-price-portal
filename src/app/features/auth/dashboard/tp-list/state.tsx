

export type TpListState = {
  effectivityDate: string
  companyId: number
  fieldErrors: TpListFieldErrors
}
export type TpListFieldErrors = {
  effectivityDate?: string
  companyId?: string
}

export const initialTpListState: TpListState = { 
  effectivityDate: new Date().toISOString().split("T")[0],
  companyId: 214,
  fieldErrors: {},
}


export function tpListReducer(state: TpListState, event: TpListEvent): TpListState {
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
    case "FIELD_ERROR_SET":
        return {
            ...state,
            fieldErrors: {
                ...state.fieldErrors,
                [event.field]: event.message,
            },
        }   
    case "FIELD_ERROR_CLEARED": {
        const rest = { ...state.fieldErrors }
        delete rest[event.field as keyof TpListFieldErrors]
        return {
            ...state,   
            fieldErrors: rest,
        }
    }
    default:
        return state
    }
}

export type TpListEvent =
  | { type: "EFFECTIVITY_CHANGED"; value: string }
  | { type: "COMPANY_CHANGED"; value: number }
  | { type: "FIELD_ERROR_SET"; field: keyof TpListFieldErrors; message: string }
  | { type: "FIELD_ERROR_CLEARED"; field: keyof TpListFieldErrors } 

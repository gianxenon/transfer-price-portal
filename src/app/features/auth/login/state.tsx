import { LoginEvent } from "@/src/app/application/events/auth/login"

 
// UI state for the login screen.
export type LoginState = {
  username: string
  password: string
  loading: boolean
  checkingSession: boolean
  error: string | null
}

export const initialLoginState: LoginState = {
  username: "",
  password: "",
  loading: false,
  checkingSession: true,
  error: null,
}

export function loginReducer(state: LoginState, event: LoginEvent): LoginState {
  switch (event.type) {
    case "USERID_CHANGED":
      return {
        ...state,
        username: event.value,
      }
    case "PASSWORD_CHANGED":
      return {
        ...state,
        password: event.value,
      }
    case "SESSION_CHECK_STARTED":
      return {
        ...state,
        checkingSession: true,
      }
    case "SESSION_CHECK_FINISHED":
      return {
        ...state,
        checkingSession: false,
      }
    case "LOGIN_STARTED":
      return {
        ...state,
        loading: true,
        error: null,
      }
    case "LOGIN_FAILED":
      return {
        ...state,
        error: event.message,
      }
    case "LOGIN_FINISHED":
      return {
        ...state,
        loading: false,
      }
    default:
      return state
  }
}

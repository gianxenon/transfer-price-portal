export type LoginEvent =
  | { type: "USERID_CHANGED"; value: string }
  | { type: "PASSWORD_CHANGED"; value: string }
  | { type: "SESSION_CHECK_STARTED" }
  | { type: "SESSION_CHECK_FINISHED" }
  | { type: "LOGIN_STARTED" }
  | { type: "LOGIN_FAILED"; message: string }
  | { type: "LOGIN_FINISHED" }

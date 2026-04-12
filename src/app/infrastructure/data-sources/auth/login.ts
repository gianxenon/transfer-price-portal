
type SessionPayload = {
  authenticated?: boolean
}

type LoginApiOk = {
  ok: true
}

type LoginApiErr = {
  message?: string
}

type LoginApiResponse = LoginApiOk | LoginApiErr

export type LoginResult = {
  ok: boolean
  message?: string
}

export async function checkSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" })
    if (!res.ok) return false

    const payload = (await res.json()) as SessionPayload
    return Boolean(payload.authenticated)
  } catch {
    return false
  }
}

export async function loginWithCredentials(username: string, password: string): Promise<LoginResult> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })

    const text = await res.text()
    let payload: LoginApiResponse = { message: "" }
    try {
      payload = text ? (JSON.parse(text) as LoginApiResponse) : { message: "" }
    } catch {
      payload = { message: "Unexpected login response." }
    }

    if (!res.ok) {
      const message = "message" in payload ? payload.message : "Login failed"
      return { ok: false, message: message || "Login failed" }
    }

    return { ok: true }
  } catch {
    return { ok: false, message: "Cannot reach authentication service. Please try again." }
  }
}
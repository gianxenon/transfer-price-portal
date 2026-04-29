import "server-only"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import type { DbUser } from "@/src/app/infrastructure/db/auth-repo"
import {
  findUserById,
  getSessionById,
  revokeSession,
} from "@/src/app/infrastructure/db/auth-repo"
 
export function toMobileUser(user: DbUser) { 
  const username = user.UserName ?? ""
  const name = user.UsersFullName?.trim() || username
  const isActive = Boolean(user.isActive)

  return { 
    username,
    UserName: username,
    name,
    UsersFullName: name,
    email: "",
    groupid: "",
    roleid: "",
    isValid: isActive ? "1" : "0",
    isActive,
    lockout: "0",
    mobileNo: "",
    avatar: "",
  }
}

export function getBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") ?? ""
  const [scheme, token] = authHeader.split(" ")

  if (scheme?.toLowerCase() !== "bearer" || !token?.trim()) {
    return null
  }

  return token.trim()
}

export async function getRequestSessionToken(req: Request) {
  const bearerToken = getBearerToken(req)
  if (bearerToken) return bearerToken

  const cookieStore = await cookies()
  return cookieStore.get("session")?.value ?? null
}

export async function getMobileSessionUser(req: Request) {
  const token = await getRequestSessionToken(req)
  if (!token) return null

  const session = await getSessionById(token)
  if (!session) return null

  const user = await findUserById(session.Userid)
  if (!user || !user.isActive) return null

  return { token, session, user }
}

export async function revokeRequestSession(req: Request) {
  const token = await getRequestSessionToken(req)
  if (!token) return

  await revokeSession(token)
}

export function unauthorizedResponse(message = "Unauthorized.") {
  return NextResponse.json(
    { ok: false, authenticated: false, message },
    { status: 401 }
  )
}

 
import { NextResponse } from "next/server"
import { revokeRequestSession } from "../mobile-auth"

export async function POST(req: Request) {
  try {
    await revokeRequestSession(req)
  } catch {
    // Sign-out should still clear the client even if the server session is already gone.
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set("session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  })

  return res
}

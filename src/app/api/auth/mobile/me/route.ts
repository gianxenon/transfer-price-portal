 
import { NextResponse } from "next/server"
import { getMobileSessionUser, toMobileUser, unauthorizedResponse } from "../mobile-auth"

export async function GET(req: Request) {
  try {
    const sessionUser = await getMobileSessionUser(req)
    if (!sessionUser) {
      return unauthorizedResponse()
    }

    return NextResponse.json({
      ok: true,
      authenticated: true,
      user: toMobileUser(sessionUser.user),
    })
  } catch {
    return NextResponse.json(
      { ok: false, authenticated: false, message: "Unable to load user profile." },
      { status: 500 }
    )
  }
}

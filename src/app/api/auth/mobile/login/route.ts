 import "server-only"
import { NextResponse } from "next/server"
import {
  createSession,
  findUserByUserName,
  verifyPassword,
} from "@/src/app/infrastructure/db/auth-repo"
import { toMobileUser } from "../mobile-auth"

type LoginBody = {
  username?: unknown
  userName?: unknown
  UserName?: unknown
  userid?: unknown
  userId?: unknown
  Userid?: unknown
  password?: unknown
  Password?: unknown
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LoginBody
    const username = String(
      body.username ?? body.userName ?? body.UserName ?? body.userid ?? body.userId ?? body.Userid ?? ""
    ).trim()
    const password = String(body.password ?? body.Password ?? "")

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, message: "Username and password are required." },
        { status: 400 }
      )
    }

    const user = await findUserByUserName(username)
    if (!user || !user.isActive) {
      return NextResponse.json(
        { ok: false, message: "Invalid credentials." },
        { status: 401 }
      )
    }

    const passwordOk = await verifyPassword(password, user.Password)
    if (!passwordOk) {
      return NextResponse.json(
        { ok: false, message: "Invalid credentials." },
        { status: 401 }
      )
    }

    const token = await createSession(user.Userid)
    const res = NextResponse.json({
      ok: true,
      authenticated: true,
      token,
      user: toMobileUser(user),
    })

    res.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    })

    return res
  } catch {
    return NextResponse.json(
      { ok: false, message: "Login failed due to a server error. Please try again." },
      { status: 500 }
    )
  }
}


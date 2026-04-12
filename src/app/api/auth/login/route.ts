import "server-only"
import { NextResponse } from "next/server" 
import {
  findUserByUserName,
 // verifyPassword,
  createSession,
  verifyPassword,
} from "@/src/app/infrastructure/db/auth-repo"

type LoginBody = {
  username: string
  password: string
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LoginBody
    const username =  body.username || "" 
    const password = body.password || ""

    if (!username || !password) { 
      return NextResponse.json({ message: "Username and password are required. username: " + username + ", password: " + password }, { status: 400 })
    }

    const user = await findUserByUserName(username)

    if (!user || !user.isActive) {
      return NextResponse.json({ message: "Invalid credentials." }, { status: 401 })
    }

    const ok = await verifyPassword(password, user.Password)
    if (!ok) {
      return NextResponse.json({ message: "Invalid credentials." }, { status: 401 })
    }

    const token = await createSession(user.Userid)

    const res = NextResponse.json({ ok: true })
    res.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" ,
      sameSite: "lax",
      path: "/",
    })
    return res
  } catch {
    return NextResponse.json(
      { message: "Login failed due to a server error. Please try again." },
      { status: 500 }
    )
  }
}

import "server-only"
import { NextResponse } from "next/server" 
import {
  findUserByUserName, 
  registerUser,
  hashPassword,
  getSessionById,
} from "@/src/app/infrastructure/db/auth-repo" 
import { cookies } from "next/headers"

type RegistrationBody = {
  username: string
  password: string
  fullname: string 
}

export async function POST(req: Request) {
  try { 
    const body = (await req.json()) as RegistrationBody
    const username = body.username?.trim()
    const password = body.password  
    const fullname = body.fullname 

    if (!username || !password || !fullname ) { 
      return NextResponse.json({ message: "All fields are required." }, { status: 400 })
    }

    const existing  = await findUserByUserName(username) 
    if (existing ) {
      return NextResponse.json({ message: "Username already exists." }, { status: 400 })
    }

     // Get current logged-in user from session cookie
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value
    if (!sessionToken) {
      return NextResponse.json(
        { message: "You must be logged in to register a user." },
        { status: 401 }
      )
    }

    const session = await getSessionById(sessionToken)
    if (!session) {
      return NextResponse.json(
        { message: "Invalid or expired session." },
        { status: 401 }
      )
    }

    const passwordHash = await hashPassword(password)

    await registerUser({
      UserName: username,
      Password: passwordHash,
      FullName: fullname,
      CreatedBy: session.Userid,
      UpdatedBy: session.Userid,
    })
 
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { message: "Registration failed due to a server error. Please try again." },
      { status: 500 }
    )
  }
}

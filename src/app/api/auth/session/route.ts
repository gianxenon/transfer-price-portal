import "server-only"
import { NextResponse } from "next/server"
import { getSessionById } from "@/src/app/infrastructure/db/auth-repo"
import { cookies } from "next/headers"
export async function GET() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get("session")?.value    
    if (!sessionToken) {
        return NextResponse.json({ authenticated: false })
    }

    const session = await getSessionById(sessionToken)
    if (!session) {
        return NextResponse.json({ authenticated: false })
    }
    return NextResponse.json({ authenticated: true })
}
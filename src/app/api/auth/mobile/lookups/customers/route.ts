import "server-only"
import { NextResponse } from "next/server"
import { getMobileSessionUser, unauthorizedResponse } from "../../mobile-auth"
import { getCustomers } from "@/src/app/infrastructure/db/coldstorage/lookups-repo"

export async function GET(req: Request) {
  try {
    const sessionUser = await getMobileSessionUser(req)
    if (!sessionUser) return unauthorizedResponse()

    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q")?.trim() ?? ""

    const customers = await getCustomers({ q })

    return NextResponse.json({ ok: true, customers })
  } catch {
    return NextResponse.json(
      { ok: false, message: "Unable to load customers." },
      { status: 500 }
    )
  }
}

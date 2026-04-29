import "server-only"
import { NextResponse } from "next/server"
import { getMobileSessionUser, unauthorizedResponse } from "../../mobile-auth"
import { getSeriesNames } from "@/src/app/infrastructure/db/coldstorage/lookups-repo"

export async function GET(req: Request) {
  try {
    const sessionUser = await getMobileSessionUser(req)
    if (!sessionUser) return unauthorizedResponse()

    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q")?.trim() ?? ""
    const seriesNames = await getSeriesNames({q})
    return NextResponse.json({ ok: true, seriesNames })
  } catch {
    return NextResponse.json(
      { ok: false, message: "Unable to load series names." },
      { status: 500 }
    )
  }
}


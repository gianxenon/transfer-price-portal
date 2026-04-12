import "server-only"
import { NextResponse } from "next/server"
import { getPool } from "@/src/app/infrastructure/db"

export const runtime = "nodejs"

export async function GET() {
  try {
    const pool = await getPool()
    const result = await pool.request().query("SELECT 1 AS ok")
    const ok = Boolean(result.recordset?.[0]?.ok ?? 0)

    return NextResponse.json({ ok })
  } catch {
    return NextResponse.json(
      { ok: false, message: "Database connection failed." },
      { status: 500 }
    )
  }
}

import "server-only"
import { NextRequest, NextResponse } from "next/server"
import {
  getConnectionClient,
  readConnectionEnv,
} from "@/src/app/infrastructure/db/connection-config"
import {
  DEFAULT_MSSQL_CONNECTION_NAME,
  getPool,
} from "@/src/app/infrastructure/db"
import { getMysqlPool } from "@/src/app/infrastructure/db/mysql"

export const runtime = "nodejs"

function formatDatabaseError(error: unknown) {
  if (error instanceof AggregateError) {
    const nestedMessages = error.errors
      .map((entry) => {
        if (entry instanceof Error && entry.message) {
          return entry.message
        }

        if (
          entry &&
          typeof entry === "object" &&
          "message" in entry &&
          typeof entry.message === "string" &&
          entry.message
        ) {
          return entry.message
        }

        return null
      })
      .filter(Boolean)

    if (nestedMessages.length > 0) {
      return nestedMessages.join("; ")
    }
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message
  ) {
    return error.message
  }

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code
  ) {
    return error.code
  }

  return "Database connection failed."
}

export async function GET(request: NextRequest) {
  const connection =
    request.nextUrl.searchParams.get("connection") ||
    DEFAULT_MSSQL_CONNECTION_NAME
  const client = getConnectionClient(connection)

  try {
    if (client === "mysql") {
      const pool = await getMysqlPool(connection)
      const [rows] = await pool.query(
        "SELECT 1 AS ok, DATABASE() AS databaseName, @@hostname AS serverName"
      )
      const row = Array.isArray(rows) ? rows[0] : null
      const ok = Boolean((row as { ok?: number } | null)?.ok ?? 0)
      const databaseName = String(
        (row as { databaseName?: string } | null)?.databaseName ?? ""
      )
      const serverName =
        String((row as { serverName?: string } | null)?.serverName ?? "") ||
        readConnectionEnv(connection, "MYSQL_HOST") ||
        ""

      return NextResponse.json({
        ok,
        connection,
        client,
        databaseName,
        serverName,
      })
    }

    const pool = await getPool(connection)
    const result = await pool
      .request()
      .query("SELECT 1 AS ok, DB_NAME() AS databaseName, @@SERVERNAME AS serverName")
    const ok = Boolean(result.recordset?.[0]?.ok ?? 0)
    const databaseName = String(result.recordset?.[0]?.databaseName ?? "")
    const serverName = String(result.recordset?.[0]?.serverName ?? "")

    return NextResponse.json({
      ok,
      connection,
      client,
      databaseName,
      serverName,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        connection,
        client,
        message: formatDatabaseError(error),
      },
      { status: 500 }
    )
  }
}

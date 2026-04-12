import "server-only"
import sql from "mssql"

type MssqlPool = sql.ConnectionPool

const config: sql.config = {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  server: process.env.MSSQL_SERVER || "localhost",
  database: process.env.MSSQL_DATABASE,
  port: Number(process.env.MSSQL_PORT || 1433),
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === "true",
    trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERTIFICATE === "true",
  },
}

declare global {
  var __mssqlPool: MssqlPool | undefined
}

export async function getPool(): Promise<MssqlPool> {
  if (!global.__mssqlPool) {
    global.__mssqlPool = await new sql.ConnectionPool(config).connect()
  }
  return global.__mssqlPool
}

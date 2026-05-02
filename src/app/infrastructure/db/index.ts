import "server-only"
import sql from "mssql"
import {
  DbConnectionName,
  normalizeConnectionName,
  readBooleanConnectionEnv,
  readConnectionEnv,
  readRequiredConnectionEnv,
} from "@/src/app/infrastructure/db/connection-config"

type MssqlPool = sql.ConnectionPool
export const DEFAULT_MSSQL_CONNECTION_NAME = "wms"

function getConfig(connectionName: DbConnectionName): sql.config {
  return {
    user: readRequiredConnectionEnv(connectionName, "MSSQL_USER"),
    password: readRequiredConnectionEnv(connectionName, "MSSQL_PASSWORD"),
    server: readConnectionEnv(connectionName, "MSSQL_SERVER") || "localhost",
    database: readRequiredConnectionEnv(connectionName, "MSSQL_DATABASE"),
    port: Number(readConnectionEnv(connectionName, "MSSQL_PORT") || 1433),
    options: {
      encrypt: readBooleanConnectionEnv(connectionName, "MSSQL_ENCRYPT"),
      trustServerCertificate: readBooleanConnectionEnv(
        connectionName,
        "MSSQL_TRUST_SERVER_CERTIFICATE"
      ),
    },
  }
}

declare global {
  var __mssqlPools: Map<string, MssqlPool> | undefined
}

export async function getPool(
  connectionName: DbConnectionName = DEFAULT_MSSQL_CONNECTION_NAME
): Promise<MssqlPool> {
  const normalizedConnectionName = normalizeConnectionName(connectionName)

  if (!global.__mssqlPools) {
    global.__mssqlPools = new Map()
  }

  const existingPool = global.__mssqlPools.get(normalizedConnectionName)
  if (existingPool) {
    return existingPool
  }

  const pool = await new sql.ConnectionPool(
    getConfig(normalizedConnectionName)
  ).connect()

  global.__mssqlPools.set(normalizedConnectionName, pool)
  return pool
}

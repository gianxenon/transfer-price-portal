import "server-only"
import mysql from "mysql2/promise"
import {
  DbConnectionName,
  normalizeConnectionName,
  readBooleanConnectionEnv,
  readConnectionEnv,
  readRequiredConnectionEnv,
} from "@/src/app/infrastructure/db/connection-config"

type MysqlPool = mysql.Pool

function getMysqlConfig(connectionName: DbConnectionName): mysql.PoolOptions {
  const useSsl = readBooleanConnectionEnv(connectionName, "MYSQL_SSL")

  return {
    host: readRequiredConnectionEnv(connectionName, "MYSQL_HOST"),
    port: Number(readConnectionEnv(connectionName, "MYSQL_PORT") || 3306),
    user: readRequiredConnectionEnv(connectionName, "MYSQL_USER"),
    password: readRequiredConnectionEnv(connectionName, "MYSQL_PASSWORD"),
    database: readRequiredConnectionEnv(connectionName, "MYSQL_DATABASE"),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: useSsl
      ? {
          rejectUnauthorized: readBooleanConnectionEnv(
            connectionName,
            "MYSQL_SSL_REJECT_UNAUTHORIZED"
          ),
        }
      : undefined,
  }
}

declare global {
  var __mysqlPools: Map<string, MysqlPool> | undefined
}

export async function getMysqlPool(
  connectionName: DbConnectionName = "ebt"
): Promise<MysqlPool> {
  const normalizedConnectionName = normalizeConnectionName(connectionName)

  if (!global.__mysqlPools) {
    global.__mysqlPools = new Map()
  }

  const existingPool = global.__mysqlPools.get(normalizedConnectionName)
  if (existingPool) {
    return existingPool
  }

  const pool = mysql.createPool(getMysqlConfig(normalizedConnectionName))
  const connection = await pool.getConnection()
  connection.release()

  global.__mysqlPools.set(normalizedConnectionName, pool)
  return pool
}

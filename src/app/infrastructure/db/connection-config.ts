import "server-only"

export type SupportedDatabaseClient = "mssql" | "mysql"
export type DbConnectionName = string

export function normalizeConnectionName(connectionName?: string) {
  return connectionName?.trim().toLowerCase() || "default"
}

function getEnvPrefix(connectionName: DbConnectionName) {
  return connectionName === "default" ? "" : `${connectionName.toUpperCase()}_`
}

export function getConnectionEnvKey(
  connectionName: DbConnectionName,
  key: string
) {
  return `${getEnvPrefix(connectionName)}${key}`
}

export function readConnectionEnv(
  connectionName: DbConnectionName,
  key: string
) {
  return process.env[getConnectionEnvKey(connectionName, key)]
}

export function readBooleanConnectionEnv(
  connectionName: DbConnectionName,
  key: string
) {
  return readConnectionEnv(connectionName, key) === "true"
}

export function readRequiredConnectionEnv(
  connectionName: DbConnectionName,
  key: string
) {
  const value = readConnectionEnv(connectionName, key)
  if (!value) {
    throw new Error(
      `Missing ${getConnectionEnvKey(connectionName, key)} environment variable.`
    )
  }
  return value
}

export function getConnectionClient(
  connectionName: DbConnectionName = "default"
): SupportedDatabaseClient {
  const normalizedConnectionName = normalizeConnectionName(connectionName)
  const explicitClient = readConnectionEnv(
    normalizedConnectionName,
    "DB_CLIENT"
  )
    ?.trim()
    .toLowerCase()

  if (explicitClient === "mssql" || explicitClient === "mysql") {
    return explicitClient
  }

  const hasMysqlEnv = Boolean(
    readConnectionEnv(normalizedConnectionName, "MYSQL_HOST") ||
      readConnectionEnv(normalizedConnectionName, "MYSQL_DATABASE") ||
      readConnectionEnv(normalizedConnectionName, "MYSQL_USER")
  )

  if (hasMysqlEnv) {
    return "mysql"
  }

  return "mssql"
}

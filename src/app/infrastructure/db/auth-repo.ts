import "server-only"
import sql from "mssql"
import crypto from "crypto"
import bcrypt from "bcryptjs"
import { getPool } from "@/src/app/infrastructure/db"

type DbUser = {
  Userid: number
  UserName: string
  Password: string
  isActive: boolean
}

type SessionRow = {
  Session_Id_Hash: string
  Userid: number
  Expires_at: Date
  Revoked_at: Date | null
}

export async function findUserByUserName(UserName: string): Promise<DbUser | null> {
  const pool = await getPool()
  const result = await pool
    .request()
    .input("username", sql.VarChar(225), UserName)
    .query(
      "SELECT Userid, UserName, Password, isActive FROM tpp_users WHERE UserName = @username"
    )

  return result.recordset?.[0] ?? null
}

export async function getUserNameById(userId: number): Promise<string | null> {
  const pool = await getPool()
  const result = await pool
    .request()
    .input("userid", userId)
    .query("SELECT UserName FROM tpp_users WHERE Userid = @userid")

  return result.recordset?.[0]?.UserName ?? null
}

export async function hashPassword(plain: string) {
  const saltRounds = 10
  return bcrypt.hash(plain, saltRounds)
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash)
}
 
export async function createSession(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex")
  const hash = crypto.createHash("sha256").update(String(token)).digest("hex")
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24h

  const pool = await getPool()
  await pool
    .request()
    .input("hash", hash)
    .input("userid", sql.Int, userId)
    .input("expires", sql.DateTime, expiresAt)
    .query(
      "INSERT INTO tpp_sessions (Session_Id_Hash, Userid, Expires_at, Created_at) VALUES (@hash, @userid, @expires, GETUTCDATE())"
    )

  return token
}

export async function getSessionById(sessionToken: string): Promise<SessionRow | null> {
  const hash = crypto.createHash("sha256").update(String(sessionToken)).digest("hex")

  const pool = await getPool()
  const result = await pool
    .request()
    .input("hash", hash)
    .query(
      `SELECT Session_Id_Hash, Userid, Expires_at, Revoked_at
       FROM tpp_sessions
       WHERE Session_Id_Hash = @hash
         AND Revoked_at IS NULL
         AND Expires_at > GETUTCDATE()`
    )

  return result.recordset?.[0] ?? null
}

export async function revokeSession(sessionToken: string): Promise<void> {
  const hash = crypto.createHash("sha256").update(String(sessionToken)).digest("hex")

  const pool = await getPool()
  await pool
    .request()
    .input("hash", hash)
    .query(
      "UPDATE tpp_sessions SET Revoked_at = GETUTCDATE() WHERE Session_Id_Hash = @hash"
    )
}

export async function registerUser(user: {
  UserName: string
  Password: string
  FullName: string
  CreatedBy: number
  UpdatedBy: number
}): Promise<void> {
  const pool = await getPool()
  await pool
    .request()
    .input("username", sql.VarChar(225), user.UserName)
    .input("password", sql.VarChar(225), user.Password)
    .input("fullname", sql.VarChar(225), user.FullName)
    .input("createdby", sql.Int, user.CreatedBy)
    .input("updatedby", sql.Int, user.UpdatedBy)
    .query(
      `INSERT INTO tpp_users
       (UserName, Password, UsersFullName, CreatedBy, CreatedStamp, UpdatedBy, UpdatedStamp, IsActive)
       VALUES
       (@username, @password, @fullname, @createdby, GETUTCDATE(), @updatedby, GETUTCDATE(), 1)`
    )
}

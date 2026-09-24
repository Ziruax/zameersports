import mysql from "mysql2/promise"

/**
 * Raw MySQL data layer (mysql2) — no ORM, works on Hostinger Business hosting.
 *
 * Configuration (either style works; DB_HOST wins if both are set):
 *   1. Hostinger-style discrete vars (use localhost when the Node.js app runs
 *      on the same server as MySQL):
 *        DB_HOST=localhost DB_USER=u123_user DB_PASSWORD=... DB_NAME=u123_db DB_PORT=3306
 *   2. Single URL (used by this repo's sandbox):
 *        DATABASE_URL="mysql://user:pass@host:3306/dbname"
 *
 * Connection rules (Hostinger): pool (never single connection), connectionLimit 5,
 * enableKeepAlive to survive the fast idle kill, queueLimit 0.
 *
 * All queries MUST use `?` placeholders for values (mysql2 escapes them —
 * SQL-injection safe). The text protocol (pool.query) is used instead of
 * prepared statements so LIMIT/OFFSET binding works everywhere.
 *
 * IMPORTANT SQL notes:
 *  - `Order`, `OrderItem` … table names equal the Prisma model names.
 *    `Order` and `key` are MySQL reserved words: ALWAYS backtick them
 *    (SELECT ... FROM \`Order\`, SELECT \`key\`, \`value\` FROM Setting).
 *  - Prisma's @updatedAt is client-side: every UPDATE statement must set
 *    `updatedAt = CURRENT_TIMESTAMP(3)` manually.
 *  - TINYINT(1) columns come back as real booleans (typeCast below).
 *  - SUM()/DECIMAL come back as numbers (decimalNumbers: true).
 */

export type { mysql }

/* ------------------------------- connection ------------------------------- */

interface DbConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
}

function resolveConfig(): DbConfig {
  if (process.env.DB_HOST) {
    return {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? "",
      password: process.env.DB_PASSWORD ?? "",
      database: process.env.DB_NAME ?? "",
    }
  }
  const url = process.env.DATABASE_URL
  if (url && url.startsWith("mysql")) {
    const u = new URL(url)
    return {
      host: u.hostname,
      port: Number(u.port || 3306),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ""),
    }
  }
  throw new Error(
    "Missing database config: set DB_HOST/DB_USER/DB_PASSWORD/DB_NAME (Hostinger) or DATABASE_URL (mysql://...)",
  )
}

const globalForDb = globalThis as unknown as { __zsPool?: mysql.Pool }

/** Lazily-created shared pool (created on first query, never at import time). */
export function getPool(): mysql.Pool {
  if (globalForDb.__zsPool) return globalForDb.__zsPool
  const cfg = resolveConfig()
  globalForDb.__zsPool = mysql.createPool({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    waitForConnections: true,
    connectionLimit: 5, // Hostinger limit is low — keep at 5
    queueLimit: 0,
    enableKeepAlive: true, // survives Hostinger's ~30s idle kill
    timezone: "Z", // interpret DATETIME as UTC (matches how the data was written)
    decimalNumbers: true, // SUM()/DECIMAL → JS number instead of string
    charset: "UTF8MB4_UNICODE_CI",
    // Prisma-compat: TINYINT(1) (Prisma Boolean) → real JS boolean
    typeCast(field, next) {
      if (field.type === "TINY" && field.length === 1) {
        return field.string() === "1"
      }
      return next()
    },
  })
  return globalForDb.__zsPool
}

/* -------------------------------- helpers --------------------------------- */

export type Row = Record<string, unknown>

/**
 * Run a SELECT (or any statement) and return the result rows.
 * `params` are safely escaped via `?` placeholders.
 * Array params expand: query("... WHERE id IN (?)", [[a, b, c]]) → IN ('a','b','c').
 */
export async function query<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await getPool().query(sql, params)
  return rows as T[]
}

/** Run INSERT/UPDATE/DELETE — returns affectedRows / insertId metadata. */
export async function execute(sql: string, params: unknown[] = []): Promise<mysql.ResultSetHeader> {
  const [result] = await getPool().query(sql, params)
  return result as mysql.ResultSetHeader
}

/**
 * Run multiple statements atomically on a single pooled connection.
 * `fn` receives the connection — use `conn.query(...)` inside it.
 * Commits on success, rolls back on any thrown error.
 */
export async function withTransaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>,
): Promise<T> {
  const conn = await getPool().getConnection()
  try {
    await conn.beginTransaction()
    const result = await fn(conn)
    await conn.commit()
    return result
  } catch (err) {
    try {
      await conn.rollback()
    } catch {
      // connection already dead — nothing to roll back
    }
    throw err
  } finally {
    conn.release()
  }
}

/** True when MySQL rejected a duplicate unique key (slug / code / email / ...). */
export function isDuplicateEntryError(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === "ER_DUP_ENTRY"
}

/**
 * Generate a Prisma-cuid-shaped id (timestamp + randomness, base36).
 * Used for INSERT statements that previously relied on Prisma's @default(cuid()).
 */
export function newId(): string {
  return (
    "c" +
    Date.now().toString(36).padStart(8, "0") +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 6)
  )
}

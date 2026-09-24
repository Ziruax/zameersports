/**
 * Transient-error classification + retry helper for the raw MySQL data layer.
 * Works with mysql2 network/protocol errors (and keeps Prisma P-codes for the
 * dev-time scripts that still use Prisma).
 */

const TRANSIENT_CODES = new Set([
  // mysql2 / node network errors
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE",
  "ENOTFOUND",
  "EAI_AGAIN",
  "PROTOCOL_CONNECTION_LOST",
  "PROTOCOL_SEQUENCE_TIMEOUT",
  "PROTOCOL_ENQUEUE_AFTER_QUIT",
  "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR",
  // MySQL server busy / lock errors
  "ER_CANT_CREATE_THREAD",
  "ER_CON_COUNT_ERROR",
  "ER_USER_LIMIT_REACHED",
  "ER_LOCK_WAIT_TIMEOUT",
  "ER_LOCK_DEADLOCK",
  // Prisma (dev-time scripts only)
  "P1001",
  "P1002",
  "P1004",
  "P1017",
  "P2024",
])

const TRANSIENT_MESSAGES = [
  "Can't reach database server",
  "Connection terminated",
  "Connection closed",
  "Connection lost",
  "connection is in closed state",
  "Can't add new command when connection is in closed state",
  "Timeout",
  "timeout",
  "timed out",
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "socket hang up",
  "Error querying the database",
  "Transaction already closed",
  "expired transaction",
]

export function isTransientDbError(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code
  if (typeof code === "string" && TRANSIENT_CODES.has(code)) return true
  const msg = err instanceof Error ? err.message : String(err)
  return TRANSIENT_MESSAGES.some((m) => msg.includes(m))
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: { attempts?: number; baseDelayMs?: number; maxDelayMs?: number; label?: string }
): Promise<T> {
  const attempts = opts?.attempts ?? 6
  const base = opts?.baseDelayMs ?? 800
  const max = opts?.maxDelayMs ?? 6000
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (!isTransientDbError(err) || i === attempts - 1) break
      const delay = Math.min(max, base * 2 ** i) + Math.random() * 400
      console.warn(`[retry] ${opts?.label ?? "db"} attempt ${i + 1}/${attempts} failed, retrying in ${Math.round(delay)}ms`)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastErr
}

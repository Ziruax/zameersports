import { Prisma } from '@prisma/client'

const TRANSIENT_CODES = ['P1001', 'P1002', 'P1004', 'P1017', 'P2024']

export function isTransientDbError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError && TRANSIENT_CODES.includes(err.code)) return true
  if (err instanceof Prisma.PrismaClientInitializationError) return true
  const msg = err instanceof Error ? err.message : String(err)
  const transient = ["Can't reach database server", 'Connection terminated', 'Connection closed', 'Timeout', 'timeout', 'timed out', 'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'socket hang up', 'Error querying the database', 'Transaction already closed', 'expired transaction']
  return transient.some((m) => msg.includes(m))
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
      console.warn(`[retry] ${opts?.label ?? 'db'} attempt ${i + 1}/${attempts} failed, retrying in ${Math.round(delay)}ms`)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastErr
}

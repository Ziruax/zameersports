import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto"

/**
 * Password hashing helpers (scrypt) + admin session token signing (HMAC-SHA256).
 * Shared between the seed script and the admin API routes (Task 6).
 */

const SCRYPT_KEYLEN = 64

/** Hash a password with a random salt. Returns "salt:hash" (both hex). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex")
  return `${salt}:${hash}`
}

/** Verify a password against a "salt:hash" stored value (constant-time compare). */
export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":")
    if (!salt || !hash) return false
    const candidate = scryptSync(password, salt, SCRYPT_KEYLEN)
    const expected = Buffer.from(hash, "hex")
    if (candidate.length !== expected.length) return false
    return timingSafeEqual(candidate, expected)
  } catch {
    return false
  }
}

export interface TokenPayload {
  sub: string
  email: string
  exp: number
}

function getSecret(): string {
  return process.env.ADMIN_SECRET || "zameer-sports-dev-secret"
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function fromBase64url(input: string): Buffer {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/")
  return Buffer.from(b64, "base64")
}

function sign(data: string): string {
  return base64url(createHmac("sha256", getSecret()).update(data).digest())
}

/** Sign an admin token: base64url(JSON payload) + "." + HMAC signature. 7 day expiry. */
export function signToken(payload: Omit<TokenPayload, "exp">, ttlSeconds = 7 * 24 * 60 * 60): string {
  const body: TokenPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds }
  const encoded = base64url(JSON.stringify(body))
  return `${encoded}.${sign(encoded)}`
}

/** Verify + decode an admin token. Returns null when invalid or expired. */
export function verifyToken(token: string | undefined | null): TokenPayload | null {
  if (!token) return null
  const parts = token.split(".")
  if (parts.length !== 2) return null
  const [encoded, signature] = parts
  const expected = sign(encoded)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(fromBase64url(encoded).toString("utf8")) as TokenPayload
    if (!payload?.sub || !payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

import { NextResponse } from "next/server"
import type { ZodError } from "zod"
import { isDuplicateEntryError } from "@/lib/db"
import { verifyToken } from "@/lib/auth"

/**
 * Admin API guard + tiny HTTP helpers for admin route handlers.
 * Private folder (starts with _) — not routable by Next.js.
 */

export interface AdminSession {
  sub: string
  email: string
}

/** Parse a named cookie out of a raw `cookie` request header (no NextRequest needed). */
export function getCookieValue(req: Request, name: string): string | null {
  const header = req.headers.get("cookie")
  if (!header) return null
  for (const part of header.split(";")) {
    const eq = part.indexOf("=")
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === name) {
      const raw = part.slice(eq + 1).trim()
      try {
        return decodeURIComponent(raw)
      } catch {
        return raw
      }
    }
  }
  return null
}

/**
 * Verify the zs_admin session cookie on an incoming request.
 * Returns { sub, email } for a valid, unexpired token — otherwise null.
 */
export async function requireAdmin(req: Request): Promise<AdminSession | null> {
  const token = getCookieValue(req, "zs_admin")
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null
  return { sub: payload.sub, email: payload.email }
}

/** Standard 401 for guarded admin routes. */
export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

/** Standard 400. */
export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 })
}

/** Standard 404. */
export function notFound(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 })
}

/** Parse a JSON request body; returns a ready-to-send 400 response on bad JSON. */
export async function readJson(req: Request): Promise<unknown | NextResponse> {
  try {
    return await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
}

/** Flatten a ZodError into the standard admin 400 shape: { error: first issue message }. */
export function zodBadRequest(err: ZodError): NextResponse {
  return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 })
}

/** True when MySQL rejected a duplicate unique key (e.g. slug already exists). */
export function isDuplicateEntry(err: unknown): boolean {
  return isDuplicateEntryError(err)
}

/** Back-compat: maps a MySQL duplicate-key error to the historical Prisma P2002 code. */
export function prismaErrorCode(err: unknown): string | null {
  if (isDuplicateEntryError(err)) return "P2002"
  return null
}

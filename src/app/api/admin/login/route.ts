import { NextResponse } from "next/server"
import { z } from "zod"
import { query } from "@/lib/db"
import type { AdminUserRow } from "@/lib/db-types"
import { signToken, verifyPassword } from "@/lib/auth"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse } from "../../_lib/helpers"
import { readJson, zodBadRequest } from "../_lib/guard"

const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Invalid email address")),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

/**
 * POST /api/admin/login — { email, password } → sets the HttpOnly zs_admin
 * session cookie (7 days) and returns { ok, admin }.
 */
export async function POST(req: Request) {
  const json = await readJson(req)
  if (json instanceof NextResponse) return json

  const parsed = LoginSchema.safeParse(json)
  if (!parsed.success) return zodBadRequest(parsed.error)
  const { email, password } = parsed.data

  try {
    const user = await withRetry(
      () =>
        query<AdminUserRow>("SELECT * FROM AdminUser WHERE email = ? LIMIT 1", [email]).then(
          (rows) => rows[0] ?? null,
        ),
      { label: "admin:login" },
    )
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const token = signToken({ sub: user.id, email: user.email })
    const res = NextResponse.json({
      ok: true,
      admin: { email: user.email, name: user.name },
    })
    res.cookies.set("zs_admin", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 604800, // 7 days — matches the token TTL
    })
    return res
  } catch (err) {
    return dbErrorResponse(err, "admin:login")
  }
}

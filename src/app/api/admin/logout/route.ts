import { NextResponse } from "next/server"
import { requireAdmin, unauthorized } from "../_lib/guard"

/** POST /api/admin/logout — clears the zs_admin session cookie. */
export async function POST(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  const res = NextResponse.json({ ok: true })
  res.cookies.set("zs_admin", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
  return res
}

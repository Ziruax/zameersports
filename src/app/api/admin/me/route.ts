import { NextResponse } from "next/server"
import { requireAdmin, unauthorized } from "../_lib/guard"

/** GET /api/admin/me — session check driven purely by the cookie token (no DB hit). */
export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  return NextResponse.json({ admin: { email: admin.email, name: "Admin" } })
}

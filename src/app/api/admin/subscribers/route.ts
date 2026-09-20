import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse } from "../../_lib/helpers"
import { requireAdmin, unauthorized } from "../_lib/guard"

/** GET /api/admin/subscribers — newsletter subscribers, latest first. → { items: [{ id, email, createdAt }] } */
export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  try {
    const rows = await withRetry(
      () => db.subscriber.findMany({ orderBy: { createdAt: "desc" } }),
      { label: "admin:subscribers:list" },
    )
    return NextResponse.json({
      items: rows.map((s) => ({ id: s.id, email: s.email, createdAt: s.createdAt.toISOString() })),
    })
  } catch (err) {
    return dbErrorResponse(err, "admin:subscribers:list")
  }
}

import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import type { SubscriberRow } from "@/lib/db-types"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse } from "../../_lib/helpers"
import { requireAdmin, unauthorized } from "../_lib/guard"

/** GET /api/admin/subscribers — newsletter subscribers, latest first. → { items: [{ id, email, createdAt }] } */
export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  try {
    const rows = await withRetry(() => query<SubscriberRow>("SELECT * FROM Subscriber ORDER BY createdAt DESC"), {
      label: "admin:subscribers:list",
    })
    return NextResponse.json({
      items: rows.map((s) => ({ id: s.id, email: s.email, createdAt: s.createdAt.toISOString() })),
    })
  } catch (err) {
    return dbErrorResponse(err, "admin:subscribers:list")
  }
}

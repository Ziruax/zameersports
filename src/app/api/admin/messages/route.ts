import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse } from "../../_lib/helpers"
import { requireAdmin, unauthorized } from "../_lib/guard"
import { toAdminMessage } from "../_lib/mappers"

/** GET /api/admin/messages — all contact messages, latest first. → { items } */
export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  try {
    const rows = await withRetry(
      () => db.contactMessage.findMany({ orderBy: { createdAt: "desc" } }),
      { label: "admin:messages:list" },
    )
    return NextResponse.json({ items: rows.map(toAdminMessage) })
  } catch (err) {
    return dbErrorResponse(err, "admin:messages:list")
  }
}

import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import type { ReviewRow } from "@/lib/db-types"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse } from "../../_lib/helpers"
import { requireAdmin, unauthorized } from "../_lib/guard"
import { toAdminReview } from "../_lib/mappers"

type ReviewJoinRow = ReviewRow & { productName: string | null }

/**
 * GET /api/admin/reviews — all reviews, latest first, with product names.
 * Query: approved=true|false to filter; omitted → all. → { items }
 */
export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  const approvedParam = new URL(req.url).searchParams.get("approved")?.trim() ?? ""
  let where = ""
  if (approvedParam === "true") where = "WHERE r.approved = 1"
  else if (approvedParam === "false") where = "WHERE r.approved = 0"

  try {
    const rows = await withRetry(
      () =>
        query<ReviewJoinRow>(
          `SELECT r.*, p.name AS productName FROM Review r LEFT JOIN Product p ON p.id = r.productId ${where} ORDER BY r.createdAt DESC`,
        ),
      { label: "admin:reviews:list" },
    )
    return NextResponse.json({ items: rows.map(toAdminReview) })
  } catch (err) {
    return dbErrorResponse(err, "admin:reviews:list")
  }
}

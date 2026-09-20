import type { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse } from "../../_lib/helpers"
import { requireAdmin, unauthorized } from "../_lib/guard"
import { toAdminReview } from "../_lib/mappers"

/**
 * GET /api/admin/reviews — all reviews, latest first, with product names.
 * Query: approved=true|false to filter; omitted → all. → { items }
 */
export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  const approvedParam = new URL(req.url).searchParams.get("approved")?.trim() ?? ""
  const where: Prisma.ReviewWhereInput = {}
  if (approvedParam === "true") where.approved = true
  else if (approvedParam === "false") where.approved = false

  try {
    const rows = await withRetry(
      () =>
        db.review.findMany({
          where,
          orderBy: { createdAt: "desc" },
          include: { product: { select: { name: true } } },
        }),
      { label: "admin:reviews:list" },
    )
    return NextResponse.json({ items: rows.map(toAdminReview) })
  } catch (err) {
    return dbErrorResponse(err, "admin:reviews:list")
  }
}

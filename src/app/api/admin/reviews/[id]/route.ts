import { NextResponse } from "next/server"
import { z } from "zod"
import type { mysql } from "@/lib/db"
import { query, withTransaction } from "@/lib/db"
import type { ReviewRow } from "@/lib/db-types"
import { cacheInvalidate } from "@/lib/cache"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse } from "../../../_lib/helpers"
import { notFound, readJson, requireAdmin, unauthorized, zodBadRequest } from "../../_lib/guard"
import { toAdminReview } from "../../_lib/mappers"

type Params = { params: Promise<{ id: string }> }

type ReviewJoinRow = ReviewRow & { productName: string | null }

const ReviewApproveSchema = z.object({
  approved: z.boolean(),
})

/** Typed query on an existing transaction connection. */
async function q<T>(conn: mysql.PoolConnection, sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await conn.query(sql, params)
  return rows as T[]
}

/**
 * Recalculate the product's rating (avg of approved reviews, 1 decimal) and
 * reviewCount. Runs on the given transaction connection.
 */
async function recalcProductRating(conn: mysql.PoolConnection, productId: string): Promise<void> {
  const aggRows = await q<{ avgRating: number; cnt: number }>(
    conn,
    "SELECT COALESCE(AVG(rating), 0) AS avgRating, COUNT(*) AS cnt FROM Review WHERE productId = ? AND approved = 1",
    [productId],
  )
  const agg = aggRows[0]
  await conn.query(
    "UPDATE Product SET rating = ?, reviewCount = ?, updatedAt = CURRENT_TIMESTAMP(3) WHERE id = ?",
    [Math.round(Number(agg?.avgRating ?? 0) * 10) / 10, Number(agg?.cnt ?? 0), productId],
  )
}

/** PATCH /api/admin/reviews/[id] — { approved: boolean } → approve/unapprove + product recalc. → { ok, review } */
export async function PATCH(req: Request, { params }: Params) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  const { id } = await params

  const json = await readJson(req)
  if (json instanceof NextResponse) return json

  const parsed = ReviewApproveSchema.safeParse(json)
  if (!parsed.success) return zodBadRequest(parsed.error)

  try {
    const review = await withRetry(
      () =>
        withTransaction(async (conn) => {
          await conn.query("UPDATE Review SET approved = ? WHERE id = ?", [parsed.data.approved, id])
          const rows = await q<ReviewJoinRow>(
            conn,
            "SELECT r.*, p.name AS productName FROM Review r LEFT JOIN Product p ON p.id = r.productId WHERE r.id = ? LIMIT 1",
            [id],
          )
          const review = rows[0] ?? null
          if (!review) return null
          await recalcProductRating(conn, review.productId)
          return review
        }),
      { label: "admin:reviews:update" },
    )

    if (!review) return notFound("Review not found")
    cacheInvalidate("products")
    return NextResponse.json({ ok: true, review: toAdminReview(review) })
  } catch (err) {
    return dbErrorResponse(err, "admin:reviews:update")
  }
}

/** DELETE /api/admin/reviews/[id] — delete review + recalc product rating/reviewCount. → { ok: true } */
export async function DELETE(req: Request, { params }: Params) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  const { id } = await params

  try {
    const existingRows = await withRetry(
      () => query<{ id: string; productId: string }>("SELECT id, productId FROM Review WHERE id = ? LIMIT 1", [id]),
      { label: "admin:reviews:find" },
    )
    const existing = existingRows[0] ?? null
    if (!existing) return notFound("Review not found")

    await withRetry(
      () =>
        withTransaction(async (conn) => {
          await conn.query("DELETE FROM Review WHERE id = ?", [id])
          await recalcProductRating(conn, existing.productId)
        }),
      { label: "admin:reviews:delete" },
    )
    cacheInvalidate("products")
    return NextResponse.json({ ok: true })
  } catch (err) {
    return dbErrorResponse(err, "admin:reviews:delete")
  }
}

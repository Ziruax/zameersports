import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { cacheInvalidate } from "@/lib/cache"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse } from "../../../_lib/helpers"
import { notFound, prismaErrorCode, readJson, requireAdmin, unauthorized, zodBadRequest } from "../../_lib/guard"
import { toAdminReview } from "../../_lib/mappers"

type Params = { params: Promise<{ id: string }> }

const ReviewApproveSchema = z.object({
  approved: z.boolean(),
})

/** Recalculate the product's rating (avg of approved reviews, 1 decimal) and reviewCount. */
async function recalcProductRating(productId: string): Promise<void> {
  const agg = await withRetry(
    () =>
      db.review.aggregate({
        where: { productId, approved: true },
        _avg: { rating: true },
        _count: true,
      }),
    { label: "admin:reviews:aggregate" },
  )
  await withRetry(
    () =>
      db.product.update({
        where: { id: productId },
        data: {
          rating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
          reviewCount: agg._count,
        },
      }),
    { label: "admin:reviews:recalc" },
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
        db.review.update({
          where: { id },
          data: { approved: parsed.data.approved },
          include: { product: { select: { name: true } } },
        }),
      { label: "admin:reviews:update" },
    )

    await recalcProductRating(review.productId)
    cacheInvalidate("products")
    return NextResponse.json({ ok: true, review: toAdminReview(review) })
  } catch (err) {
    if (prismaErrorCode(err) === "P2025") return notFound("Review not found")
    return dbErrorResponse(err, "admin:reviews:update")
  }
}

/** DELETE /api/admin/reviews/[id] — delete review + recalc product rating/reviewCount. → { ok: true } */
export async function DELETE(req: Request, { params }: Params) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  const { id } = await params

  try {
    const existing = await withRetry(
      () => db.review.findUnique({ where: { id }, select: { id: true, productId: true } }),
      { label: "admin:reviews:find" },
    )
    if (!existing) return notFound("Review not found")

    await withRetry(() => db.review.delete({ where: { id } }), { label: "admin:reviews:delete" })
    await recalcProductRating(existing.productId)
    cacheInvalidate("products")
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (prismaErrorCode(err) === "P2025") return notFound("Review not found")
    return dbErrorResponse(err, "admin:reviews:delete")
  }
}

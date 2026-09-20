import { z } from "zod"
import { db } from "@/lib/db"
import { cacheInvalidate } from "@/lib/cache"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse, toReviewDTO } from "../_lib/helpers"

const ReviewSchema = z.object({
  productId: z.string().min(1, "productId is required"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  rating: z.number().int().min(1, "Rating must be 1-5").max(5, "Rating must be 1-5"),
  comment: z.string().trim().min(3, "Comment must be at least 3 characters").max(1000),
})

/** GET /api/reviews?productId=... — approved reviews for a product, newest first. */
export async function GET(req: Request) {
  const productId = new URL(req.url).searchParams.get("productId")?.trim() ?? ""
  if (!productId) {
    return Response.json({ error: "productId query parameter is required" }, { status: 400 })
  }

  try {
    const rows = await withRetry(
      () =>
        db.review.findMany({
          where: { productId, approved: true },
          orderBy: { createdAt: "desc" },
        }),
      { label: "reviews:list" },
    )
    return Response.json(rows.map(toReviewDTO))
  } catch (err) {
    return dbErrorResponse(err, "reviews:list")
  }
}

/**
 * POST /api/reviews — create an approved review, then recalculate the
 * product's rating (avg of approved reviews, 1 decimal) and reviewCount.
 */
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = ReviewSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid input",
        issues: parsed.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`),
      },
      { status: 400 },
    )
  }
  const { productId, name, rating, comment } = parsed.data

  try {
    const product = await withRetry(
      () => db.product.findFirst({ where: { id: productId, active: true }, select: { id: true } }),
      { label: "reviews:check-product" },
    )
    if (!product) {
      return Response.json({ error: "Product not found" }, { status: 404 })
    }

    /* Idempotency guard: the same productId + name + exact comment submitted
     * within the last 60 seconds is treated as a duplicate (client re-click or
     * withRetry re-running an insert that already committed during a DB flake
     * window) and is returned as-is instead of inserting a second row. The
     * check lives INSIDE the retried closure so a post-commit retry also
     * short-circuits on the row it already wrote. */
    const dupSince = new Date(Date.now() - 60_000)
    const inserted = await withRetry(async () => {
      const dupe = await db.review.findFirst({
        where: { productId, name, comment, createdAt: { gte: dupSince } },
        orderBy: { createdAt: "desc" },
      })
      if (dupe) return { review: dupe, duplicate: true }
      const review = await db.review.create({
        data: { productId, name, rating, comment, approved: true },
      })
      return { review, duplicate: false }
    }, { label: "reviews:create" })

    const agg = await withRetry(
      () =>
        db.review.aggregate({
          where: { productId, approved: true },
          _avg: { rating: true },
          _count: true,
        }),
      { label: "reviews:aggregate" },
    )
    const newRating = Math.round((agg._avg.rating ?? 0) * 10) / 10
    const newCount = agg._count

    await withRetry(
      () => db.product.update({ where: { id: productId }, data: { rating: newRating, reviewCount: newCount } }),
      { label: "reviews:update-product" },
    )

    cacheInvalidate("products")
    return Response.json(
      { ok: true, rating: newRating, reviewCount: newCount, duplicate: inserted.duplicate, review: toReviewDTO(inserted.review) },
      { status: 201 },
    )
  } catch (err) {
    return dbErrorResponse(err, "reviews:create")
  }
}

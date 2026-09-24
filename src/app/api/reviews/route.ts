import { z } from "zod"
import { newId, query, withTransaction } from "@/lib/db"
import type { ReviewRow } from "@/lib/db-types"
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
        query<ReviewRow>(
          "SELECT * FROM Review WHERE productId = ? AND approved = 1 ORDER BY createdAt DESC",
          [productId],
        ),
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
      () =>
        query<{ id: string }>("SELECT id FROM Product WHERE id = ? AND active = 1 LIMIT 1", [
          productId,
        ]).then((rows) => rows[0] ?? null),
      { label: "reviews:check-product" },
    )
    if (!product) {
      return Response.json({ error: "Product not found" }, { status: 404 })
    }

    /* Idempotency guard: the same productId + name + exact comment submitted
     * within the last 60 seconds is treated as a duplicate (client re-click or
     * withRetry re-running an insert that already committed during a DB flake
     * window) and is returned as-is instead of inserting a second row. The
     * check lives INSIDE the retried transaction so a post-commit retry also
     * short-circuits on the row it already wrote. */
    const dupSince = new Date(Date.now() - 60_000)
    const inserted = await withRetry(
      () =>
        withTransaction(async (conn) => {
          const [dupePacks] = await conn.query(
            "SELECT * FROM Review WHERE productId = ? AND name = ? AND comment = ? AND createdAt >= ? ORDER BY createdAt DESC LIMIT 1",
            [productId, name, comment, dupSince],
          )
          const dupe = (dupePacks as ReviewRow[])[0] ?? null
          let review: ReviewRow
          if (dupe) {
            review = dupe
          } else {
            const id = newId()
            await conn.query(
              "INSERT INTO Review (id, productId, name, rating, comment, approved) VALUES (?,?,?,?,?,1)",
              [id, productId, name, rating, comment],
            )
            /* read the row back for DB-authoritative createdAt */
            const [rows] = await conn.query("SELECT * FROM Review WHERE id = ?", [id])
            review = (rows as ReviewRow[])[0]
          }
          /* recalc product aggregates over all approved reviews */
          const [aggPacks] = await conn.query(
            "SELECT AVG(rating) AS avgRating, COUNT(*) AS cnt FROM Review WHERE productId = ? AND approved = 1",
            [productId],
          )
          const agg = (aggPacks as { avgRating: number | null; cnt: number }[])[0]
          const newRating = Math.round(Number(agg?.avgRating ?? 0) * 10) / 10
          const newCount = Number(agg?.cnt ?? 0)
          await conn.query(
            "UPDATE Product SET rating = ?, reviewCount = ?, updatedAt = CURRENT_TIMESTAMP(3) WHERE id = ?",
            [newRating, newCount, productId],
          )
          return { review, newRating, newCount, duplicate: Boolean(dupe) }
        }),
      { label: "reviews:create" },
    )

    cacheInvalidate("products")
    return Response.json(
      {
        ok: true,
        rating: inserted.newRating,
        reviewCount: inserted.newCount,
        duplicate: inserted.duplicate,
        review: toReviewDTO(inserted.review),
      },
      { status: 201 },
    )
  } catch (err) {
    return dbErrorResponse(err, "reviews:create")
  }
}

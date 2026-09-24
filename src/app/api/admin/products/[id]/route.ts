import { NextResponse } from "next/server"
import { execute, isDuplicateEntryError, query } from "@/lib/db"
import type { ProductRow } from "@/lib/db-types"
import { cacheInvalidate } from "@/lib/cache"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse } from "../../../_lib/helpers"
import {
  badRequest,
  notFound,
  readJson,
  requireAdmin,
  unauthorized,
  zodBadRequest,
} from "../../_lib/guard"
import { toAdminProductFull } from "../../_lib/mappers"
import { ProductUpdateSchema } from "../../_lib/schemas"

type Params = { params: Promise<{ id: string }> }

type ProductJoinRow = ProductRow & { categoryName: string | null }

/** Fetch a single product row with its category name (flat JOIN column). */
function fetchProduct(id: string): Promise<ProductJoinRow | null> {
  return query<ProductJoinRow>(
    "SELECT p.*, c.name AS categoryName FROM Product p LEFT JOIN Category c ON c.id = p.categoryId WHERE p.id = ? LIMIT 1",
    [id],
  ).then((rows) => rows[0] ?? null)
}

/**
 * GET /api/admin/products/[id] — full product payload by id (admin only).
 * Unlike the public product endpoint this also serves inactive products,
 * which powers the edit dialog and the duplicate action. → { product }
 */
export async function GET(req: Request, { params }: Params) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  const { id } = await params

  try {
    const product = await withRetry(() => fetchProduct(id), { label: "admin:products:get" })
    if (!product) return notFound("Product not found")
    return NextResponse.json({ product: toAdminProductFull(product) })
  } catch (err) {
    return dbErrorResponse(err, "admin:products:get")
  }
}

/**
 * PATCH /api/admin/products/[id] — partial update (all create fields optional).
 * Slug uniqueness is checked; comparePrice: null clears it. → { product }
 */
export async function PATCH(req: Request, { params }: Params) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  const { id } = await params

  const json = await readJson(req)
  if (json instanceof NextResponse) return json

  const parsed = ProductUpdateSchema.safeParse(json)
  if (!parsed.success) return zodBadRequest(parsed.error)
  const d = parsed.data

  // Dynamic SET clause — only the provided fields (plus updatedAt) are written.
  const sets: string[] = []
  const values: unknown[] = []
  if (d.name !== undefined) {
    sets.push("name = ?")
    values.push(d.name)
  }
  if (d.slug !== undefined) {
    sets.push("slug = ?")
    values.push(d.slug)
  }
  if (d.brand !== undefined) {
    sets.push("brand = ?")
    values.push(d.brand)
  }
  if (d.description !== undefined) {
    sets.push("description = ?")
    values.push(d.description)
  }
  if (d.price !== undefined) {
    sets.push("price = ?")
    values.push(d.price)
  }
  if (d.comparePrice !== undefined) {
    sets.push("comparePrice = ?")
    values.push(d.comparePrice)
  }
  if (d.stock !== undefined) {
    sets.push("stock = ?")
    values.push(d.stock)
  }
  if (d.images !== undefined) {
    sets.push("images = ?")
    values.push(JSON.stringify(d.images))
  }
  if (d.categoryId !== undefined) {
    sets.push("categoryId = ?")
    values.push(d.categoryId)
  }
  if (d.badge !== undefined) {
    sets.push("badge = ?")
    values.push(d.badge)
  }
  if (d.featured !== undefined) {
    sets.push("featured = ?")
    values.push(d.featured)
  }
  if (d.isNew !== undefined) {
    sets.push("isNew = ?")
    values.push(d.isNew)
  }
  if (d.active !== undefined) {
    sets.push("active = ?")
    values.push(d.active)
  }
  if (d.tags !== undefined) {
    sets.push("tags = ?")
    values.push(d.tags.join(","))
  }
  if (d.specs !== undefined) {
    sets.push("specs = ?")
    values.push(JSON.stringify(d.specs))
  }
  if (d.metaTitle !== undefined) {
    sets.push("metaTitle = ?")
    values.push(d.metaTitle)
  }
  if (d.metaDescription !== undefined) {
    sets.push("metaDescription = ?")
    values.push(d.metaDescription)
  }

  try {
    if (d.slug !== undefined) {
      const clashRows = await withRetry(
        () => query<{ id: string }>("SELECT id FROM Product WHERE slug = ? LIMIT 1", [d.slug]),
        { label: "admin:products:slug-check" },
      )
      const clash = clashRows[0] ?? null
      if (clash && clash.id !== id) return badRequest("Slug already exists")
    }
    if (d.categoryId !== undefined) {
      const categoryRows = await withRetry(
        () => query<{ id: string }>("SELECT id FROM Category WHERE id = ? LIMIT 1", [d.categoryId]),
        { label: "admin:products:check-category" },
      )
      if (categoryRows.length === 0) return badRequest("Category not found")
    }

    await withRetry(
      () =>
        execute(
          `UPDATE Product SET ${[...sets, "updatedAt = CURRENT_TIMESTAMP(3)"].join(", ")} WHERE id = ?`,
          [...values, id],
        ),
      { label: "admin:products:update" },
    )

    const product = await withRetry(() => fetchProduct(id), { label: "admin:products:get-updated" })
    if (!product) return notFound("Product not found")

    cacheInvalidate("categories") // product may have moved category / changed active
    return NextResponse.json({ product: toAdminProductFull(product) })
  } catch (err) {
    if (isDuplicateEntryError(err)) return badRequest("Slug already exists")
    return dbErrorResponse(err, "admin:products:update")
  }
}

/**
 * DELETE /api/admin/products/[id] — reviews cascade (FK ON DELETE CASCADE),
 * order items keep their snapshot (productId set NULL by FK ON DELETE SET NULL).
 * → { ok: true }
 */
export async function DELETE(req: Request, { params }: Params) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  const { id } = await params

  try {
    const res = await withRetry(() => execute("DELETE FROM Product WHERE id = ?", [id]), {
      label: "admin:products:delete",
    })
    if (res.affectedRows === 0) return notFound("Product not found")
    cacheInvalidate("categories")
    return NextResponse.json({ ok: true })
  } catch (err) {
    return dbErrorResponse(err, "admin:products:delete")
  }
}

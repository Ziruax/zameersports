import type { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { cacheInvalidate } from "@/lib/cache"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse } from "../../../_lib/helpers"
import {
  badRequest,
  notFound,
  prismaErrorCode,
  readJson,
  requireAdmin,
  unauthorized,
  zodBadRequest,
} from "../../_lib/guard"
import { toAdminProductFull } from "../../_lib/mappers"
import { ProductUpdateSchema } from "../../_lib/schemas"

type Params = { params: Promise<{ id: string }> }

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

  const data: Prisma.ProductUncheckedUpdateInput = {}
  if (d.name !== undefined) data.name = d.name
  if (d.slug !== undefined) data.slug = d.slug
  if (d.brand !== undefined) data.brand = d.brand
  if (d.description !== undefined) data.description = d.description
  if (d.price !== undefined) data.price = d.price
  if (d.comparePrice !== undefined) data.comparePrice = d.comparePrice
  if (d.stock !== undefined) data.stock = d.stock
  if (d.images !== undefined) data.images = JSON.stringify(d.images)
  if (d.categoryId !== undefined) data.categoryId = d.categoryId
  if (d.badge !== undefined) data.badge = d.badge
  if (d.featured !== undefined) data.featured = d.featured
  if (d.isNew !== undefined) data.isNew = d.isNew
  if (d.active !== undefined) data.active = d.active
  if (d.tags !== undefined) data.tags = d.tags.join(",")
  if (d.specs !== undefined) data.specs = JSON.stringify(d.specs)
  if (d.metaTitle !== undefined) data.metaTitle = d.metaTitle
  if (d.metaDescription !== undefined) data.metaDescription = d.metaDescription

  try {
    if (d.slug !== undefined) {
      const clash = await withRetry(
        () => db.product.findUnique({ where: { slug: d.slug }, select: { id: true } }),
        { label: "admin:products:slug-check" },
      )
      if (clash && clash.id !== id) return badRequest("Slug already exists")
    }
    if (d.categoryId !== undefined) {
      const category = await withRetry(
        () => db.category.findUnique({ where: { id: d.categoryId }, select: { id: true } }),
        { label: "admin:products:check-category" },
      )
      if (!category) return badRequest("Category not found")
    }

    const product = await withRetry(
      () =>
        db.product.update({
          where: { id },
          data,
          include: { category: { select: { id: true, name: true } } },
        }),
      { label: "admin:products:update" },
    )

    cacheInvalidate("categories") // product may have moved category / changed active
    return NextResponse.json({ product: toAdminProductFull(product) })
  } catch (err) {
    if (prismaErrorCode(err) === "P2002") return badRequest("Slug already exists")
    if (prismaErrorCode(err) === "P2025") return notFound("Product not found")
    return dbErrorResponse(err, "admin:products:update")
  }
}

/**
 * DELETE /api/admin/products/[id] — reviews cascade, order items keep their
 * snapshot (productId set null by schema). → { ok: true }
 */
export async function DELETE(req: Request, { params }: Params) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  const { id } = await params

  try {
    await withRetry(() => db.product.delete({ where: { id } }), { label: "admin:products:delete" })
    cacheInvalidate("categories")
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (prismaErrorCode(err) === "P2025") return notFound("Product not found")
    return dbErrorResponse(err, "admin:products:delete")
  }
}

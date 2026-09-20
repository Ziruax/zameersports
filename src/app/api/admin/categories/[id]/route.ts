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
import { toAdminCategory } from "../../_lib/mappers"
import { CategoryUpdateSchema } from "../../_lib/schemas"

type Params = { params: Promise<{ id: string }> }

/** PATCH /api/admin/categories/[id] — partial update. → { category } */
export async function PATCH(req: Request, { params }: Params) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  const { id } = await params

  const json = await readJson(req)
  if (json instanceof NextResponse) return json

  const parsed = CategoryUpdateSchema.safeParse(json)
  if (!parsed.success) return zodBadRequest(parsed.error)
  const d = parsed.data

  const data: Prisma.CategoryUncheckedUpdateInput = {}
  if (d.name !== undefined) data.name = d.name
  if (d.slug !== undefined) data.slug = d.slug
  if (d.description !== undefined) data.description = d.description
  if (d.image !== undefined) data.image = d.image
  if (d.icon !== undefined) data.icon = d.icon
  if (d.featured !== undefined) data.featured = d.featured
  if (d.sortOrder !== undefined) data.sortOrder = d.sortOrder

  try {
    if (d.slug !== undefined) {
      const clash = await withRetry(
        () => db.category.findUnique({ where: { slug: d.slug }, select: { id: true } }),
        { label: "admin:categories:slug-check" },
      )
      if (clash && clash.id !== id) return badRequest("Slug already exists")
    }

    const category = await withRetry(
      () =>
        db.category.update({
          where: { id },
          data,
          include: { _count: { select: { products: true } } },
        }),
      { label: "admin:categories:update" },
    )

    cacheInvalidate("categories")
    return NextResponse.json({ category: toAdminCategory(category) })
  } catch (err) {
    if (prismaErrorCode(err) === "P2002") return badRequest("Slug already exists")
    if (prismaErrorCode(err) === "P2025") return notFound("Category not found")
    return dbErrorResponse(err, "admin:categories:update")
  }
}

/**
 * DELETE /api/admin/categories/[id] — refused while products are still assigned.
 * → 400 { error: "Move or delete products first" } | 200 { ok: true }
 */
export async function DELETE(req: Request, { params }: Params) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  const { id } = await params

  try {
    const productCount = await withRetry(
      () => db.product.count({ where: { categoryId: id } }),
      { label: "admin:categories:count-products" },
    )
    if (productCount > 0) {
      return NextResponse.json({ error: "Move or delete products first" }, { status: 400 })
    }

    await withRetry(() => db.category.delete({ where: { id } }), { label: "admin:categories:delete" })
    cacheInvalidate("categories")
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (prismaErrorCode(err) === "P2025") return notFound("Category not found")
    return dbErrorResponse(err, "admin:categories:delete")
  }
}

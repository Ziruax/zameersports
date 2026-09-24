import { NextResponse } from "next/server"
import { execute, isDuplicateEntryError, query } from "@/lib/db"
import type { CategoryRow } from "@/lib/db-types"
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
import { toAdminCategory } from "../../_lib/mappers"
import { CategoryUpdateSchema } from "../../_lib/schemas"

type Params = { params: Promise<{ id: string }> }

type CategoryCountRow = CategoryRow & { productCount: number }

/** Fetch one category with its (admin) product count. */
function fetchCategory(id: string): Promise<CategoryCountRow | null> {
  return query<CategoryCountRow>(
    "SELECT c.*, (SELECT COUNT(*) FROM Product p WHERE p.categoryId = c.id) AS productCount FROM Category c WHERE c.id = ? LIMIT 1",
    [id],
  ).then((rows) => rows[0] ?? null)
}

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
  if (d.description !== undefined) {
    sets.push("description = ?")
    values.push(d.description)
  }
  if (d.image !== undefined) {
    sets.push("image = ?")
    values.push(d.image)
  }
  if (d.icon !== undefined) {
    sets.push("icon = ?")
    values.push(d.icon)
  }
  if (d.featured !== undefined) {
    sets.push("featured = ?")
    values.push(d.featured)
  }
  if (d.sortOrder !== undefined) {
    sets.push("sortOrder = ?")
    values.push(d.sortOrder)
  }

  try {
    if (d.slug !== undefined) {
      const clashRows = await withRetry(
        () => query<{ id: string }>("SELECT id FROM Category WHERE slug = ? LIMIT 1", [d.slug]),
        { label: "admin:categories:slug-check" },
      )
      const clash = clashRows[0] ?? null
      if (clash && clash.id !== id) return badRequest("Slug already exists")
    }

    await withRetry(
      () =>
        execute(
          `UPDATE Category SET ${[...sets, "updatedAt = CURRENT_TIMESTAMP(3)"].join(", ")} WHERE id = ?`,
          [...values, id],
        ),
      { label: "admin:categories:update" },
    )

    const category = await withRetry(() => fetchCategory(id), { label: "admin:categories:get-updated" })
    if (!category) return notFound("Category not found")

    cacheInvalidate("categories")
    return NextResponse.json({ category: toAdminCategory({ ...category, productCount: Number(category.productCount) }) })
  } catch (err) {
    if (isDuplicateEntryError(err)) return badRequest("Slug already exists")
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
    const countRows = await withRetry(
      () => query<{ cnt: number }>("SELECT COUNT(*) AS cnt FROM Product WHERE categoryId = ?", [id]),
      { label: "admin:categories:count-products" },
    )
    if (Number(countRows[0]?.cnt ?? 0) > 0) {
      return NextResponse.json({ error: "Move or delete products first" }, { status: 400 })
    }

    const res = await withRetry(() => execute("DELETE FROM Category WHERE id = ?", [id]), {
      label: "admin:categories:delete",
    })
    if (res.affectedRows === 0) return notFound("Category not found")
    cacheInvalidate("categories")
    return NextResponse.json({ ok: true })
  } catch (err) {
    return dbErrorResponse(err, "admin:categories:delete")
  }
}

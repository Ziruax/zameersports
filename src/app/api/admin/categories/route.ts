import { NextResponse } from "next/server"
import { execute, isDuplicateEntryError, newId, query } from "@/lib/db"
import type { CategoryRow } from "@/lib/db-types"
import { cacheInvalidate } from "@/lib/cache"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse } from "../../_lib/helpers"
import {
  badRequest,
  readJson,
  requireAdmin,
  unauthorized,
  zodBadRequest,
} from "../_lib/guard"
import { toAdminCategory } from "../_lib/mappers"
import { CategoryCreateSchema } from "../_lib/schemas"
import { slugify, uniqueCategorySlug } from "../_lib/slug"

type CategoryCountRow = CategoryRow & { productCount: number }

/**
 * GET /api/admin/categories — all categories ordered by sortOrder (then name),
 * with productCount (includes inactive products — matches the delete guard).
 */
export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  try {
    const rows = await withRetry(
      () =>
        query<CategoryCountRow>(
          "SELECT c.*, (SELECT COUNT(*) FROM Product p WHERE p.categoryId = c.id) AS productCount FROM Category c ORDER BY c.sortOrder ASC, c.name ASC",
        ),
      { label: "admin:categories:list" },
    )
    return NextResponse.json({ items: rows.map((c) => toAdminCategory({ ...c, productCount: Number(c.productCount) })) })
  } catch (err) {
    return dbErrorResponse(err, "admin:categories:list")
  }
}

/** POST /api/admin/categories — create (slug auto-derived from name when omitted). → 201 { category } */
export async function POST(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  const json = await readJson(req)
  if (json instanceof NextResponse) return json

  const parsed = CategoryCreateSchema.safeParse(json)
  if (!parsed.success) return zodBadRequest(parsed.error)
  const d = parsed.data

  try {
    // Explicit slug is used as-is (collisions → duplicate key → 400 below);
    // auto-derived slugs get -2/-3 suffixes until unique.
    const slug = d.slug !== undefined ? d.slug : await uniqueCategorySlug(slugify(d.name))
    const id = newId()
    await withRetry(
      () =>
        execute(
          "INSERT INTO Category (id, name, slug, description, image, icon, featured, sortOrder, updatedAt) VALUES (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP(3))",
          [
            id,
            d.name,
            slug,
            d.description ?? "",
            d.image ?? "",
            d.icon ?? "",
            d.featured ?? false,
            d.sortOrder ?? 0,
          ],
        ),
      { label: "admin:categories:create" },
    )

    const category = await withRetry(
      () =>
        query<CategoryCountRow>(
          "SELECT c.*, (SELECT COUNT(*) FROM Product p WHERE p.categoryId = c.id) AS productCount FROM Category c WHERE c.id = ? LIMIT 1",
          [id],
        ).then((rows) => rows[0] ?? null),
      { label: "admin:categories:get-created" },
    )

    cacheInvalidate("categories")
    return NextResponse.json(
      { category: toAdminCategory({ ...category!, productCount: Number(category!.productCount) }) },
      { status: 201 },
    )
  } catch (err) {
    if (isDuplicateEntryError(err)) return badRequest("Slug already exists")
    return dbErrorResponse(err, "admin:categories:create")
  }
}

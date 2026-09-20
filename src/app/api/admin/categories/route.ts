import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { cacheInvalidate } from "@/lib/cache"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse } from "../../_lib/helpers"
import {
  badRequest,
  prismaErrorCode,
  readJson,
  requireAdmin,
  unauthorized,
  zodBadRequest,
} from "../_lib/guard"
import { toAdminCategory } from "../_lib/mappers"
import { CategoryCreateSchema } from "../_lib/schemas"
import { slugify, uniqueCategorySlug } from "../_lib/slug"

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
        db.category.findMany({
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          include: { _count: { select: { products: true } } },
        }),
      { label: "admin:categories:list" },
    )
    return NextResponse.json({ items: rows.map(toAdminCategory) })
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
    // Explicit slug is used as-is (collisions → P2002 → 400 below);
    // auto-derived slugs get -2/-3 suffixes until unique.
    const slug = d.slug !== undefined ? d.slug : await uniqueCategorySlug(slugify(d.name))
    const category = await withRetry(
      () =>
        db.category.create({
          data: {
            name: d.name,
            slug,
            description: d.description ?? "",
            image: d.image ?? "",
            icon: d.icon ?? "",
            featured: d.featured ?? false,
            sortOrder: d.sortOrder ?? 0,
          },
          include: { _count: { select: { products: true } } },
        }),
      { label: "admin:categories:create" },
    )

    cacheInvalidate("categories")
    return NextResponse.json({ category: toAdminCategory(category) }, { status: 201 })
  } catch (err) {
    if (prismaErrorCode(err) === "P2002") return badRequest("Slug already exists")
    return dbErrorResponse(err, "admin:categories:create")
  }
}

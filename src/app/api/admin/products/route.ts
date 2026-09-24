import { NextResponse } from "next/server"
import { execute, isDuplicateEntryError, newId, query } from "@/lib/db"
import type { ProductRow } from "@/lib/db-types"
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
import { toAdminProductFull, toAdminProductRow } from "../_lib/mappers"
import { ProductCreateSchema } from "../_lib/schemas"
import { slugify, uniqueProductSlug } from "../_lib/slug"

type ProductJoinRow = ProductRow & { categoryName: string | null }

/** Fetch a single product row with its category name (flat JOIN column). */
function fetchProduct(id: string): Promise<ProductJoinRow | null> {
  return query<ProductJoinRow>(
    "SELECT p.*, c.name AS categoryName FROM Product p LEFT JOIN Category c ON c.id = p.categoryId WHERE p.id = ? LIMIT 1",
    [id],
  ).then((rows) => rows[0] ?? null)
}

/**
 * GET /api/admin/products — admin table listing (includes inactive products).
 * Query: search (name/brand/slug contains), category (id or slug), page (1), limit (10, max 100).
 * Ordered newest first. → { items, total, pages, page }
 */
export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  const sp = new URL(req.url).searchParams
  const search = sp.get("search")?.trim() || ""
  const category = sp.get("category")?.trim() || ""
  const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(sp.get("limit") ?? "10", 10) || 10))

  const conditions: string[] = []
  const params: unknown[] = []
  if (search) {
    conditions.push("(p.name LIKE ? OR p.brand LIKE ? OR p.slug LIKE ?)")
    const like = `%${search}%`
    params.push(like, like, like)
  }
  if (category) {
    conditions.push("(p.categoryId = ? OR c.slug = ?)")
    params.push(category, category)
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
  const base = "FROM Product p LEFT JOIN Category c ON c.id = p.categoryId"
  const offset = (page - 1) * limit // validated integer — safe to interpolate

  try {
    const { total, rows } = await withRetry(
      async () => {
        const countRows = await query<{ cnt: number }>(
          `SELECT COUNT(*) AS cnt ${base} ${where}`,
          params,
        )
        const rows = await query<ProductJoinRow>(
          `SELECT p.*, c.name AS categoryName ${base} ${where} ORDER BY p.createdAt DESC LIMIT ${limit} OFFSET ${offset}`,
          params,
        )
        return { total: Number(countRows[0]?.cnt ?? 0), rows }
      },
      { label: "admin:products:list" },
    )

    return NextResponse.json({
      items: rows.map(toAdminProductRow),
      total,
      pages: Math.ceil(total / limit),
      page,
    })
  } catch (err) {
    return dbErrorResponse(err, "admin:products:list")
  }
}

/**
 * POST /api/admin/products — create a product. Slug is derived from the name
 * when omitted (uniqueness ensured with -2/-3 suffixes). → 201 { product }
 */
export async function POST(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  const json = await readJson(req)
  if (json instanceof NextResponse) return json

  const parsed = ProductCreateSchema.safeParse(json)
  if (!parsed.success) return zodBadRequest(parsed.error)
  const d = parsed.data

  try {
    const categoryRows = await withRetry(
      () => query<{ id: string }>("SELECT id FROM Category WHERE id = ? LIMIT 1", [d.categoryId]),
      { label: "admin:products:check-category" },
    )
    if (categoryRows.length === 0) return badRequest("Category not found")

    // Explicit slug is used as-is (collisions → duplicate key → 400 below);
    // auto-derived slugs get -2/-3 suffixes until unique.
    const slug = d.slug !== undefined ? d.slug : await uniqueProductSlug(slugify(d.name))

    const id = newId()
    await withRetry(
      () =>
        execute(
          "INSERT INTO Product (id, name, slug, brand, description, price, comparePrice, stock, images, categoryId, badge, tags, specs, metaTitle, metaDescription, featured, isNew, active, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP(3))",
          [
            id,
            d.name,
            slug,
            d.brand ?? "",
            d.description ?? "",
            d.price,
            d.comparePrice ?? null,
            d.stock,
            JSON.stringify(d.images ?? []),
            d.categoryId,
            d.badge ?? "",
            (d.tags ?? []).join(","),
            JSON.stringify(d.specs ?? {}),
            d.metaTitle ?? "",
            d.metaDescription ?? "",
            d.featured ?? false,
            d.isNew ?? false,
            d.active ?? true,
          ],
        ),
      { label: "admin:products:create" },
    )

    const product = await withRetry(() => fetchProduct(id), { label: "admin:products:get-created" })

    cacheInvalidate("categories") // category product counts changed
    return NextResponse.json({ product: toAdminProductFull(product!) }, { status: 201 })
  } catch (err) {
    if (isDuplicateEntryError(err)) return badRequest("Slug already exists")
    return dbErrorResponse(err, "admin:products:create")
  }
}

import type { Prisma } from "@prisma/client"
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
import { toAdminProductFull, toAdminProductRow } from "../_lib/mappers"
import { ProductCreateSchema } from "../_lib/schemas"
import { slugify, uniqueProductSlug } from "../_lib/slug"

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

  const where: Prisma.ProductWhereInput = {}
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { brand: { contains: search } },
      { slug: { contains: search } },
    ]
  }
  if (category) {
    where.category = { OR: [{ id: category }, { slug: category }] }
  }

  try {
    const [total, rows] = await withRetry(
      () =>
        db.$transaction([
          db.product.count({ where }),
          db.product.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
            include: { category: { select: { id: true, name: true } } },
          }),
        ]),
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
    const category = await withRetry(
      () => db.category.findUnique({ where: { id: d.categoryId }, select: { id: true } }),
      { label: "admin:products:check-category" },
    )
    if (!category) return badRequest("Category not found")

    // Explicit slug is used as-is (collisions → P2002 → 400 below);
    // auto-derived slugs get -2/-3 suffixes until unique.
    const slug = d.slug !== undefined ? d.slug : await uniqueProductSlug(slugify(d.name))

    const product = await withRetry(
      () =>
        db.product.create({
          data: {
            name: d.name,
            slug,
            brand: d.brand ?? "",
            description: d.description ?? "",
            price: d.price,
            comparePrice: d.comparePrice ?? null,
            stock: d.stock,
            images: JSON.stringify(d.images ?? []),
            categoryId: d.categoryId,
            badge: d.badge ?? "",
            tags: (d.tags ?? []).join(","),
            specs: JSON.stringify(d.specs ?? {}),
            featured: d.featured ?? false,
            isNew: d.isNew ?? false,
            active: d.active ?? true,
          },
          include: { category: { select: { id: true, name: true } } },
        }),
      { label: "admin:products:create" },
    )

    cacheInvalidate("categories") // category product counts changed
    return NextResponse.json({ product: toAdminProductFull(product) }, { status: 201 })
  } catch (err) {
    if (prismaErrorCode(err) === "P2002") return badRequest("Slug already exists")
    return dbErrorResponse(err, "admin:products:create")
  }
}

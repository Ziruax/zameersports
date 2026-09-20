import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse, toListItem } from "../_lib/helpers"

const SORT_OPTIONS: Record<string, Prisma.ProductOrderByWithRelationInput[]> = {
  new: [{ createdAt: "desc" }],
  "price-asc": [{ price: "asc" }],
  "price-desc": [{ price: "desc" }],
  popular: [{ sold: "desc" }],
  rating: [{ rating: "desc" }],
}

function parseNumberParam(value: string | null): number | null {
  if (value === null || value.trim() === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * GET /api/products — paginated, filterable product list (active only).
 * Params: category, search, sort (new|price-asc|price-desc|popular|rating),
 * min, max, featured=1, isNew=1, page (1), limit (12, max 24).
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const category = sp.get("category")?.trim() || ""
  const search = sp.get("search")?.trim() || ""
  const sort = sp.get("sort")?.trim() || "new"
  const featured = sp.get("featured") === "1"
  const isNew = sp.get("isNew") === "1"
  const min = parseNumberParam(sp.get("min"))
  const max = parseNumberParam(sp.get("max"))
  const page = Math.max(1, Math.max(0, Number.parseInt(sp.get("page") ?? "1", 10) || 1))
  const limit = Math.min(24, Math.max(1, Number.parseInt(sp.get("limit") ?? "12", 10) || 12))

  const orderBy = SORT_OPTIONS[sort] ?? SORT_OPTIONS.new

  const where: Prisma.ProductWhereInput = { active: true }
  if (category) where.category = { slug: category }
  if (featured) where.featured = true
  if (isNew) where.isNew = true
  if (min !== null || max !== null) {
    where.price = {
      ...(min !== null ? { gte: Math.trunc(min) } : {}),
      ...(max !== null ? { lte: Math.trunc(max) } : {}),
    }
  }
  if (search) {
    // MySQL default collation is case-insensitive → contains is CI.
    where.OR = [{ name: { contains: search } }, { brand: { contains: search } }, { tags: { contains: search } }]
  }

  try {
    const [total, rows] = await withRetry(
      () =>
        db.$transaction([
          db.product.count({ where }),
          db.product.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
        ]),
      { label: "products:list" },
    )
    return Response.json({
      items: rows.map(toListItem),
      total,
      pages: Math.ceil(total / limit),
      page,
    })
  } catch (err) {
    return dbErrorResponse(err, "products:list")
  }
}

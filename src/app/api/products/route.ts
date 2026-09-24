import { query } from "@/lib/db"
import type { ProductRow } from "@/lib/db-types"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse, toListItem } from "../_lib/helpers"

/** SQL ORDER BY fragments mirroring the previous Prisma orderBy inputs. */
const SORT_SQL: Record<string, string> = {
  new: "createdAt DESC",
  "price-asc": "price ASC",
  "price-desc": "price DESC",
  popular: "sold DESC",
  rating: "rating DESC",
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

  const orderBy = SORT_SQL[sort] ?? SORT_SQL.new

  /* WHERE builder — one clause per Prisma where input, joined with AND */
  const where: string[] = ["active = 1"]
  const params: unknown[] = []
  if (category) {
    where.push("categoryId IN (SELECT id FROM Category WHERE slug = ?)")
    params.push(category)
  }
  if (featured) where.push("featured = 1")
  if (isNew) where.push("isNew = 1")
  if (min !== null) {
    where.push("price >= ?")
    params.push(Math.trunc(min))
  }
  if (max !== null) {
    where.push("price <= ?")
    params.push(Math.trunc(max))
  }
  if (search) {
    // MySQL default collation is case-insensitive → LIKE is CI.
    where.push("(name LIKE ? OR brand LIKE ? OR tags LIKE ?)")
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }
  const whereSql = where.join(" AND ")

  try {
    const [total, rows] = await withRetry(
      async () => {
        const countRows = await query<{ cnt: number }>(
          `SELECT COUNT(*) AS cnt FROM Product WHERE ${whereSql}`,
          params,
        )
        const rows = await query<ProductRow>(
          `SELECT * FROM Product WHERE ${whereSql} ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
          params,
        )
        return [Number(countRows[0]?.cnt ?? 0), rows] as const
      },
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

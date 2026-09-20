import { db } from "@/lib/db"
import { cacheGet, cacheSet } from "@/lib/cache"
import { withRetry } from "@/lib/retry"
import type { CategoryDTO } from "@/lib/types"
import { dbErrorResponse, toCategoryDTO } from "../_lib/helpers"

export const dynamic = "force-dynamic"

const CACHE_KEY = "categories:all"

/** GET /api/categories — all categories ordered by sortOrder, with productCount (active products only). Cached 60s. */
export async function GET() {
  const cached = cacheGet<CategoryDTO[]>(CACHE_KEY)
  if (cached) return Response.json(cached)

  try {
    const { rows, grouped } = await withRetry(
      async () => {
        const rows = await db.category.findMany({ orderBy: { sortOrder: "asc" } })
        const grouped = await db.product.groupBy({
          by: ["categoryId"],
          where: { active: true },
          _count: { _all: true },
        })
        return { rows, grouped }
      },
      { label: "categories:list" },
    )
    const counts = new Map(grouped.map((g) => [g.categoryId, g._count._all]))
    const payload: CategoryDTO[] = rows.map((c) => toCategoryDTO(c, counts.get(c.id) ?? 0))
    cacheSet(CACHE_KEY, payload)
    return Response.json(payload)
  } catch (err) {
    return dbErrorResponse(err, "categories:list")
  }
}

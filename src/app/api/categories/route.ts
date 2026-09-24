import { query } from "@/lib/db"
import type { CategoryRow } from "@/lib/db-types"
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
    const { rows, counts } = await withRetry(
      async () => {
        const rows = await query<CategoryRow>(
          "SELECT * FROM Category ORDER BY sortOrder ASC, name ASC",
        )
        const countRows = await query<{ categoryId: string; cnt: number }>(
          "SELECT categoryId, COUNT(*) AS cnt FROM Product WHERE active = 1 GROUP BY categoryId",
        )
        return { rows, counts: new Map(countRows.map((r) => [r.categoryId, Number(r.cnt)])) }
      },
      { label: "categories:list" },
    )
    const payload: CategoryDTO[] = rows.map((c) => toCategoryDTO(c, counts.get(c.id) ?? 0))
    cacheSet(CACHE_KEY, payload)
    return Response.json(payload)
  } catch (err) {
    return dbErrorResponse(err, "categories:list")
  }
}

import { db } from "@/lib/db"
import { cacheGet, cacheSet } from "@/lib/cache"
import { withRetry } from "@/lib/retry"
import type { TestimonialDTO } from "@/lib/types"
import { dbErrorResponse, toTestimonialDTO } from "../_lib/helpers"

export const dynamic = "force-dynamic"

const CACHE_KEY = "testimonials:featured"

/**
 * GET /api/testimonials — featured testimonials, newest first.
 * NOTE: the Testimonial model has no createdAt column, so id (cuid) desc is
 * used as the newest-first ordering proxy. Cached 60s.
 */
export async function GET() {
  const cached = cacheGet<TestimonialDTO[]>(CACHE_KEY)
  if (cached) return Response.json(cached)

  try {
    const rows = await withRetry(
      () => db.testimonial.findMany({ where: { featured: true }, orderBy: { id: "desc" } }),
      { label: "testimonials:list" },
    )
    const payload: TestimonialDTO[] = rows.map(toTestimonialDTO)
    cacheSet(CACHE_KEY, payload)
    return Response.json(payload)
  } catch (err) {
    return dbErrorResponse(err, "testimonials:list")
  }
}

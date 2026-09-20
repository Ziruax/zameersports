import { db } from "@/lib/db"
import { withRetry } from "@/lib/retry"

/**
 * Slug helpers for admin create/update endpoints. Private folder — not routable.
 */

/** lowercase, [a-z0-9-], no leading/trailing/duplicate hyphens, capped length. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
}

/** Slug regex shared by zod validators. */
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

async function ensureUnique(
  base: string,
  fallback: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  let candidate = base || fallback
  for (let i = 2; ; i++) {
    if (!(await isTaken(candidate))) return candidate
    candidate = `${base || fallback}-${i}`
  }
}

/** Product slug that does not collide with an existing product (-2, -3, ... suffixes). */
export async function uniqueProductSlug(base: string): Promise<string> {
  return ensureUnique(base, "product", (slug) =>
    withRetry(async () => {
      const row = await db.product.findUnique({ where: { slug }, select: { id: true } })
      return row !== null
    }, { label: "admin:slug-check-product" }),
  )
}

/** Category slug that does not collide with an existing category (-2, -3, ... suffixes). */
export async function uniqueCategorySlug(base: string): Promise<string> {
  return ensureUnique(base, "category", (slug) =>
    withRetry(async () => {
      const row = await db.category.findUnique({ where: { slug }, select: { id: true } })
      return row !== null
    }, { label: "admin:slug-check-category" }),
  )
}

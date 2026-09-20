/**
 * Idempotent cleanup script for ZameerSports.shop (bun runtime, remote MySQL).
 * Usage: cd /home/z/my-project && unset DATABASE_URL && bun scripts/cleanup.ts
 *
 * Removes ONLY rows that are not part of the canonical dataset:
 *   - products   whose slug is not in src/data/catalog.json (51 canonical slugs)
 *   - categories whose slug is not in catalog.json (8 canonical slugs) — but only
 *     if empty after the product pass (defensive: never cascade-delete a
 *     canonical product that was mis-parented into an orphan category)
 *   - testimonials whose name is not one of the 7 canonical names seeded by
 *     scripts/seed.ts (TESTIMONIALS)
 *   - settings    whose key is not one of the 17 canonical keys seeded by
 *     scripts/seed.ts (SETTINGS)
 *
 * Orders / reviews / contact messages / subscribers are left alone except for
 * automatic cascades (reviews of deleted orphan products are cascade-deleted).
 * Every DB call is wrapped in withRetry (remote MySQL is flaky: P1001 on cold
 * connects); the shell wrapper retries the whole script as a second layer.
 */
import { PrismaClient } from "@prisma/client"
import catalog from "../src/data/catalog.json"
import { withRetry } from "../src/lib/retry"

const db = new PrismaClient({ log: ["error"] })

/* Canonical sets ---------------------------------------------------------- */

const CATEGORY_SLUGS: string[] = catalog.categories.map((c) => c.slug)
const PRODUCT_SLUGS: string[] = catalog.products.map((p) => p.slug)

/** Canonical testimonial names — extracted from scripts/seed.ts TESTIMONIALS */
const TESTIMONIAL_NAMES = [
  "Matloob Chaudhary",
  "Mian Volleyball Club Chak Jani",
  "Ahmed Raza",
  "Fatima Noor",
  "Bilal Hussain",
  "Usman Ghani",
  "Hamza Tariq",
]

/** Canonical setting keys — extracted from scripts/seed.ts SETTINGS */
const SETTING_KEYS = [
  "store_name",
  "store_tagline",
  "phone",
  "whatsapp",
  "email",
  "address",
  "city",
  "hours",
  "announcement",
  "free_shipping_threshold",
  "shipping_fee",
  "facebook1",
  "facebook2",
  "tiktok",
  "instagram",
  "youtube",
  "currency",
]

/* ---------------------------------------------------------------- runner */

interface Counts {
  categories: number
  products: number
  testimonials: number
  settings: number
  orders: number
  reviews: number
  admins: number
  contactMessages: number
  subscribers: number
}

async function snapshot(): Promise<Counts> {
  return withRetry(
    async () => ({
      categories: await db.category.count(),
      products: await db.product.count(),
      testimonials: await db.testimonial.count(),
      settings: await db.setting.count(),
      orders: await db.order.count(),
      reviews: await db.review.count(),
      admins: await db.adminUser.count(),
      contactMessages: await db.contactMessage.count(),
      subscribers: await db.subscriber.count(),
    }),
    { label: "snapshot" },
  )
}

async function main() {
  const before = await snapshot()
  console.log("Cleanup: before counts")
  console.log(" ", JSON.stringify(before))

  /* 1) orphan products (any product not in catalog.json) */
  const delProducts = await withRetry(
    () => db.product.deleteMany({ where: { slug: { notIn: PRODUCT_SLUGS } } }),
    { label: "delete orphan products" },
  )
  console.log(`  deleted products:       ${delProducts.count}`)

  /* 2) orphan categories — defensively: only delete ones that are now empty */
  const orphanCats = await withRetry(
    () =>
      db.category.findMany({
        where: { slug: { notIn: CATEGORY_SLUGS } },
        select: { id: true, slug: true, name: true, _count: { select: { products: true } } },
      }),
    { label: "find orphan categories" },
  )
  const deletableCatIds = orphanCats.filter((c) => c._count.products === 0).map((c) => c.id)
  const skippedCats = orphanCats.filter((c) => c._count.products > 0)
  if (skippedCats.length > 0) {
    console.warn(
      `  WARNING: skipped ${skippedCats.length} orphan categories still holding canonical products: ` +
        skippedCats.map((c) => `${c.slug}(${c._count.products})`).join(", "),
    )
  }
  const delCategories = await withRetry(
    () => db.category.deleteMany({ where: { id: { in: deletableCatIds } } }),
    { label: "delete orphan categories" },
  )
  console.log(`  deleted categories:    ${delCategories.count}`)

  /* 3) orphan testimonials (names not seeded by seed.ts) */
  const delTestimonials = await withRetry(
    () => db.testimonial.deleteMany({ where: { name: { notIn: TESTIMONIAL_NAMES } } }),
    { label: "delete orphan testimonials" },
  )
  console.log(`  deleted testimonials:  ${delTestimonials.count}`)

  /* 4) orphan settings (keys not seeded by seed.ts) */
  const delSettings = await withRetry(
    () => db.setting.deleteMany({ where: { key: { notIn: SETTING_KEYS } } }),
    { label: "delete orphan settings" },
  )
  console.log(`  deleted settings:      ${delSettings.count}`)

  /* verify */
  const after = await snapshot()
  console.log("Cleanup: after counts")
  console.log(" ", JSON.stringify(after))

  const expected = { categories: 8, products: 51, testimonials: 7, settings: 17 }
  let ok = true
  for (const [k, v] of Object.entries(expected)) {
    const actual = after[k as keyof Counts]
    const pass = actual === v
    if (!pass) ok = false
    console.log(`  ${pass ? "PASS" : "FAIL"} ${k}=${actual} (expected ${v})`)
  }
  if (!ok) {
    console.error("Cleanup: canonical count verification FAILED")
    process.exitCode = 1
  } else {
    console.log("Cleanup: OK — canonical dataset verified.")
  }
}

main()
  .catch((err) => {
    console.error("CLEANUP FAILED:", err)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })

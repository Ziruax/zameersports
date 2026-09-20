/**
 * QA artifact cleanup for ZameerSports.shop (bun runtime, remote MySQL).
 * Usage: cd /home/z/my-project && unset DATABASE_URL && bun scripts/qa-cleanup.ts
 *
 * Run inside a shell retry loop (the remote MySQL refuses a fraction of cold
 * connects); every Prisma call here is additionally wrapped in withRetry.
 *
 * Idempotent — removes ONLY QA/test artifacts left by verification agents:
 *   1. contact messages: keep the 2 seed messages (scripts/seed.ts CONTACT_MESSAGES)
 *   2. subscribers:      remove agent test addresses (apitest/toasttest/audit/e2e/...)
 *   3. reviews:          remove test reviews, then RECALC each affected product's
 *                        rating/reviewCount (avg of approved rows, 1 decimal; if
 *                        none remain, restore the catalog.json seeded values)
 *   4. orders:           delete agent test orders ZSMUA2WWIW28 + ZSMUA42GSZ43
 *                        (items cascade) and restore the stock/sold their
 *                        placement decremented/incremented (demo seed orders
 *                        never touched stock, so this returns products to the
 *                        exact catalog.json values)
 *   5. products:         verify exactly 51 canonical (delete any non-catalog
 *                        or "Test" products as a safety net)
 *   6. settings:         verify 17 keys and the seed announcement value
 *                        (restores the announcement if an agent changed it)
 */
import { PrismaClient } from "@prisma/client"
import catalog from "../src/data/catalog.json"
import { withRetry } from "../src/lib/retry"

const db = new PrismaClient({ log: ["error"] })

/* Canonical data ---------------------------------------------------------- */

const CATEGORY_SLUGS: string[] = catalog.categories.map((c) => c.slug)
const CATALOG_BY_SLUG = new Map(catalog.products.map((p) => [p.slug, p]))

const PRODUCT_SLUGS: string[] = catalog.products.map((p) => p.slug)

/** The 2 seed contact messages (scripts/seed.ts CONTACT_MESSAGES) — kept. */
const SEED_MESSAGE_NAMES = ["Chaudhary Waseem", "Sana Fatima"]

/** Seed announcement (scripts/seed.ts SETTINGS.announcement). */
const SEED_ANNOUNCEMENT =
  "FREE Pakistan-wide delivery on orders over Rs 5,000 • Cash on Delivery available"

/** Agent test orders — deleted (12 ZSDEMO demo orders are kept). */
const TEST_ORDER_NUMBERS = ["ZSMUA2WWIW28", "ZSMUA42GSZ43"]

/** Test reviewer names + comment markers used by verification agents. */
const TEST_REVIEW_NAMES = ["API Tester", "E2E Tester", "Toast Test", "Second E2E"]
const TEST_REVIEW_COMMENT_MARKERS = ["E2E toast verification", "tested via API"]

/* ---------------------------------------------------------------- helpers */

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
    { label: "qa-cleanup:snapshot" },
  )
}

/* ---------------------------------------------------------------- runner */

async function main() {
  const before = await snapshot()
  console.log("QA cleanup — before counts:")
  console.log("  " + JSON.stringify(before))

  /* 1) contact messages — keep only the 2 seed messages */
  {
    const doomed = await withRetry(
      () => db.contactMessage.findMany({ where: { name: { notIn: SEED_MESSAGE_NAMES } }, select: { name: true, subject: true } }),
      { label: "qa-cleanup:find-test-messages" },
    )
    if (doomed.length > 0) {
      for (const m of doomed) console.log(`    deleting message: "${m.name}" (${m.subject || "no subject"})`)
      const res = await withRetry(
        () => db.contactMessage.deleteMany({ where: { name: { notIn: SEED_MESSAGE_NAMES } } }),
        { label: "qa-cleanup:delete-test-messages" },
      )
      console.log(`  1) contact messages: deleted ${res.count} test messages`)
    } else {
      console.log("  1) contact messages: nothing to delete")
    }
  }

  /* 2) subscribers — remove agent test addresses */
  {
    const subs = await withRetry(
      () => db.subscriber.findMany({ select: { email: true } }),
      { label: "qa-cleanup:list-subscribers" },
    )
    const isTestEmail = (e: string) => {
      const lower = e.toLowerCase()
      return (
        lower.includes("test") ||
        lower.includes("audit") ||
        lower.includes("e2e") ||
        lower.includes("smoke") ||
        lower.endsWith("@zs.pk")
      )
    }
    const testEmails = subs.map((s) => s.email).filter(isTestEmail)
    if (testEmails.length > 0) {
      for (const e of testEmails) console.log(`    deleting subscriber: ${e}`)
      const res = await withRetry(
        () => db.subscriber.deleteMany({ where: { email: { in: testEmails } } }),
        { label: "qa-cleanup:delete-test-subscribers" },
      )
      console.log(`  2) subscribers: deleted ${res.count} test addresses`)
    } else {
      console.log("  2) subscribers: nothing to delete")
    }
    const remaining = await withRetry(() => db.subscriber.findMany({ select: { email: true } }), {
      label: "qa-cleanup:remaining-subscribers",
    })
    for (const s of remaining) console.log(`    kept subscriber (legit): ${s.email}`)
  }

  /* 3) test reviews + rating recalculation */
  {
    const testReviews = await withRetry(
      () =>
        db.review.findMany({
          where: {
            OR: [
              { name: { in: TEST_REVIEW_NAMES } },
              { comment: { contains: TEST_REVIEW_COMMENT_MARKERS[0] } },
              { comment: { contains: TEST_REVIEW_COMMENT_MARKERS[1] } },
            ],
          },
          select: { id: true, name: true, comment: true, productId: true },
        }),
      { label: "qa-cleanup:find-test-reviews" },
    )
    const affectedProductIds = new Set<string>()
    for (const r of testReviews) {
      affectedProductIds.add(r.productId)
      console.log(`    deleting review: "${r.name}" — "${r.comment.slice(0, 50)}"`)
    }
    if (testReviews.length > 0) {
      await withRetry(
        () => db.review.deleteMany({ where: { id: { in: testReviews.map((r) => r.id) } } }),
        { label: "qa-cleanup:delete-test-reviews" },
      )
    }
    console.log(`  3) reviews: deleted ${testReviews.length} test reviews (${affectedProductIds.size} products affected)`)

    /* recalc rating/reviewCount for every affected product */
    for (const productId of affectedProductIds) {
      const agg = await withRetry(
        () =>
          db.review.aggregate({
            where: { productId, approved: true },
            _avg: { rating: true },
            _count: true,
          }),
        { label: "qa-cleanup:recalc-agg" },
      )
      const product = await withRetry(
        () => db.product.findUnique({ where: { id: productId }, select: { slug: true, rating: true, reviewCount: true } }),
        { label: "qa-cleanup:recalc-product" },
      )
      if (!product) {
        console.log(`    recalc: product ${productId} no longer exists — skipped`)
        continue
      }
      let newRating: number
      let newCount: number
      if (agg._count > 0) {
        newRating = Math.round((agg._avg.rating ?? 0) * 10) / 10
        newCount = agg._count
      } else {
        const seed = CATALOG_BY_SLUG.get(product.slug)
        newRating = seed?.rating ?? product.rating
        newCount = seed?.reviewCount ?? product.reviewCount
      }
      await withRetry(
        () =>
          db.product.update({
            where: { id: productId },
            data: { rating: newRating, reviewCount: newCount },
          }),
        { label: "qa-cleanup:recalc-update" },
      )
      console.log(
        `    recalc ${product.slug}: rating ${product.rating}/${product.reviewCount} -> ${newRating}/${newCount}`,
      )
    }
  }

  /* 4) test orders + stock/sold restoration */
  {
    for (const orderNumber of TEST_ORDER_NUMBERS) {
      const order = await withRetry(
        () =>
          db.order.findFirst({
            where: { orderNumber },
            select: { id: true, items: { select: { productId: true, name: true, qty: true } } },
          }),
        { label: "qa-cleanup:find-test-order" },
      )
      if (!order) {
        console.log(`  4) order ${orderNumber}: already gone`)
        continue
      }
      for (const item of order.items) {
        if (!item.productId) continue
        await withRetry(async () => {
          const p = await db.product.findUnique({
            where: { id: item.productId! },
            select: { stock: true, sold: true },
          })
          if (!p) return
          await db.product.update({
            where: { id: item.productId! },
            data: { stock: p.stock + item.qty, sold: Math.max(0, p.sold - item.qty) },
          })
        }, { label: "qa-cleanup:restore-stock" })
        console.log(`    restored stock +${item.qty} / sold -${item.qty} for "${item.name}"`)
      }
      await withRetry(() => db.order.delete({ where: { id: order.id } }), {
        label: "qa-cleanup:delete-test-order",
      })
      console.log(`  4) order ${orderNumber}: deleted (items cascaded)`)
    }
  }

  /* 5) products — verify exactly the 51 canonical (delete strays) */
  {
    const stray = await withRetry(
      () => db.product.findMany({ where: { slug: { notIn: PRODUCT_SLUGS } }, select: { name: true, slug: true } }),
      { label: "qa-cleanup:find-stray-products" },
    )
    for (const p of stray) console.log(`    deleting stray product: "${p.name}" (${p.slug})`)
    if (stray.length > 0) {
      await withRetry(
        () => db.product.deleteMany({ where: { slug: { notIn: PRODUCT_SLUGS } } }),
        { label: "qa-cleanup:delete-stray-products" },
      )
    }
    console.log(`  5) products: deleted ${stray.length} stray (non-catalog) products`)
  }

  /* 6) settings — verify count + announcement seed value */
  {
    const settingCount = await withRetry(() => db.setting.count(), { label: "qa-cleanup:setting-count" })
    const ann = await withRetry(
      () => db.setting.findUnique({ where: { key: "announcement" } }),
      { label: "qa-cleanup:read-announcement" },
    )
    if (ann && ann.value !== SEED_ANNOUNCEMENT) {
      console.log(`    restoring announcement (was: ${JSON.stringify(ann.value)})`)
      await withRetry(
        () => db.setting.update({ where: { key: "announcement" }, data: { value: SEED_ANNOUNCEMENT } }),
        { label: "qa-cleanup:restore-announcement" },
      )
      console.log("  6) settings: announcement restored to seed value")
    } else {
      console.log("  6) settings: announcement already matches seed value")
    }
    console.log(`    settings count: ${settingCount} (17 canonical keys expected)`)
  }

  /* final verification */
  const after = await snapshot()
  console.log("\nQA cleanup — after counts:")
  console.log("  " + JSON.stringify(after))

  const expected: [keyof Counts, number, boolean][] = [
    ["products", 51, true],
    ["categories", 8, true],
    ["orders", 12, true],
    ["reviews", 34, true],
    ["testimonials", 7, true],
    ["settings", 17, true],
    ["subscribers", 2, false], /* <= 2, only legit */
    ["contactMessages", 2, true],
  ]
  let ok = true
  for (const [key, want, exact] of expected) {
    const actual = after[key]
    const pass = exact ? actual === want : actual <= want
    if (!pass) ok = false
    console.log(`  ${pass ? "PASS" : "FAIL"} ${key}=${actual} (expected ${exact ? "=" : "<="} ${want})`)
  }
  if (!ok) {
    console.error("QA CLEANUP: verification FAILED — see counts above")
    process.exitCode = 1
  } else {
    console.log("QA CLEANUP: OK — canonical demo dataset verified.")
  }
}

main()
  .catch((err) => {
    console.error("QA CLEANUP FAILED:", err)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })

/**
 * Print current row counts for every table + flagship product snapshot.
 * Usage: cd /home/z/my-project && env -u DATABASE_URL bun scripts/db-counts.ts
 *   (the sandbox shell exports a stale DATABASE_URL; the project .env is correct)
 *
 * Uses the production mysql2 layer (src/lib/db.ts) — same code path as the
 * app, so this doubles as a smoke test for the pool config. Counts are
 * fetched in a single round trip (scalar subqueries) because the remote
 * MySQL refuses ~60-70% of cold connects.
 */
import { query, getPool } from "@/lib/db"
import { withRetry } from "@/lib/retry"

interface CountRow {
  categories: number
  products: number
  testimonials: number
  settings: number
  orders: number
  orderItems: number
  reviews: number
  admins: number
  contactMessages: number
  subscribers: number
  coupons: number
}

async function main() {
  const [counts] = await withRetry(
    () =>
      query<CountRow>(`
        SELECT
          (SELECT COUNT(*) FROM Category)       AS categories,
          (SELECT COUNT(*) FROM Product)        AS products,
          (SELECT COUNT(*) FROM Testimonial)    AS testimonials,
          (SELECT COUNT(*) FROM Setting)        AS settings,
          (SELECT COUNT(*) FROM \`Order\`)      AS orders,
          (SELECT COUNT(*) FROM OrderItem)      AS orderItems,
          (SELECT COUNT(*) FROM Review)         AS reviews,
          (SELECT COUNT(*) FROM AdminUser)      AS admins,
          (SELECT COUNT(*) FROM ContactMessage) AS contactMessages,
          (SELECT COUNT(*) FROM Subscriber)     AS subscribers,
          (SELECT COUNT(*) FROM Coupon)         AS coupons
      `),
    { label: "counts" },
  )
  console.log(JSON.stringify(counts))

  const [legend] = await withRetry(
    () =>
      query<{ stock: number; sold: number; rating: number; reviewCount: number }>(
        "SELECT stock, sold, rating, reviewCount FROM Product WHERE slug = ?",
        ["zameer-legend-2026"],
      ),
    { label: "legend" },
  )
  console.log("zameer-legend-2026:", JSON.stringify(legend ?? null))

  const [lastOrder] = await withRetry(
    () =>
      query<{ id: string; orderNumber: string; status: string; total: number }>(
        "SELECT id, orderNumber, status, total FROM `Order` ORDER BY createdAt DESC LIMIT 1",
      ),
    { label: "lastOrder" },
  )
  if (!lastOrder) {
    console.log("last order:", JSON.stringify(null))
    return
  }
  const items = await withRetry(
    () =>
      query<{ name: string; qty: number; price: number }>(
        "SELECT name, qty, price FROM OrderItem WHERE orderId = ?",
        [lastOrder.id],
      ),
    { label: "lastOrderItems" },
  )
  console.log(
    "last order:",
    JSON.stringify({
      orderNumber: lastOrder.orderNumber,
      status: lastOrder.status,
      total: lastOrder.total,
      items,
    }),
  )
}

main()
  .catch((err) => {
    console.error("DB-COUNTS FAILED:", err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(() => {
    // mysql2 pool keeps sockets open — close it so the process can exit.
    try {
      void getPool().end()
    } catch {
      // pool never created (e.g. config error) — nothing to close
    }
  })

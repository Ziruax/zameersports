/**
 * Print current row counts for every table + flagship product snapshot.
 * Usage: cd /home/z/my-project && unset DATABASE_URL && bun scripts/db-counts.ts
 * (Sequential + withRetry — the remote MySQL refuses ~60-70% of cold connects.)
 */
import { PrismaClient } from "@prisma/client"
import { withRetry } from "../src/lib/retry"

const db = new PrismaClient({ log: ["error"] })

async function main() {
  const categories = await withRetry(() => db.category.count(), { label: "count:categories" })
  const products = await withRetry(() => db.product.count(), { label: "count:products" })
  const testimonials = await withRetry(() => db.testimonial.count(), { label: "count:testimonials" })
  const settings = await withRetry(() => db.setting.count(), { label: "count:settings" })
  const orders = await withRetry(() => db.order.count(), { label: "count:orders" })
  const reviews = await withRetry(() => db.review.count(), { label: "count:reviews" })
  const admins = await withRetry(() => db.adminUser.count(), { label: "count:admins" })
  const contactMessages = await withRetry(() => db.contactMessage.count(), { label: "count:contactMessages" })
  const subscribers = await withRetry(() => db.subscriber.count(), { label: "count:subscribers" })
  console.log(
    JSON.stringify({
      categories,
      products,
      testimonials,
      settings,
      orders,
      reviews,
      admins,
      contactMessages,
      subscribers,
    }),
  )
  const legend = await withRetry(
    () =>
      db.product.findUnique({
        where: { slug: "zameer-legend-2026" },
        select: { stock: true, sold: true, rating: true, reviewCount: true },
      }),
    { label: "legend" },
  )
  console.log("zameer-legend-2026:", JSON.stringify(legend))
  const lastOrder = await withRetry(
    () =>
      db.order.findFirst({
        orderBy: { createdAt: "desc" },
        select: { orderNumber: true, status: true, total: true, items: { select: { name: true, qty: true, price: true } } },
      }),
    { label: "lastOrder" },
  )
  console.log("last order:", JSON.stringify(lastOrder))
}

main()
  .catch((err) => {
    console.error("DB-COUNTS FAILED:", err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })

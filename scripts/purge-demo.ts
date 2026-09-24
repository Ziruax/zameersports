/**
 * One-off: purge demo/test orders (ZSDEMO*, ZSMUA*) and restore every
 * product's stock/sold counters to the catalog.json seed values, so the
 * store reflects a clean, real state (0 orders, real revenue).
 *
 * Usage: cd /home/z/my-project && unset DATABASE_URL && bun scripts/purge-demo.ts
 */
import { PrismaClient } from "@prisma/client";
import catalog from "../src/data/catalog.json";

const db = new PrismaClient({ log: ["error"] });

async function main() {
  // 1. Delete demo + QA test orders
  const demoOrders = await db.order.findMany({
    where: { orderNumber: { startsWith: "ZSDEMO" } },
    select: { id: true, orderNumber: true },
  });
  const qaOrders = await db.order.findMany({
    where: { orderNumber: { startsWith: "ZSMUA" } },
    select: { id: true, orderNumber: true },
  });
  const ids = [...demoOrders, ...qaOrders].map((o) => o.id);
  if (ids.length > 0) {
    // OrderItem rows cascade on order delete per schema
    await db.order.deleteMany({ where: { id: { in: ids } } });
  }
  console.log(`deleted orders: ${ids.length} (${demoOrders.length} ZSDEMO + ${qaOrders.length} ZSMUA)`);

  // 2. Restore stock/sold to catalog seed values
  const bySlug = new Map(catalog.products.map((p) => [p.slug, p]));
  const products = await db.product.findMany({ select: { id: true, slug: true, stock: true, sold: true } });
  let fixed = 0;
  for (const p of products) {
    const c = bySlug.get(p.slug);
    if (!c) continue;
    if (p.stock !== c.stock || p.sold !== c.sold) {
      await db.product.update({
        where: { id: p.id },
        data: { stock: c.stock, sold: c.sold },
      });
      fixed++;
    }
  }
  console.log(`stock/sold restored on ${fixed} products`);

  // 3. Verify
  const ordersLeft = await db.order.count();
  const revenueRows = await db.order.aggregate({ _sum: { total: true } });
  console.log(`orders remaining: ${ordersLeft}, revenue: Rs ${revenueRows._sum.total ?? 0}`);
}

main()
  .catch((e) => {
    console.error("FAIL:", e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

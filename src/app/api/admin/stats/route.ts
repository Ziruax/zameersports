import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse, firstImage } from "../../_lib/helpers"
import { requireAdmin, unauthorized } from "../_lib/guard"

const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const

/**
 * GET /api/admin/stats — dashboard summary. Single retried transaction:
 * revenue (non-cancelled), counts, status breakdown, 8 most recent orders
 * and up to 5 low-stock products (stock < 5). All figures are real store data.
 */
export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  try {
    const [revenueAgg, ordersCount, productsCount, pendingCount, lowStockCount, subscribersCount, statusGroups, recent, lowStock] =
      await withRetry(
        () =>
          db.$transaction([
            db.order.aggregate({ where: { status: { not: "cancelled" } }, _sum: { total: true } }),
            db.order.count(),
            db.product.count({ where: { active: true } }),
            db.order.count({ where: { status: "pending" } }),
            db.product.count({ where: { stock: { lt: 5 } } }),
            db.subscriber.count(),
            db.order.groupBy({ by: ["status"], _count: { _all: true } }),
            db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
            db.product.findMany({ where: { stock: { lt: 5 } }, orderBy: { stock: "asc" }, take: 5 }),
          ]),
        { label: "admin:stats" },
      )

    const statusCounts: Record<(typeof ORDER_STATUSES)[number], number> = {
      pending: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    }
    for (const g of statusGroups) {
      if ((ORDER_STATUSES as readonly string[]).includes(g.status)) {
        statusCounts[g.status as (typeof ORDER_STATUSES)[number]] = g._count._all
      }
    }

    return NextResponse.json({
      revenue: revenueAgg._sum.total ?? 0,
      ordersCount,
      productsCount,
      pendingCount,
      lowStockCount,
      subscribersCount,
      statusCounts,
      recentOrders: recent.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        phone: o.phone,
        city: o.city,
        total: o.total,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
      })),
      lowStock: lowStock.map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        image: firstImage(p.images),
      })),
    })
  } catch (err) {
    return dbErrorResponse(err, "admin:stats")
  }
}

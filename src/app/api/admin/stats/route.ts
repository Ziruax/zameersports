import { NextResponse } from "next/server"
import type { mysql } from "@/lib/db"
import { withTransaction } from "@/lib/db"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse, firstImage } from "../../_lib/helpers"
import { requireAdmin, unauthorized } from "../_lib/guard"

const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const

/** Typed query on an existing transaction connection. */
async function q<T>(conn: mysql.PoolConnection, sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await conn.query(sql, params)
  return rows as T[]
}

/**
 * GET /api/admin/stats — dashboard summary. Single retried transaction:
 * revenue (non-cancelled), counts, status breakdown, 8 most recent orders
 * and up to 5 low-stock products (stock < 5). All figures are real store data.
 */
export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  try {
    const stats = await withRetry(
      () =>
        withTransaction(async (conn) => {
          const revenueRows = await q<{ revenue: number }>(
            conn,
            "SELECT COALESCE(CAST(SUM(total) AS SIGNED), 0) AS revenue FROM `Order` WHERE status <> 'cancelled'",
          )
          const ordersCountRows = await q<{ cnt: number }>(conn, "SELECT COUNT(*) AS cnt FROM `Order`")
          const productsCountRows = await q<{ cnt: number }>(
            conn,
            "SELECT COUNT(*) AS cnt FROM Product WHERE active = 1",
          )
          const pendingCountRows = await q<{ cnt: number }>(
            conn,
            "SELECT COUNT(*) AS cnt FROM `Order` WHERE status = 'pending'",
          )
          const lowStockCountRows = await q<{ cnt: number }>(
            conn,
            "SELECT COUNT(*) AS cnt FROM Product WHERE stock < 5",
          )
          const subscribersCountRows = await q<{ cnt: number }>(conn, "SELECT COUNT(*) AS cnt FROM Subscriber")
          const statusRows = await q<{ status: string; cnt: number }>(
            conn,
            "SELECT status, COUNT(*) AS cnt FROM `Order` GROUP BY status",
          )
          const recent = await q<{
            id: string
            orderNumber: string
            customerName: string
            phone: string
            city: string
            total: number
            status: string
            createdAt: Date
          }>(
            conn,
            "SELECT id, orderNumber, customerName, phone, city, total, status, createdAt FROM `Order` ORDER BY createdAt DESC LIMIT 8",
          )
          const lowStock = await q<{ id: string; name: string; stock: number; images: string }>(
            conn,
            "SELECT id, name, stock, images FROM Product WHERE stock < 5 ORDER BY stock ASC LIMIT 5",
          )
          return {
            revenue: Number(revenueRows[0]?.revenue ?? 0),
            ordersCount: Number(ordersCountRows[0]?.cnt ?? 0),
            productsCount: Number(productsCountRows[0]?.cnt ?? 0),
            pendingCount: Number(pendingCountRows[0]?.cnt ?? 0),
            lowStockCount: Number(lowStockCountRows[0]?.cnt ?? 0),
            subscribersCount: Number(subscribersCountRows[0]?.cnt ?? 0),
            statusRows,
            recent,
            lowStock,
          }
        }),
      { label: "admin:stats" },
    )

    const statusCounts: Record<(typeof ORDER_STATUSES)[number], number> = {
      pending: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    }
    for (const g of stats.statusRows) {
      if ((ORDER_STATUSES as readonly string[]).includes(g.status)) {
        statusCounts[g.status as (typeof ORDER_STATUSES)[number]] = Number(g.cnt)
      }
    }

    return NextResponse.json({
      revenue: stats.revenue,
      ordersCount: stats.ordersCount,
      productsCount: stats.productsCount,
      pendingCount: stats.pendingCount,
      lowStockCount: stats.lowStockCount,
      subscribersCount: stats.subscribersCount,
      statusCounts,
      recentOrders: stats.recent.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        phone: o.phone,
        city: o.city,
        total: o.total,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
      })),
      lowStock: stats.lowStock.map((p) => ({
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

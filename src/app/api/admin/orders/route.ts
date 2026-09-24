import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import type { OrderItemRow, OrderRow } from "@/lib/db-types"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse } from "../../_lib/helpers"
import { badRequest, requireAdmin, unauthorized } from "../_lib/guard"
import { toAdminOrder } from "../_lib/mappers"
import { ORDER_STATUSES } from "../_lib/schemas"

/**
 * GET /api/admin/orders — paginated order list (latest first) with items included.
 * Query: status (one of the 5 statuses), search (orderNumber/customerName/phone/city
 * contains), page (1), limit (10, max 100). → { items, total, pages, page }
 */
export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  const sp = new URL(req.url).searchParams
  const status = sp.get("status")?.trim() || ""
  const search = sp.get("search")?.trim() || ""
  const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(sp.get("limit") ?? "10", 10) || 10))

  if (status && !(ORDER_STATUSES as readonly string[]).includes(status)) {
    return badRequest("Invalid status filter. Must be one of: pending, confirmed, shipped, delivered, cancelled")
  }

  const conditions: string[] = []
  const params: unknown[] = []
  if (status) {
    conditions.push("status = ?")
    params.push(status)
  }
  if (search) {
    conditions.push("(orderNumber LIKE ? OR customerName LIKE ? OR phone LIKE ? OR city LIKE ?)")
    const like = `%${search}%`
    params.push(like, like, like, like)
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
  const offset = (page - 1) * limit // validated integer — safe to interpolate

  try {
    const { total, rows } = await withRetry(
      async () => {
        const countRows = await query<{ cnt: number }>(
          `SELECT COUNT(*) AS cnt FROM \`Order\` ${where}`,
          params,
        )
        const orders = await query<OrderRow>(
          `SELECT * FROM \`Order\` ${where} ORDER BY createdAt DESC LIMIT ${limit} OFFSET ${offset}`,
          params,
        )
        // Items for exactly this page of orders (mysql2 expands the array for IN).
        const ids = orders.map((o) => o.id)
        const items =
          ids.length > 0
            ? await query<OrderItemRow>("SELECT * FROM OrderItem WHERE orderId IN (?)", [ids])
            : []
        const itemsByOrderId = new Map<string, OrderItemRow[]>()
        for (const item of items) {
          const list = itemsByOrderId.get(item.orderId)
          if (list) list.push(item)
          else itemsByOrderId.set(item.orderId, [item])
        }
        return {
          total: Number(countRows[0]?.cnt ?? 0),
          rows: orders.map((o) => ({ ...o, items: itemsByOrderId.get(o.id) ?? [] })),
        }
      },
      { label: "admin:orders:list" },
    )

    return NextResponse.json({
      items: rows.map(toAdminOrder),
      total,
      pages: Math.ceil(total / limit),
      page,
    })
  } catch (err) {
    return dbErrorResponse(err, "admin:orders:list")
  }
}

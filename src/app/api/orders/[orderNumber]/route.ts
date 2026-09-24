import { query } from "@/lib/db"
import type { OrderItemRow, OrderRow } from "@/lib/db-types"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse, toOrderDTO } from "../../_lib/helpers"

function last10Digits(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10)
}

/**
 * GET /api/orders/[orderNumber]?phone=... — order tracking.
 * Phone is required and must match the order's phone (last 10 digits);
 * mismatch answers 404 so phone numbers can't be probed.
 */
export async function GET(req: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params
  const phone = new URL(req.url).searchParams.get("phone")?.trim() ?? ""

  if (!phone) {
    return Response.json({ error: "phone query parameter is required" }, { status: 400 })
  }

  try {
    /* Prisma findUnique({ include: { items: true } }) → Order + its OrderItems */
    const order = await withRetry(
      async () => {
        const rows = await query<OrderRow>(
          "SELECT * FROM `Order` WHERE orderNumber = ? LIMIT 1",
          [orderNumber],
        )
        const o = rows[0] ?? null
        if (!o) return null
        const items = await query<OrderItemRow>("SELECT * FROM OrderItem WHERE orderId = ?", [o.id])
        return { ...o, items }
      },
      { label: "orders:track" },
    )
    if (!order) {
      return Response.json({ error: "Order not found" }, { status: 404 })
    }
    const orderDigits = last10Digits(order.phone)
    if (!orderDigits || orderDigits !== last10Digits(phone)) {
      return Response.json({ error: "Order not found" }, { status: 404 })
    }
    /* Defensive: updatedAt has no DB default (Prisma set it client-side), so
     * rows written by INSERTs that omit it carry the MySQL zero-date, which
     * parses as an Invalid Date. Treat those as "never updated" (createdAt). */
    if (Number.isNaN(order.updatedAt.getTime())) {
      order.updatedAt = order.createdAt
    }
    /* OrderDTO + updatedAt (extra timeline timestamp for the tracking UI) */
    return Response.json(toOrderDTO(order))
  } catch (err) {
    return dbErrorResponse(err, "orders:track")
  }
}

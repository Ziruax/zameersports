import { db } from "@/lib/db"
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
    const order = await withRetry(
      () => db.order.findUnique({ where: { orderNumber }, include: { items: true } }),
      { label: "orders:track" },
    )
    if (!order) {
      return Response.json({ error: "Order not found" }, { status: 404 })
    }
    const orderDigits = last10Digits(order.phone)
    if (!orderDigits || orderDigits !== last10Digits(phone)) {
      return Response.json({ error: "Order not found" }, { status: 404 })
    }
    /* OrderDTO + updatedAt (extra timeline timestamp for the tracking UI) */
    return Response.json(toOrderDTO(order))
  } catch (err) {
    return dbErrorResponse(err, "orders:track")
  }
}

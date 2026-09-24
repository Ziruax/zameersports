import { NextResponse } from "next/server"
import { execute, query } from "@/lib/db"
import type { OrderItemRow, OrderRow } from "@/lib/db-types"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse } from "../../../_lib/helpers"
import { notFound, readJson, requireAdmin, unauthorized, zodBadRequest } from "../../_lib/guard"
import { toAdminOrder } from "../../_lib/mappers"
import { OrderStatusSchema } from "../../_lib/schemas"

type Params = { params: Promise<{ id: string }> }

/** PATCH /api/admin/orders/[id] — { status } (pending|confirmed|shipped|delivered|cancelled) → { order } */
export async function PATCH(req: Request, { params }: Params) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  const { id } = await params

  const json = await readJson(req)
  if (json instanceof NextResponse) return json

  const parsed = OrderStatusSchema.safeParse(json)
  if (!parsed.success) return zodBadRequest(parsed.error)

  try {
    await withRetry(
      () =>
        execute("UPDATE `Order` SET status = ?, updatedAt = CURRENT_TIMESTAMP(3) WHERE id = ?", [
          parsed.data.status,
          id,
        ]),
      { label: "admin:orders:update" },
    )

    const order = await withRetry(
      () =>
        query<OrderRow>("SELECT * FROM `Order` WHERE id = ? LIMIT 1", [id]).then(
          (rows) => rows[0] ?? null,
        ),
      { label: "admin:orders:get-updated" },
    )
    if (!order) return notFound("Order not found")

    const items = await withRetry(
      () => query<OrderItemRow>("SELECT * FROM OrderItem WHERE orderId = ?", [id]),
      { label: "admin:orders:get-items" },
    )
    return NextResponse.json({ order: toAdminOrder({ ...order, items }) })
  } catch (err) {
    return dbErrorResponse(err, "admin:orders:update")
  }
}

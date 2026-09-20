import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse } from "../../../_lib/helpers"
import { notFound, prismaErrorCode, readJson, requireAdmin, unauthorized, zodBadRequest } from "../../_lib/guard"
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
    const order = await withRetry(
      () => db.order.update({ where: { id }, data: { status: parsed.data.status }, include: { items: true } }),
      { label: "admin:orders:update" },
    )
    return NextResponse.json({ order: toAdminOrder(order) })
  } catch (err) {
    if (prismaErrorCode(err) === "P2025") return notFound("Order not found")
    return dbErrorResponse(err, "admin:orders:update")
  }
}

import type { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
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

  const where: Prisma.OrderWhereInput = {}
  if (status) where.status = status
  if (search) {
    where.OR = [
      { orderNumber: { contains: search } },
      { customerName: { contains: search } },
      { phone: { contains: search } },
      { city: { contains: search } },
    ]
  }

  try {
    const [total, rows] = await withRetry(
      () =>
        db.$transaction([
          db.order.count({ where }),
          db.order.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
            include: { items: true },
          }),
        ]),
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

import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse } from "../../../_lib/helpers"
import {
  badRequest,
  notFound,
  prismaErrorCode,
  readJson,
  requireAdmin,
  unauthorized,
  zodBadRequest,
} from "../../_lib/guard"
import { normalizeCode } from "@/lib/coupon"

type RouteContext = { params: Promise<{ id: string }> }

const CouponUpdateSchema = z
  .object({
    code: z.string().trim().min(3).max(20).optional(),
    type: z.enum(["percent", "fixed"]).optional(),
    value: z.coerce.number().int().min(1).optional(),
    minOrder: z.coerce.number().int().min(0).optional(),
    usageLimit: z.coerce.number().int().min(0).optional(),
    expiresAt: z.union([z.string().trim(), z.literal("")]).optional(),
    active: z.coerce.boolean().optional(),
  })
  .refine((d) => (d.type && d.type === "percent" && d.value ? d.value <= 90 : true), {
    message: "Percent discount cannot be more than 90%",
    path: ["value"],
  })

function serialize(c: {
  id: string
  code: string
  type: string
  value: number
  minOrder: number
  active: boolean
  usageLimit: number
  usedCount: number
  expiresAt: Date | null
  createdAt: Date
}) {
  return {
    id: c.id,
    code: c.code,
    type: c.type,
    value: c.value,
    minOrder: c.minOrder,
    active: c.active,
    usageLimit: c.usageLimit,
    usedCount: c.usedCount,
    expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
  }
}

/** PATCH /api/admin/coupons/[id] — update any coupon field. → { coupon } */
export async function PATCH(req: Request, ctx: RouteContext) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  const json = await readJson(req)
  if (json instanceof NextResponse) return json

  const parsed = CouponUpdateSchema.safeParse(json)
  if (!parsed.success) return zodBadRequest(parsed.error)
  const d = parsed.data
  const { id } = await ctx.params

  const data: Record<string, unknown> = {}
  if (d.code !== undefined) data.code = normalizeCode(d.code)
  if (d.type !== undefined) data.type = d.type
  if (d.value !== undefined) data.value = d.value
  if (d.minOrder !== undefined) data.minOrder = d.minOrder
  if (d.usageLimit !== undefined) data.usageLimit = d.usageLimit
  if (d.active !== undefined) data.active = d.active
  if (d.expiresAt !== undefined) {
    data.expiresAt = d.expiresAt ? new Date(d.expiresAt) : null
  }

  if (Object.keys(data).length === 0) {
    return badRequest("Nothing to update.")
  }

  try {
    const coupon = await withRetry(
      () => db.coupon.update({ where: { id }, data }),
      { label: "admin:coupons:update" },
    )
    return NextResponse.json({ coupon: serialize(coupon) })
  } catch (err) {
    const prisma = prismaErrorCode(err)
    if (prisma === "P2025") return notFound("Coupon not found.")
    if (prisma === "P2002") return badRequest("A coupon with this code already exists.")
    return dbErrorResponse(err, "admin:coupons:update")
  }
}

/** DELETE /api/admin/coupons/[id] → { ok: true } */
export async function DELETE(req: Request, ctx: RouteContext) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  const { id } = await ctx.params
  try {
    await withRetry(() => db.coupon.delete({ where: { id } }), {
      label: "admin:coupons:delete",
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const prisma = prismaErrorCode(err)
    if (prisma === "P2025") return notFound("Coupon not found.")
    return dbErrorResponse(err, "admin:coupons:delete")
  }
}

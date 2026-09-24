import { NextResponse } from "next/server"
import { z } from "zod"
import { execute, isDuplicateEntryError, query } from "@/lib/db"
import type { CouponRow } from "@/lib/db-types"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse } from "../../../_lib/helpers"
import {
  badRequest,
  notFound,
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

function serialize(c: CouponRow) {
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

  // Dynamic SET clause — only the provided fields are written (Coupon has no updatedAt).
  const sets: string[] = []
  const values: unknown[] = []
  if (d.code !== undefined) {
    sets.push("code = ?")
    values.push(normalizeCode(d.code))
  }
  if (d.type !== undefined) {
    sets.push("type = ?")
    values.push(d.type)
  }
  if (d.value !== undefined) {
    sets.push("`value` = ?")
    values.push(d.value)
  }
  if (d.minOrder !== undefined) {
    sets.push("minOrder = ?")
    values.push(d.minOrder)
  }
  if (d.usageLimit !== undefined) {
    sets.push("usageLimit = ?")
    values.push(d.usageLimit)
  }
  if (d.active !== undefined) {
    sets.push("active = ?")
    values.push(d.active)
  }
  if (d.expiresAt !== undefined) {
    sets.push("expiresAt = ?")
    values.push(d.expiresAt ? new Date(d.expiresAt) : null)
  }

  if (sets.length === 0) {
    return badRequest("Nothing to update.")
  }

  try {
    await withRetry(() => execute(`UPDATE Coupon SET ${sets.join(", ")} WHERE id = ?`, [...values, id]), {
      label: "admin:coupons:update",
    })

    const coupon = await withRetry(
      () => query<CouponRow>("SELECT * FROM Coupon WHERE id = ? LIMIT 1", [id]).then((rows) => rows[0] ?? null),
      { label: "admin:coupons:get-updated" },
    )
    if (!coupon) return notFound("Coupon not found.")
    return NextResponse.json({ coupon: serialize(coupon) })
  } catch (err) {
    if (isDuplicateEntryError(err)) return badRequest("A coupon with this code already exists.")
    return dbErrorResponse(err, "admin:coupons:update")
  }
}

/** DELETE /api/admin/coupons/[id] → { ok: true } */
export async function DELETE(req: Request, ctx: RouteContext) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  const { id } = await ctx.params
  try {
    const res = await withRetry(() => execute("DELETE FROM Coupon WHERE id = ?", [id]), {
      label: "admin:coupons:delete",
    })
    if (res.affectedRows === 0) return notFound("Coupon not found.")
    return NextResponse.json({ ok: true })
  } catch (err) {
    return dbErrorResponse(err, "admin:coupons:delete")
  }
}

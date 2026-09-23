import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { withRetry } from "@/lib/retry"
import { dbErrorResponse } from "../../_lib/helpers"
import {
  badRequest,
  prismaErrorCode,
  readJson,
  requireAdmin,
  unauthorized,
  zodBadRequest,
} from "../_lib/guard"
import { normalizeCode } from "@/lib/coupon"

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

export type AdminCoupon = ReturnType<typeof serialize>

/** GET /api/admin/coupons — all coupons, newest first. */
export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  try {
    const rows = await withRetry(
      () => db.coupon.findMany({ orderBy: { createdAt: "desc" } }),
      { label: "admin:coupons:list" },
    )
    return NextResponse.json({ items: rows.map(serialize) })
  } catch (err) {
    return dbErrorResponse(err, "admin:coupons:list")
  }
}

const CouponCreateSchema = z
  .object({
    code: z.string().trim().min(3, "Code must be at least 3 characters").max(20),
    type: z.enum(["percent", "fixed"]),
    value: z.coerce.number().int().min(1, "Value must be at least 1"),
    minOrder: z.coerce.number().int().min(0).default(0),
    usageLimit: z.coerce.number().int().min(0).default(0),
    expiresAt: z.union([z.string().trim(), z.literal("")]).optional(),
    active: z.coerce.boolean().default(true),
  })
  .refine((d) => (d.type === "percent" ? d.value <= 90 : true), {
    message: "Percent discount cannot be more than 90%",
    path: ["value"],
  })

/** POST /api/admin/coupons — create a coupon (code auto-uppercased). → 201 { coupon } */
export async function POST(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return unauthorized()

  const json = await readJson(req)
  if (json instanceof NextResponse) return json

  const parsed = CouponCreateSchema.safeParse(json)
  if (!parsed.success) return zodBadRequest(parsed.error)
  const d = parsed.data

  try {
    const coupon = await withRetry(
      () =>
        db.coupon.create({
          data: {
            code: normalizeCode(d.code),
            type: d.type,
            value: d.value,
            minOrder: d.minOrder,
            usageLimit: d.usageLimit,
            active: d.active,
            expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
          },
        }),
      { label: "admin:coupons:create" },
    )
    return NextResponse.json({ coupon: serialize(coupon) }, { status: 201 })
  } catch (err) {
    const prisma = prismaErrorCode(err)
    if (prisma === "P2002") {
      return badRequest("A coupon with this code already exists.")
    }
    return dbErrorResponse(err, "admin:coupons:create")
  }
}

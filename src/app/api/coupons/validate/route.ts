import { z } from "zod"
import { dbErrorResponse } from "../../_lib/helpers"
import { checkCoupon, couponDenyMessage, couponLabel } from "@/lib/coupon"

const ValidateSchema = z.object({
  code: z.string().trim().min(1, "Enter a coupon code").max(30),
  subtotal: z.coerce.number().int().min(0),
})

/**
 * POST /api/coupons/validate — public checkout coupon check.
 * { code, subtotal } → { ok, code, type, value, discount, label }
 * or 422 { ok: false, error } with a customer-friendly message.
 */
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = ValidateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    )
  }

  try {
    const result = await checkCoupon(parsed.data.code, parsed.data.subtotal)
    if (!result.ok || !result.coupon) {
      return Response.json(
        { ok: false, error: couponDenyMessage(result.reason, result.coupon) },
        { status: 422 },
      )
    }
    return Response.json({
      ok: true,
      code: result.coupon.code,
      type: result.coupon.type,
      value: result.coupon.value,
      discount: result.discount ?? 0,
      label: couponLabel(result.coupon),
    })
  } catch (err) {
    return dbErrorResponse(err, "coupon:validate")
  }
}

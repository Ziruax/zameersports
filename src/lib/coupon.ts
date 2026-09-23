import { db } from "@/lib/db"
import { withRetry } from "@/lib/retry"

/** Coupon shapes used by both the public validate endpoint and admin CRUD. */
export interface CouponRow {
  id: string
  code: string
  type: string
  value: number
  minOrder: number
  active: boolean
  usageLimit: number
  usedCount: number
  expiresAt: Date | null
}

export interface CouponCheck {
  ok: boolean
  reason?: "inactive" | "expired" | "usage" | "minOrder" | "notFound"
  coupon?: CouponRow
  discount?: number
}

/** Normalize a customer-typed code: uppercase, strip spaces. */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "")
}

/** Pure discount math (integers only, never below zero, never above subtotal). */
export function computeDiscount(
  coupon: { type: string; value: number },
  subtotal: number,
): number {
  if (coupon.type === "percent") {
    return Math.min(subtotal, Math.round((subtotal * coupon.value) / 100))
  }
  return Math.min(subtotal, Math.max(0, Math.round(coupon.value)))
}

/** Human label like "10% OFF" or "Rs 500 OFF". */
export function couponLabel(coupon: { type: string; value: number }): string {
  return coupon.type === "percent" ? `${coupon.value}% OFF` : `Rs ${coupon.value} OFF`
}

/**
 * Validate a coupon code against a subtotal (server-side, authoritative).
 * Returns the coupon row + computed discount, or a machine reason.
 */
export async function checkCoupon(code: string, subtotal: number): Promise<CouponCheck> {
  const normalized = normalizeCode(code)
  if (!normalized) return { ok: false, reason: "notFound" }

  const coupon = await withRetry(
    () => db.coupon.findUnique({ where: { code: normalized } }),
    { label: "coupon:check" },
  )
  if (!coupon) return { ok: false, reason: "notFound" }
  if (!coupon.active) return { ok: false, reason: "inactive", coupon }
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "expired", coupon }
  }
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, reason: "usage", coupon }
  }
  if (subtotal < coupon.minOrder) {
    return { ok: false, reason: "minOrder", coupon }
  }
  return { ok: true, coupon, discount: computeDiscount(coupon, subtotal) }
}

/** English message for each rejection reason (customer-facing). */
export function couponDenyMessage(reason: CouponCheck["reason"], coupon?: CouponRow): string {
  switch (reason) {
    case "notFound":
      return "This coupon code is not valid."
    case "inactive":
      return "This coupon is no longer active."
    case "expired":
      return "This coupon has expired."
    case "usage":
      return "This coupon has reached its usage limit."
    case "minOrder":
      return `This coupon needs a minimum order of Rs ${coupon?.minOrder.toLocaleString("en-PK") ?? ""}.`
    default:
      return "Coupon could not be applied."
  }
}

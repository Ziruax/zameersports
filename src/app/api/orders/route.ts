import { Prisma } from "@prisma/client"
import { z } from "zod"
import { db } from "@/lib/db"
import { cacheInvalidate } from "@/lib/cache"
import { getSettings, getShippingInfo } from "@/lib/settings"
import { withRetry } from "@/lib/retry"
import { checkCoupon } from "@/lib/coupon"
import { dbErrorResponse, firstImage } from "../_lib/helpers"

const PHONE_RE = /^[0-9+\-\s]{10,15}$/

const OrderItemSchema = z.object({
  productId: z.string().min(1, "productId is required"),
  qty: z.coerce.number().int().min(1, "Quantity must be at least 1").max(10, "Maximum 10 per item"),
})

const OrderSchema = z.object({
  customerName: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  phone: z.string().trim().regex(PHONE_RE, "Invalid phone number (10-15 digits)"),
  email: z.union([z.email("Invalid email address"), z.literal("")]).optional(),
  address: z.string().trim().min(8, "Address must be at least 8 characters").max(500),
  city: z.string().trim().min(2, "City must be at least 2 characters").max(60),
  notes: z.string().trim().max(500).optional(),
  items: z.array(OrderItemSchema).min(1, "Order must contain at least 1 item").max(20),
  couponCode: z.string().trim().max(30).optional(),
})

/**
 * POST /api/orders — place a COD order.
 * Prices/names/images come from the DB (never the client). Atomic transaction:
 * order + item snapshots + stock decrement + sold increment.
 */
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = OrderSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid input",
        issues: parsed.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`),
      },
      { status: 400 },
    )
  }
  const { customerName, phone, address, city, items } = parsed.data
  const email = parsed.data.email || ""
  const notes = parsed.data.notes || ""

  try {
    /* aggregate quantities per product (same product may appear on multiple lines) */
    const qtyById = new Map<string, number>()
    for (const it of items) qtyById.set(it.productId, (qtyById.get(it.productId) ?? 0) + it.qty)
    const ids = [...qtyById.keys()]

    /* authoritative product data from DB */
    const products = await withRetry(
      () =>
        db.product.findMany({
          where: { id: { in: ids }, active: true },
          select: { id: true, name: true, price: true, stock: true, images: true },
        }),
      { label: "orders:fetch-products" },
    )
    const byId = new Map(products.map((p) => [p.id, p]))

    const lineItems: { productId: string; name: string; price: number; qty: number; image: string }[] = []
    for (const it of items) {
      const p = byId.get(it.productId)
      if (!p) {
        return Response.json({ error: "One of the products is no longer available." }, { status: 400 })
      }
      const totalQty = qtyById.get(it.productId) ?? it.qty
      if (p.stock < totalQty) {
        return Response.json(
          { error: `Only ${p.stock} left in stock for "${p.name}" (requested ${totalQty}).` },
          { status: 400 },
        )
      }
      lineItems.push({ productId: p.id, name: p.name, price: p.price, qty: it.qty, image: firstImage(p.images) })
    }

    /* totals from settings */
    const settings = await getSettings()
    const { threshold, fee } = getShippingInfo(settings)
    const subtotal = lineItems.reduce((s, i) => s + i.price * i.qty, 0)
    const shipping = subtotal >= threshold ? 0 : fee

    /* coupon (server-side re-validation, authoritative) */
    let discount = 0
    let couponCode = ""
    let couponId: string | null = null
    if (parsed.data.couponCode) {
      const check = await checkCoupon(parsed.data.couponCode, subtotal)
      if (!check.ok || !check.coupon) {
        return Response.json(
          { error: `Coupon "${parsed.data.couponCode.trim().toUpperCase()}" could not be applied. Please remove it and try again.` },
          { status: 400 },
        )
      }
      discount = check.discount ?? 0
      couponCode = check.coupon.code
      couponId = check.coupon.id
    }
    const total = Math.max(0, subtotal - discount) + shipping

    const orderNumber = "ZS" + Date.now().toString(36).toUpperCase() + Math.floor(10 + Math.random() * 90)

    try {
      await withRetry(
        () =>
          db.$transaction(
            async (tx) => {
              await tx.order.create({
                data: {
                  orderNumber,
                  customerName,
                  phone,
                  email,
                  address,
                  city,
                  notes,
                  subtotal,
                  discount,
                  couponCode,
                  shipping,
                  total,
                  paymentMethod: "cod",
                  status: "pending",
                  items: { create: lineItems },
                },
              })
              for (const [id, qty] of qtyById) {
                await tx.product.updateMany({
                  where: { id },
                  data: { stock: { decrement: qty }, sold: { increment: qty } },
                })
              }
              if (couponId) {
                await tx.coupon.update({
                  where: { id: couponId },
                  data: { usedCount: { increment: 1 } },
                })
              }
            },
            /* Remote shared-hosting MySQL is slow; the default 5s interactive
             * timeout expires mid-commit and surfaces as "Transaction already
             * closed". 30s headroom keeps the atomic order write reliable. */
            { timeout: 30_000, maxWait: 15_000 },
          ),
        { label: "orders:create" },
      )
    } catch (txErr) {
      /* Rare double-commit: transaction committed but the connection dropped before
       * the ack → the retry re-ran create and hit the orderNumber unique constraint.
       * Treat as success and return the already-persisted order's totals. */
      if (txErr instanceof Prisma.PrismaClientKnownRequestError && txErr.code === "P2002") {
        const existing = await withRetry(
          () =>
            db.order.findUnique({
              where: { orderNumber },
              select: { orderNumber: true, subtotal: true, discount: true, shipping: true, total: true },
            }),
          { label: "orders:find-existing" },
        )
        if (existing) {
          return Response.json(
            { orderNumber: existing.orderNumber, subtotal: existing.subtotal, discount: existing.discount, shipping: existing.shipping, total: existing.total },
            { status: 201 },
          )
        }
      }
      throw txErr
    }

    cacheInvalidate("products")
    return Response.json({ orderNumber, subtotal, discount, shipping, total }, { status: 201 })
  } catch (err) {
    return dbErrorResponse(err, "orders:create")
  }
}

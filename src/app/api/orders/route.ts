import { z } from "zod"
import { isDuplicateEntryError, newId, query, withTransaction } from "@/lib/db"
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

/** Thrown inside the order transaction when stock ran out between check and write. */
class StockChangedError extends Error {}

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
        query<{ id: string; name: string; price: number; stock: number; images: string }>(
          "SELECT id, name, price, stock, images FROM Product WHERE active = 1 AND id IN (?)",
          [ids],
        ),
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
          withTransaction(async (conn) => {
            const orderId = newId()
            await conn.query(
              "INSERT INTO `Order` (id, orderNumber, customerName, phone, email, address, city, notes, subtotal, discount, couponCode, shipping, total, paymentMethod, status, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP(3))",
              [orderId, orderNumber, customerName, phone, email, address, city, notes, subtotal, discount, couponCode, shipping, total, "cod", "pending"],
            )
            for (const item of lineItems) {
              await conn.query(
                "INSERT INTO OrderItem (id, orderId, productId, name, price, qty, image) VALUES (?,?,?,?,?,?,?)",
                [newId(), orderId, item.productId, item.name, item.price, item.qty, item.image],
              )
            }
            for (const [id, qty] of qtyById) {
              const [res] = await conn.query(
                "UPDATE Product SET stock = stock - ?, sold = sold + ?, updatedAt = CURRENT_TIMESTAMP(3) WHERE id = ? AND stock >= ?",
                [qty, qty, id, qty],
              )
              if ((res as { affectedRows: number }).affectedRows !== 1) {
                throw new StockChangedError(`Stock changed for a product in your cart. Please review your cart and try again.`)
              }
            }
            if (couponId) {
              await conn.query("UPDATE Coupon SET usedCount = usedCount + 1 WHERE id = ?", [couponId])
            }
          }),
        { label: "orders:create" },
      )
    } catch (txErr) {
      /* Rare double-commit: transaction committed but the connection dropped before
       * the ack → the retry re-ran the INSERT and hit the orderNumber unique key.
       * Treat as success and return the already-persisted order's totals. */
      if (isDuplicateEntryError(txErr)) {
        const existing = await withRetry(
          () =>
            query<{ orderNumber: string; subtotal: number; discount: number; shipping: number; total: number }>(
              "SELECT orderNumber, subtotal, discount, shipping, total FROM `Order` WHERE orderNumber = ? LIMIT 1",
              [orderNumber],
            ).then((rows) => rows[0] ?? null),
          { label: "orders:find-existing" },
        )
        if (existing) {
          return Response.json(
            { orderNumber: existing.orderNumber, subtotal: existing.subtotal, discount: existing.discount, shipping: existing.shipping, total: existing.total },
            { status: 201 },
          )
        }
      }
      if (txErr instanceof StockChangedError) {
        return Response.json({ error: txErr.message }, { status: 400 })
      }
      throw txErr
    }

    cacheInvalidate("products")
    return Response.json({ orderNumber, subtotal, discount, shipping, total }, { status: 201 })
  } catch (err) {
    return dbErrorResponse(err, "orders:create")
  }
}

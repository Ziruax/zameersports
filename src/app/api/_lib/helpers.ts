/**
 * Shared helpers for /api route handlers: DTO mappers for JSON columns and a
 * uniform error responder (503 on transient DB failure after retries, 500
 * otherwise). Private folder — not routable.
 */
import type { Category, Order, OrderItem, Product, Review, Testimonial } from "@prisma/client"
import type { CategoryDTO, OrderDTO, OrderItemDTO, ProductListItem, ReviewDTO, TestimonialDTO } from "@/lib/types"
import { isTransientDbError } from "@/lib/retry"

/** Safely parse the images JSON column → first image ("" when missing). */
export function firstImage(imagesJson: string): string {
  try {
    const arr: unknown = JSON.parse(imagesJson)
    return Array.isArray(arr) && arr.length > 0 ? String(arr[0]) : ""
  } catch {
    return ""
  }
}

/** Safely parse the images JSON column → string[]. */
export function parseImages(imagesJson: string): string[] {
  try {
    const arr: unknown = JSON.parse(imagesJson)
    return Array.isArray(arr) ? arr.map((x) => String(x)) : []
  } catch {
    return []
  }
}

/** Safely parse the specs JSON column → Record<string, string>. */
export function parseSpecs(specsJson: string): Record<string, string> {
  try {
    const obj: unknown = JSON.parse(specsJson)
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      const out: Record<string, string> = {}
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) out[k] = String(v)
      return out
    }
    return {}
  } catch {
    return {}
  }
}

/** Split the comma-separated tags column → string[]. */
export function parseTags(tags: string): string[] {
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
}

/** Map a Prisma Product row → ProductListItem DTO (types.ts shape, exact). */
export function toListItem(p: Product): ProductListItem {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    comparePrice: p.comparePrice,
    image: firstImage(p.images),
    rating: p.rating,
    reviewCount: p.reviewCount,
    badge: p.badge,
    stock: p.stock,
    brand: p.brand,
    isNew: p.isNew,
    categoryId: p.categoryId,
    sold: p.sold,
  }
}

/** Map a Prisma Category row (+ pre-computed product count) → CategoryDTO. */
export function toCategoryDTO(c: Category, productCount: number): CategoryDTO {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    image: c.image,
    icon: c.icon,
    featured: c.featured,
    sortOrder: c.sortOrder,
    productCount,
  }
}

/** Map a Prisma Testimonial row → TestimonialDTO. */
export function toTestimonialDTO(t: Testimonial): TestimonialDTO {
  return { id: t.id, name: t.name, location: t.location, text: t.text, rating: t.rating, image: t.image }
}

/** Map a Prisma Review row → ReviewDTO (createdAt as ISO string). */
export function toReviewDTO(r: Review): ReviewDTO {
  return {
    id: r.id,
    name: r.name,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
  }
}

/** Map a Prisma Order (+ items) → OrderDTO (ISO timestamps). */
export function toOrderDTO(o: Order & { items: OrderItem[] }): OrderDTO & { updatedAt: string } {
  return {
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    phone: o.phone,
    email: o.email,
    address: o.address,
    city: o.city,
    notes: o.notes,
    subtotal: o.subtotal,
    shipping: o.shipping,
    total: o.total,
    paymentMethod: o.paymentMethod,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    items: o.items.map((i): OrderItemDTO => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, image: i.image })),
  }
}

/** Uniform DB-error responder: 503 for transient failures, 500 otherwise. */
export function dbErrorResponse(err: unknown, label: string): Response {
  if (isTransientDbError(err)) {
    console.error(`[api:${label}] transient DB failure after retries:`, err instanceof Error ? err.message : err)
    return Response.json({ error: "Database temporarily unreachable. Please try again." }, { status: 503 })
  }
  console.error(`[api:${label}]`, err)
  return Response.json({ error: "Internal server error." }, { status: 500 })
}

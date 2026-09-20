import type { Category, ContactMessage, Order, OrderItem, Product, Review } from "@prisma/client"
import { firstImage, parseImages, parseSpecs, parseTags, toCategoryDTO } from "../../_lib/helpers"

/**
 * Admin-specific DTO mappers (fuller than the public storefront DTOs).
 * Private folder — not routable.
 */

type ProductWithCategory = Product & { category: { id: string; name: string } | null }
type ReviewWithProduct = Review & { product: { name: string } | null }
type OrderWithItems = Order & { items: OrderItem[] }

export interface AdminProductRow {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  stock: number
  brand: string
  image: string
  badge: string
  featured: boolean
  isNew: boolean
  active: boolean
  categoryName: string
  categoryId: string
  sold: number
  rating: number
  reviewCount: number
  createdAt: string
}

/** Product row for the admin products table (all fields, no heavy JSON blobs). */
export function toAdminProductRow(p: ProductWithCategory): AdminProductRow {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    comparePrice: p.comparePrice,
    stock: p.stock,
    brand: p.brand,
    image: firstImage(p.images),
    badge: p.badge,
    featured: p.featured,
    isNew: p.isNew,
    active: p.active,
    categoryName: p.category?.name ?? "",
    categoryId: p.categoryId,
    sold: p.sold,
    rating: p.rating,
    reviewCount: p.reviewCount,
    createdAt: p.createdAt.toISOString(),
  }
}

export interface AdminProductFull extends AdminProductRow {
  sku: string
  description: string
  images: string[]
  tags: string[]
  specs: Record<string, string>
  updatedAt: string
}

/** Full product payload (create/update responses): parsed images/specs/tags included. */
export function toAdminProductFull(p: ProductWithCategory): AdminProductFull {
  return {
    ...toAdminProductRow(p),
    sku: p.sku,
    description: p.description,
    images: parseImages(p.images),
    tags: parseTags(p.tags),
    specs: parseSpecs(p.specs),
    updatedAt: p.updatedAt.toISOString(),
  }
}

export interface AdminOrderItem {
  id: string
  productId: string | null
  name: string
  price: number
  qty: number
  image: string
}

export interface AdminOrder {
  id: string
  orderNumber: string
  customerName: string
  phone: string
  email: string
  address: string
  city: string
  notes: string
  subtotal: number
  shipping: number
  total: number
  paymentMethod: string
  status: string
  itemCount: number
  createdAt: string
  updatedAt: string
  items: AdminOrderItem[]
}

/** Order + item snapshots for the admin orders table / detail view. */
export function toAdminOrder(o: OrderWithItems): AdminOrder {
  return {
    id: o.id,
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
    itemCount: o.items.length,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    items: o.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      name: i.name,
      price: i.price,
      qty: i.qty,
      image: i.image,
    })),
  }
}

export interface AdminReview {
  id: string
  productId: string
  productName: string
  name: string
  rating: number
  comment: string
  approved: boolean
  createdAt: string
}

export function toAdminReview(r: ReviewWithProduct): AdminReview {
  return {
    id: r.id,
    productId: r.productId,
    productName: r.product?.name ?? "",
    name: r.name,
    rating: r.rating,
    comment: r.comment,
    approved: r.approved,
    createdAt: r.createdAt.toISOString(),
  }
}

export interface AdminMessage {
  id: string
  name: string
  email: string
  phone: string
  subject: string
  message: string
  read: boolean
  createdAt: string
}

export function toAdminMessage(m: ContactMessage): AdminMessage {
  return {
    id: m.id,
    name: m.name,
    email: m.email,
    phone: m.phone,
    subject: m.subject,
    message: m.message,
    read: m.read,
    createdAt: m.createdAt.toISOString(),
  }
}

export type AdminCategory = ReturnType<typeof toAdminCategory>

/** Category row for admin (productCount includes inactive products — blocks deletion). */
export function toAdminCategory(c: Category & { _count: { products: number } }) {
  return toCategoryDTO(c, c._count.products)
}

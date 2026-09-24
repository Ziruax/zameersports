/**
 * Row types for the raw MySQL data layer (mysql2).
 *
 * These mirror the Prisma schema (prisma/schema.prisma) exactly — same table
 * and column names, since the tables were created by `prisma db push`.
 * Table names equal the model names (Category, Product, `Order`, ...).
 *
 * Booleans: the pool in src/lib/db.ts casts TINYINT(1) columns to real JS
 * booleans via typeCast, so boolean fields are typed `boolean` here.
 * Timestamps: DATETIME(3) columns arrive as JS Date objects (UTC).
 */

export interface CategoryRow {
  id: string
  name: string
  slug: string
  description: string
  image: string
  icon: string
  featured: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface ProductRow {
  id: string
  name: string
  slug: string
  sku: string
  brand: string
  description: string
  price: number
  comparePrice: number | null
  stock: number
  /** JSON-encoded string[] — parse with parseImages() from api/_lib/helpers */
  images: string
  categoryId: string
  rating: number
  reviewCount: number
  featured: boolean
  isNew: boolean
  badge: string
  /** comma-separated string — parse with parseTags() */
  tags: string
  /** JSON-encoded Record<string, string> — parse with parseSpecs() */
  specs: string
  sold: number
  active: boolean
  metaTitle: string
  metaDescription: string
  createdAt: Date
  updatedAt: Date
}

export interface OrderRow {
  id: string
  orderNumber: string
  customerName: string
  phone: string
  email: string
  address: string
  city: string
  notes: string
  subtotal: number
  discount: number
  couponCode: string
  shipping: number
  total: number
  paymentMethod: string
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface OrderItemRow {
  id: string
  orderId: string
  productId: string | null
  name: string
  price: number
  qty: number
  image: string
}

export interface CouponRow {
  id: string
  code: string
  /** "percent" | "fixed" */
  type: string
  value: number
  minOrder: number
  active: boolean
  usageLimit: number
  usedCount: number
  expiresAt: Date | null
  createdAt: Date
}

export interface ReviewRow {
  id: string
  productId: string
  name: string
  rating: number
  comment: string
  approved: boolean
  createdAt: Date
}

export interface ContactMessageRow {
  id: string
  name: string
  email: string
  phone: string
  subject: string
  message: string
  read: boolean
  createdAt: Date
}

export interface SubscriberRow {
  id: string
  email: string
  createdAt: Date
}

export interface TestimonialRow {
  id: string
  name: string
  location: string
  text: string
  rating: number
  image: string
  featured: boolean
}

export interface AdminUserRow {
  id: string
  email: string
  passwordHash: string
  name: string
  createdAt: Date
}

export interface SettingRow {
  /** column name `key` is a MySQL reserved word — always backtick it in SQL */
  key: string
  value: string
}

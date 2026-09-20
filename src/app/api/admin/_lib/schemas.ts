import { z } from "zod"
import { SLUG_RE } from "./slug"

/**
 * Shared zod schemas for admin product/category endpoints.
 * Private folder — not routable.
 */

export const BADGES = ["", "Best Seller", "New", "Flagship", "Sale", "Hot"] as const

export const ProductCreateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  slug: z
    .string()
    .trim()
    .max(140)
    .regex(SLUG_RE, "Slug may only contain lowercase letters, numbers and hyphens")
    .optional(),
  brand: z.string().trim().max(80).optional(),
  description: z.string().trim().max(5000).optional(),
  categoryId: z.string().min(1, "categoryId is required"),
  price: z.number().int("price must be a whole number").positive("price must be greater than 0"),
  comparePrice: z.number().int().positive("comparePrice must be greater than 0").nullable().optional(),
  stock: z.number().int().min(0, "stock cannot be negative"),
  images: z.array(z.string().trim().min(1, "images must be non-empty strings")).max(10).optional(),
  badge: z.enum(BADGES).optional(),
  featured: z.boolean().optional(),
  isNew: z.boolean().optional(),
  active: z.boolean().optional(),
  tags: z.array(z.string().trim().min(1)).max(20).optional(),
  specs: z.record(z.string().min(1), z.string()).optional(),
})

/** PATCH payload: every create field is optional (comparePrice also accepts null to clear). */
export const ProductUpdateSchema = ProductCreateSchema.partial()

export const CategoryCreateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  slug: z
    .string()
    .trim()
    .max(120)
    .regex(SLUG_RE, "Slug may only contain lowercase letters, numbers and hyphens")
    .optional(),
  description: z.string().trim().max(1000).optional(),
  image: z.string().trim().max(500).optional(),
  icon: z.string().trim().max(50).optional(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().min(0, "sortOrder must be 0-999").max(999).optional(),
})

export const CategoryUpdateSchema = CategoryCreateSchema.partial()

export const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const

export const OrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES, "status must be one of: pending, confirmed, shipped, delivered, cancelled"),
})

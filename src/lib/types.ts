/** Shared DTO types between server (prisma queries) and storefront client. */

export interface CategoryDTO {
  id: string
  slug: string
  name: string
  description: string
  image: string
  icon: string
  featured: boolean
  sortOrder: number
  productCount: number
}

export interface ProductListItem {
  id: string
  slug: string
  name: string
  price: number
  comparePrice: number | null
  image: string
  rating: number
  reviewCount: number
  badge: string
  stock: number
  brand: string
  isNew: boolean
  categoryId: string
  sold: number
}

export interface ProductDetail extends ProductListItem {
  sku: string
  description: string
  images: string[]
  specs: Record<string, string>
  tags: string[]
  featured: boolean
  categoryName: string
  categorySlug: string
  related: ProductListItem[]
}

export interface ProductsResponse {
  items: ProductListItem[]
  total: number
  pages: number
}

export interface TestimonialDTO {
  id: string
  name: string
  location: string
  text: string
  rating: number
  image: string
}

export interface ReviewDTO {
  id: string
  name: string
  rating: number
  comment: string
  createdAt: string
}

export interface OrderItemDTO {
  id: string
  name: string
  price: number
  qty: number
  image: string
}

export interface OrderDTO {
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
  createdAt: string
  items: OrderItemDTO[]
}

export interface StoreInitialData {
  categories: CategoryDTO[]
  featured: ProductsResponse
  testimonials: TestimonialDTO[]
  settings: Record<string, string>
}

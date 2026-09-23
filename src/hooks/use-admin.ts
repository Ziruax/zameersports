"use client";

/**
 * TanStack Query hooks + DTOs for the admin dashboard (/api/admin/*).
 * All requests go through the same-origin fetch wrapper (cookies flow automatically).
 */

import { useEffect, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";

/* ---------------------------------- DTOs ---------------------------------- */

export interface AdminIdentity {
  email: string;
  name: string;
}

export interface AdminMeResponse {
  admin: AdminIdentity;
}

export interface AdminStats {
  revenue: number;
  ordersCount: number;
  productsCount: number;
  pendingCount: number;
  lowStockCount: number;
  subscribersCount: number;
  statusCounts: {
    pending: number;
    confirmed: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  recentOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    phone: string;
    city: string;
    total: number;
    status: string;
    createdAt: string;
  }[];
  lowStock: { id: string; name: string; stock: number; image: string }[];
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice: number | null;
  stock: number;
  brand: string;
  image: string;
  badge: string;
  featured: boolean;
  isNew: boolean;
  active: boolean;
  categoryName: string;
  categoryId: string;
  sold: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
}

export interface AdminProductFull extends AdminProduct {
  sku: string;
  description: string;
  images: string[];
  tags: string[];
  specs: Record<string, string>;
  updatedAt: string;
}

export interface AdminProductsResponse {
  items: AdminProduct[];
  total: number;
  pages: number;
  page: number;
}

export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  icon: string;
  featured: boolean;
  sortOrder: number;
  productCount: number;
}

export interface AdminOrderItem {
  id: string;
  productId: string | null;
  name: string;
  price: number;
  qty: number;
  image: string;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  notes: string;
  subtotal: number;
  discount: number;
  couponCode: string;
  shipping: number;
  total: number;
  paymentMethod: string;
  status: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  items: AdminOrderItem[];
}

export interface AdminOrdersResponse {
  items: AdminOrder[];
  total: number;
  pages: number;
  page: number;
}

export interface AdminReview {
  id: string;
  productId: string;
  productName: string;
  name: string;
  rating: number;
  comment: string;
  approved: boolean;
  createdAt: string;
}

export interface AdminMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface AdminSubscriber {
  id: string;
  email: string;
  createdAt: string;
}

export type AdminProductInput = {
  name?: string;
  slug?: string;
  categoryId?: string;
  price?: number;
  stock?: number;
  brand?: string;
  description?: string;
  comparePrice?: number | null;
  images?: string[];
  badge?: string;
  featured?: boolean;
  isNew?: boolean;
  active?: boolean;
  tags?: string[];
  specs?: Record<string, string>;
  metaTitle?: string;
  metaDescription?: string;
};

export type AdminCategoryInput = {
  name?: string;
  slug?: string;
  description?: string;
  image?: string;
  icon?: string;
  featured?: boolean;
  sortOrder?: number;
};

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PRODUCT_BADGES = [
  "Best Seller",
  "New",
  "Flagship",
  "Sale",
  "Hot",
] as const;

/* -------------------------------- Constants -------------------------------- */

const LIMIT = 10;

/* --------------------------------- Helpers --------------------------------- */

/** Human message for API errors shown in admin toasts / error states. */
export function adminErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 503) return "Database hiccup — retry";
    if (error.status === 401) return "Session expired — please sign in again.";
    return error.message;
  }
  return "Something went wrong — please try again.";
}

/** Debounce a rapidly-changing value (search inputs). */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/* ------------------------------- Session hooks ------------------------------ */

export function useAdminMe() {
  return useQuery({
    queryKey: ["admin", "me"],
    queryFn: () => api<AdminMeResponse>("/api/admin/me"),
    retry: false,
  });
}

export function useAdminLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      api<{ ok: boolean; admin: AdminIdentity }>("/api/admin/login", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useAdminLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<{ ok: boolean }>("/api/admin/logout", { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

/* -------------------------------- Stats hook ------------------------------- */

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => api<AdminStats>("/api/admin/stats"),
  });
}

/* -------------------------------- Products --------------------------------- */

export interface AdminProductsParams {
  search?: string;
  category?: string;
  page?: number;
}

export function useAdminProducts(params: AdminProductsParams = {}) {
  const search = (params.search ?? "").trim();
  const category = params.category ?? "all";
  const page = Math.max(1, params.page ?? 1);
  return useQuery({
    queryKey: ["admin", "products", { search, category, page }],
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search) qs.set("search", search);
      if (category !== "all") qs.set("category", category);
      return api<AdminProductsResponse>(`/api/admin/products?${qs.toString()}`);
    },
    placeholderData: keepPreviousData,
  });
}

/**
 * Full product detail for the edit dialog, fetched by id from the admin API
 * (works for inactive products too, unlike the public product endpoint).
 */
export function useAdminProductDetail(id: string | null) {
  return useQuery({
    queryKey: ["admin", "product", id],
    queryFn: async () =>
      (await api<{ product: AdminProductFull }>(`/api/admin/products/${id ?? ""}`))
        .product,
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
  });
}

/**
 * Duplicate a product: fetches the full record by id, then creates a copy
 * named "… (Copy)" as a hidden draft (active: false) with a fresh auto slug,
 * so the owner can review it before it goes live in the shop.
 */
export function useAdminProductDuplicate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const source = (
        await api<{ product: AdminProductFull }>(`/api/admin/products/${id}`)
      ).product;
      const data: AdminProductInput = {
        name: `${source.name} (Copy)`.slice(0, 120),
        brand: source.brand,
        categoryId: source.categoryId,
        price: source.price,
        comparePrice: source.comparePrice,
        stock: source.stock,
        badge: source.badge,
        description: source.description,
        images: source.images,
        tags: source.tags,
        specs: source.specs,
        metaTitle: source.metaTitle,
        metaDescription: source.metaDescription,
        featured: false,
        isNew: false,
        active: false,
      };
      return api<{ product: AdminProductFull }>("/api/admin/products", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "products"] });
      void qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useAdminProductSave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: AdminProductInput }) =>
      id
        ? api<{ product: AdminProductFull }>(`/api/admin/products/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
          })
        : api<{ product: AdminProductFull }>("/api/admin/products", {
            method: "POST",
            body: JSON.stringify(data),
          }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "products"] });
      void qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      void qc.invalidateQueries({ queryKey: ["products"] });
      void qc.invalidateQueries({ queryKey: ["product"] });
    },
  });
}

export function useAdminProductDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ ok: boolean }>(`/api/admin/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "products"] });
      void qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      void qc.invalidateQueries({ queryKey: ["products"] });
      void qc.invalidateQueries({ queryKey: ["product"] });
    },
  });
}

/* ------------------------------- Categories -------------------------------- */

export function useAdminCategories() {
  return useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () =>
      (await api<{ items: AdminCategory[] }>("/api/admin/categories")).items,
  });
}

export function useAdminCategorySave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: AdminCategoryInput }) =>
      id
        ? api<{ category: AdminCategory }>(`/api/admin/categories/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
          })
        : api<{ category: AdminCategory }>("/api/admin/categories", {
            method: "POST",
            body: JSON.stringify(data),
          }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      void qc.invalidateQueries({ queryKey: ["admin", "products"] });
      void qc.invalidateQueries({ queryKey: ["categories"] });
      void qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useAdminCategoryDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ ok: boolean }>(`/api/admin/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      void qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

/* --------------------------------- Coupons --------------------------------- */

export interface AdminCoupon {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  minOrder: number;
  active: boolean;
  usageLimit: number;
  usedCount: number;
  expiresAt: string | null;
  createdAt: string;
}

export interface AdminCouponInput {
  code: string;
  type: "percent" | "fixed";
  value: number;
  minOrder: number;
  usageLimit: number;
  expiresAt?: string;
  active: boolean;
}

export function useAdminCoupons() {
  return useQuery({
    queryKey: ["admin", "coupons"],
    queryFn: async () =>
      (await api<{ items: AdminCoupon[] }>("/api/admin/coupons")).items,
  });
}

export function useAdminCouponSave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<AdminCouponInput> }) =>
      id
        ? api<{ coupon: AdminCoupon }>(`/api/admin/coupons/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
          })
        : api<{ coupon: AdminCoupon }>("/api/admin/coupons", {
            method: "POST",
            body: JSON.stringify(data),
          }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
    },
  });
}

export function useAdminCouponDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ ok: boolean }>(`/api/admin/coupons/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
    },
  });
}

/* --------------------------------- Orders ---------------------------------- */

export interface AdminOrdersParams {
  status?: string;
  search?: string;
  page?: number;
}

export function useAdminOrders(params: AdminOrdersParams = {}) {
  const status = params.status ?? "all";
  const search = (params.search ?? "").trim();
  const page = Math.max(1, params.page ?? 1);
  return useQuery({
    queryKey: ["admin", "orders", { status, search, page }],
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (status !== "all") qs.set("status", status);
      if (search) qs.set("search", search);
      return api<AdminOrdersResponse>(`/api/admin/orders?${qs.toString()}`);
    },
    placeholderData: keepPreviousData,
  });
}

export function useAdminOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api<{ order: AdminOrder }>(`/api/admin/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      void qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

/* --------------------------------- Reviews --------------------------------- */

export function useAdminReviews(filter?: "approved" | "unapproved") {
  return useQuery({
    queryKey: ["admin", "reviews", filter ?? "all"],
    queryFn: () => {
      const qs =
        filter === "approved"
          ? "?approved=true"
          : filter === "unapproved"
            ? "?approved=false"
            : "";
      return api<{ items: AdminReview[] }>(`/api/admin/reviews${qs}`);
    },
  });
}

export function useAdminReviewModerate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
      api<{ ok: boolean; review: AdminReview }>(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ approved }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
      void qc.invalidateQueries({ queryKey: ["products"] });
      void qc.invalidateQueries({ queryKey: ["product"] });
    },
  });
}

export function useAdminReviewDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ ok: boolean }>(`/api/admin/reviews/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
      void qc.invalidateQueries({ queryKey: ["products"] });
      void qc.invalidateQueries({ queryKey: ["product"] });
    },
  });
}

/* --------------------------------- Messages -------------------------------- */

export function useAdminMessages() {
  return useQuery({
    queryKey: ["admin", "messages"],
    queryFn: async () =>
      (await api<{ items: AdminMessage[] }>("/api/admin/messages")).items,
  });
}

export type AdminMessageActionKind = "read" | "unread" | "delete";

export function useAdminMessageAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: AdminMessageActionKind }) => {
      if (action === "delete") {
        return api<{ ok: boolean }>(`/api/admin/messages/${id}`, {
          method: "DELETE",
        });
      }
      return api<{ ok: boolean; message: AdminMessage }>(
        `/api/admin/messages/${id}`,
        { method: "PATCH", body: JSON.stringify({ read: action === "read" }) },
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "messages"] });
    },
  });
}

/* ------------------------------- Subscribers ------------------------------- */

export function useAdminSubscribers() {
  return useQuery({
    queryKey: ["admin", "subscribers"],
    queryFn: async () =>
      (await api<{ items: AdminSubscriber[] }>("/api/admin/subscribers")).items,
  });
}

/* --------------------------------- Settings -------------------------------- */

export function useAdminSettings() {
  return useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => api<Record<string, string>>("/api/settings"),
    refetchOnWindowFocus: false,
  });
}

export function useAdminSettingsSave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates: Record<string, string>) =>
      api<Record<string, string>>("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ updates }),
      }),
    onSuccess: (data) => {
      qc.setQueryData(["admin", "settings"], data);
      // Public storefront settings consumers refetch immediately.
      void qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

/* ---------------------------------- Upload --------------------------------- */

/** POST an image file to /api/admin/upload and return its URL. */
export async function uploadAdminImage(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body });
  let data: unknown = {};
  try {
    data = await res.json();
  } catch {
    // non-JSON body
  }
  if (!res.ok) {
    const message =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as { error: unknown }).error)
        : `Upload failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return (data as { url: string }).url;
}

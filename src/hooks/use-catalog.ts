import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CategoryDTO, ProductDetail, ProductListItem, ReviewDTO } from "@/lib/types";

/** Query params accepted by GET /api/products. */
export interface ProductsQueryParams {
  category?: string;
  search?: string;
  sort?: string;
  min?: number;
  max?: number;
  page?: number;
  limit?: number;
}

/** GET /api/products response shape (API also echoes the current `page`). */
export interface ProductsQueryResult {
  items: ProductListItem[];
  total: number;
  pages: number;
  page?: number;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") sp.set(key, String(value));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

/** Product list with filters — keeps previous data while paginating/filtering. */
export function useProducts(params: ProductsQueryParams) {
  // Normalize so the query key is stable (no undefined entries).
  const normalized: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") normalized[key] = value;
  }
  return useQuery({
    queryKey: ["products", normalized],
    queryFn: () => api<ProductsQueryResult>(`/api/products${buildQuery(normalized)}`),
    placeholderData: keepPreviousData,
  });
}

/** Single product by slug (404 -> error state). */
export function useProduct(slug: string) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: () => api<ProductDetail>(`/api/products/${encodeURIComponent(slug)}`),
    enabled: slug.length > 0,
  });
}

/** All categories with product counts. */
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => api<CategoryDTO[]>("/api/categories"),
  });
}

/** Store settings (whatsapp number, shipping fee / free-shipping threshold, ...). */
export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Record<string, string>>("/api/settings"),
    staleTime: 5 * 60 * 1000,
  });
}

/** Approved reviews for a product, newest first. */
export function useReviews(productId: string) {
  return useQuery({
    queryKey: ["reviews", productId],
    queryFn: () => api<ReviewDTO[]>(`/api/reviews?productId=${encodeURIComponent(productId)}`),
    enabled: productId.length > 0,
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { OrderDTO } from "@/lib/types";

/**
 * Fallback store settings compiled from src/data/business-info.json (research
 * task 2). Used while /api/settings is loading or if the API is unreachable so
 * the conversion views degrade gracefully instead of rendering blanks.
 */
export const FALLBACK_SETTINGS: Record<string, string> = {
  store_name: "Zameer Sports",
  phone: "+92 310 7220870",
  whatsapp: "923465002049",
  email: "info@zameersports.shop",
  address: "Kolian Road, Aslah Market, Board Chowk, Dinga, Kharian, Gujrat",
  city: "Dinga",
  hours: "Open daily 9:00 AM – 10:00 PM",
  free_shipping_threshold: "5000",
  shipping_fee: "250",
  facebook1: "https://www.facebook.com/zameersports49",
  facebook2: "https://www.facebook.com/ZameerSports",
  tiktok: "https://www.tiktok.com/@zameersports",
  instagram: "https://www.instagram.com/zameer.sports",
  youtube: "https://www.youtube.com/@zameersportsofficial804",
};

/** Store settings from GET /api/settings (stale for 5 minutes, shared cache). */
export function useSettingsQuery() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Record<string, string>>("/api/settings"),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Settings merged over the business-info fallbacks — always safe to read
 * (while loading or during an API outage every key still resolves).
 */
export function useSettings(): Record<string, string> {
  const { data } = useSettingsQuery();
  return { ...FALLBACK_SETTINGS, ...(data ?? {}) };
}

/** Tracked order payload: OrderDTO plus the updatedAt field the endpoint adds. */
export interface TrackedOrder extends OrderDTO {
  updatedAt?: string;
}

/**
 * Order lookup by order number + the phone used at checkout.
 * Only fires when both values are set (and `enabled`), never retries (a 404
 * should surface immediately), and always refetches on mount.
 */
export function useOrderTracking(orderNumber: string, phone: string, enabled: boolean) {
  return useQuery({
    queryKey: ["order-tracking", orderNumber, phone],
    queryFn: () =>
      api<TrackedOrder>(
        `/api/orders/${encodeURIComponent(orderNumber.trim())}?phone=${encodeURIComponent(phone.trim())}`,
      ),
    enabled: enabled && orderNumber.trim().length > 0 && phone.trim().length > 0,
    retry: false,
    staleTime: 0,
  });
}

/** WhatsApp deep link from a settings value ("923465002049" / "+92 346 ..."). */
export function waLink(whatsapp: string, text?: string): string {
  const digits = whatsapp.replace(/[^0-9]/g, "") || FALLBACK_SETTINGS.whatsapp;
  const base = `https://wa.me/${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** Display form of a WhatsApp number: "923465002049" -> "0346 5002049". */
export function waDisplay(whatsapp: string): string {
  const digits = whatsapp.replace(/[^0-9]/g, "");
  const local = digits.startsWith("92") ? `0${digits.slice(2)}` : digits;
  return local.length === 11 ? `${local.slice(0, 4)} ${local.slice(4)}` : whatsapp;
}

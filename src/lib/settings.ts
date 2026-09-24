import { query } from "@/lib/db"
import type { SettingRow } from "@/lib/db-types"
import { cacheGet, cacheSet } from "@/lib/cache"

export type SettingsMap = Record<string, string>

const CACHE_KEY = "settings:all"

const DEFAULTS: SettingsMap = {
  store_name: "Zameer Sports",
  store_tagline: "Dinga's Complete Sports Centre & Cricket Specialists",
  phone: "+92 310 7220870",
  whatsapp: "923465002049",
  email: "info@zameersports.shop",
  address: "Kolian Road, Aslah Market, Board Chowk, Dinga, Kharian, Gujrat",
  city: "Dinga",
  hours: "Open daily 9:00 AM – 10:00 PM",
  announcement:
    "FREE Pakistan-wide delivery on orders over Rs 5,000 • Cash on Delivery available",
  free_shipping_threshold: "5000",
  shipping_fee: "250",
  facebook1: "https://www.facebook.com/zameersports49",
  facebook2: "https://www.facebook.com/ZameerSports",
  tiktok: "https://www.tiktok.com/@zameersports",
  instagram: "https://www.instagram.com/zameer.sports",
  youtube: "https://www.youtube.com/@zameersportsofficial804",
  currency: "PKR",
}

/** Read all settings as a map (60s in-memory cache, DB values merged over defaults). */
export async function getSettings(): Promise<SettingsMap> {
  const cached = cacheGet<SettingsMap>(CACHE_KEY)
  if (cached) return cached
  try {
    const rows = await query<SettingRow>("SELECT `key`, `value` FROM Setting")
    const map: SettingsMap = { ...DEFAULTS }
    for (const row of rows) map[row.key] = row.value
    cacheSet(CACHE_KEY, map)
    return map
  } catch {
    return { ...DEFAULTS }
  }
}

export function getShippingInfo(settings: SettingsMap): { threshold: number; fee: number } {
  return {
    threshold: Number(settings.free_shipping_threshold) || 5000,
    fee: Number(settings.shipping_fee) || 250,
  }
}

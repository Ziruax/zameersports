/**
 * Tiny in-memory TTL cache for stable, read-heavy data
 * (categories / testimonials / settings). 60s default TTL.
 * Keeps remote-MySQL round trips low without extra middleware.
 */

interface CacheEntry<T> {
  value: T
  expires: number
}

const store = new Map<string, CacheEntry<unknown>>()

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null
  if (entry.expires < Date.now()) {
    store.delete(key)
    return null
  }
  return entry.value as T
}

export function cacheSet<T>(key: string, value: T, ttlMs: number = 60_000): void {
  store.set(key, { value, expires: Date.now() + ttlMs })
}

/** Invalidate all keys, or only those starting with the given prefix. */
export function cacheInvalidate(prefix?: string): void {
  if (!prefix) {
    store.clear()
    return
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}

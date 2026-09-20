"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Wishlist slugs persisted in localStorage under "zs-wishlist".
 * External-store pattern (useSyncExternalStore) keeps it hydration-safe:
 * server snapshot is always empty, the real list is picked up after mount.
 */
const STORAGE_KEY = "zs-wishlist";
const EMPTY: string[] = [];

let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    cache = Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: string[]): void {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable — keep in-memory cache only
  }
}

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = () => {
    cache = null; // another tab changed it — re-read on next snapshot
    onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): string[] {
  return read();
}

function getServerSnapshot(): string[] {
  return EMPTY;
}

export function useWishlist(): {
  slugs: string[];
  has: (slug: string) => boolean;
  toggle: (slug: string) => void;
} {
  const slugs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const has = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  const toggle = useCallback((slug: string) => {
    const current = read();
    write(current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug]);
    emit();
  }, []);

  return { slugs, has, toggle };
}

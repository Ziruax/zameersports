"use client";

import { useSyncExternalStore } from "react";

/**
 * Viewport width via useSyncExternalStore (SSR-safe: server snapshot is 0,
 * so mobile-first defaults apply during hydration, then the real width
 * triggers a single re-render if different).
 */
function subscribe(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

function getSnapshot(): number {
  return window.innerWidth;
}

function getServerSnapshot(): number {
  return 0;
}

export function useViewportWidth(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

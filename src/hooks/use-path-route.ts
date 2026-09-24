"use client";

import { useCallback, useEffect, useState } from "react";

export type RouteName =
  | "home"
  | "shop"
  | "product"
  | "cart"
  | "checkout"
  | "success"
  | "track"
  | "about"
  | "contact"
  | "wishlist"
  | "admin";

export interface PathRoute {
  name: RouteName;
  params: Record<string, string>;
  query: Record<string, string>;
}

const ROUTE_NAMES: RouteName[] = [
  "home",
  "shop",
  "product",
  "cart",
  "checkout",
  "success",
  "track",
  "about",
  "contact",
  "wishlist",
  "admin",
];

/** Param keys extracted from the second path segment, per route name. */
const PARAM_KEYS: Partial<Record<RouteName, string>> = {
  product: "slug",
  success: "orderNumber",
};

/**
 * Parse a pathname + search pair ("/product/x?order=y") into a route.
 * First segment = route name (default "home"), second segment is mapped via
 * PARAM_KEYS (product→slug, success→orderNumber), query string parsed the
 * same way the old hash router did.
 */
export function parsePath(pathname: string, search = ""): PathRoute {
  // pathname like "/shop" or "/product/zameer-legend-2026";
  // search like "?category=cricket" (leading "?" optional).
  const segments = pathname.split("?")[0].split("/").filter(Boolean);

  const name = (ROUTE_NAMES.includes(segments[0] as RouteName)
    ? segments[0]
    : "home") as RouteName;

  const params: Record<string, string> = {};
  const paramKey = PARAM_KEYS[name];
  if (paramKey && segments[1]) {
    params[paramKey] = decodeURIComponent(segments[1]);
  }

  const query: Record<string, string> = {};
  const queryPart = search.replace(/^\?/, "");
  if (queryPart) {
    for (const pair of queryPart.split("&")) {
      if (!pair) continue;
      const [key, value = ""] = pair.split("=");
      if (key) query[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }

  return { name, params, query };
}

const HOME_ROUTE: PathRoute = { name: "home", params: {}, query: {} };

function readRoute(): PathRoute {
  return parsePath(window.location.pathname, window.location.search);
}

/**
 * Programmatic navigation using the History API (clean path URLs).
 *
 * Accepts "/shop", "/product/slug?x=1" and (for safety) legacy "#/shop"
 * input. External http(s) URLs are delegated to a full page load.
 *
 * history.pushState does NOT fire popstate, so after pushing we dispatch a
 * synthetic PopStateEvent — every usePathRoute() instance listens for it and
 * re-syncs its state from window.location. Works standalone (outside the
 * hook) as well as via the hook's returned navigate.
 */
export function navigate(to: string): void {
  if (/^https?:\/\//i.test(to)) {
    window.location.href = to;
    return;
  }
  let path = to.replace(/^#/, "").trim();
  if (path === "" ) path = "/";
  if (!path.startsWith("/")) path = `/${path}`;
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function usePathRoute(): {
  route: PathRoute;
  navigate: (to: string) => void;
} {
  // Always start from "home" so the first client render matches SSR HTML
  // (prevents hydration mismatch when the page is loaded at a deep path).
  const [route, setRoute] = useState<PathRoute>(HOME_ROUTE);

  useEffect(() => {
    // Legacy bookmark support: old "#/..." hash links are transparently
    // rewritten to their clean path equivalent (e.g. "#/shop" → "/shop").
    if (window.location.hash.startsWith("#/")) {
      const clean = window.location.hash.slice(1);
      window.history.replaceState(null, "", clean === "" ? "/" : clean);
    }

    const onPopState = () => setRoute(readRoute());
    window.addEventListener("popstate", onPopState);
    onPopState();
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigateCallback = useCallback((to: string) => navigate(to), []);

  return { route, navigate: navigateCallback };
}

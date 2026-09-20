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
  | "admin";

export interface HashRoute {
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
  "admin",
];

/** Param keys extracted from the second path segment, per route name. */
const PARAM_KEYS: Partial<Record<RouteName, string>> = {
  product: "slug",
  success: "orderNumber",
};

function parseHash(hash: string): HashRoute {
  // hash like "#/shop?category=cricket" or "#/product/zameer-legend-2026"
  const raw = hash.replace(/^#/, "").replace(/^\/+/, "");
  const [pathPart, queryPart] = raw.split("?");
  const segments = pathPart.split("/").filter(Boolean);

  const name = (ROUTE_NAMES.includes(segments[0] as RouteName)
    ? segments[0]
    : "home") as RouteName;

  const params: Record<string, string> = {};
  const paramKey = PARAM_KEYS[name];
  if (paramKey && segments[1]) {
    params[paramKey] = decodeURIComponent(segments[1]);
  }

  const query: Record<string, string> = {};
  if (queryPart) {
    for (const pair of queryPart.split("&")) {
      if (!pair) continue;
      const [key, value = ""] = pair.split("=");
      if (key) query[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }

  return { name, params, query };
}

const HOME_ROUTE: HashRoute = { name: "home", params: {}, query: {} };

export function useHashRoute(): {
  route: HashRoute;
  navigate: (to: string) => void;
} {
  // Always start from "home" so the first client render matches SSR HTML
  // (prevents hydration mismatch when the page is loaded with a deep hash).
  const [route, setRoute] = useState<HashRoute>(HOME_ROUTE);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    onHashChange();
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((to: string) => {
    window.location.hash = to.startsWith("#") ? to : `#${to}`;
  }, []);

  return { route, navigate };
}

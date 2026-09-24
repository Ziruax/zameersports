import type { MetadataRoute } from "next";

/**
 * robots for zameersports.shop — the storefront SPA is fully indexable;
 * API routes are internal JSON endpoints and personal/account pages have no
 * search value, so they stay out of the index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/cart", "/checkout", "/success"],
    },
    sitemap: "https://zameersports.shop/sitemap.xml",
  };
}

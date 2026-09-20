import type { MetadataRoute } from "next";

/**
 * robots for zameersports.shop — the storefront SPA is fully indexable;
 * API routes are internal JSON endpoints and should stay out of the index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: "https://zameersports.shop/sitemap.xml",
  };
}

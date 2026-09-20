import type { MetadataRoute } from "next";

/**
 * ZameerSports.shop is a single-page application (Next.js App Router) whose
 * shop / product / cart / checkout views are client-side HASH routes
 * (#/shop, #/product/<slug>, ...). Hash fragments are not indexable by search
 * engines and do not create distinct URLs, so the sitemap can only declare the
 * one canonical URL.
 *
 * SEO tradeoff (documented deliberately): individual product pages are not
 * independently crawlable. Product visibility comes from (a) the
 * server-rendered home page HTML (featured products + prices in SSR output)
 * and (b) client-injected Product JSON-LD on the product view. If per-product
 * URLs are ever needed, migrate hash routes to real App Router paths and add
 * one sitemap entry per product here.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://zameersports.shop/",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}

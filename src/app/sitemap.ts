import type { MetadataRoute } from "next";
import { query } from "@/lib/db";

/**
 * Never statically cache the sitemap at build time — product slugs change
 * with the live MySQL database.
 */
export const dynamic = "force-dynamic";

const SITE_URL = "https://zameersports.shop";

/**
 * Clean-path sitemap for zameersports.shop: static storefront routes plus one
 * entry per active product (/product/<slug>). Reads products straight from
 * MySQL via the shared mysql2 pool. A DB failure must NEVER make the sitemap
 * 500 — on error we fall back to the static routes only.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/shop`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/track`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  try {
    const products = await query<{ slug: string; updatedAt: Date }>(
      "SELECT slug, updatedAt FROM Product WHERE active = 1",
    );

    const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${SITE_URL}/product/${p.slug}`,
      lastModified: p.updatedAt instanceof Date ? p.updatedAt : new Date(p.updatedAt),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    return [...staticRoutes, ...productRoutes];
  } catch {
    // Database unavailable — serve the static routes rather than erroring.
    return staticRoutes;
  }
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["*.space-z.ai"],
  /* The storefront is a single-page app (src/app/page.tsx renders <StoreApp/>)
   * with client-side path routing. These rewrites let direct loads, refreshes
   * and deep links to any SPA path serve the app shell. Rewrites run AFTER
   * filesystem routes, so /, /api/*, /uploads/*, /images/*, /sitemap.xml and
   * /robots.txt are unaffected. */
  async rewrites() {
    return [
      { source: "/shop", destination: "/" },
      { source: "/product/:slug", destination: "/" },
      { source: "/cart", destination: "/" },
      { source: "/checkout", destination: "/" },
      { source: "/success/:orderNumber", destination: "/" },
      { source: "/track", destination: "/" },
      { source: "/about", destination: "/" },
      { source: "/contact", destination: "/" },
      { source: "/wishlist", destination: "/" },
      { source: "/admin", destination: "/" },
    ];
  },
};

export default nextConfig;

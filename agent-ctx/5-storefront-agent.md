# Task 5 — storefront-agent (ZameerSports.shop)

Task: Seed database + storefront UI + public APIs (single-page app with HASH routing at `/`).

## Key facts this agent relies on (from prior agents)
- DB: REMOTE Hostinger MySQL (srv939.hstgr.io), latency 200-500ms/query. DATABASE_URL in .env. PLATFORM GOTCHA: stale injected env `DATABASE_URL=file:...` must be `unset` before any prisma/bun CLI command; bun auto-loads real .env afterwards.
- prisma/schema.prisma is LIVE and READ-ONLY (models: Category, Product, Order, OrderItem, Review, ContactMessage, Subscriber, Testimonial, AdminUser, Setting).
- catalog.json: 8 categories + 51 products + brand block (logo, 3 heroes, about image). Images at /images/**.
- business-info.json: real phone/WhatsApp/socials/testimonials.
- Dev server daemonized on :3000. Restart cmd: cd /home/z/my-project && unset DATABASE_URL && ( setsid bash -c 'exec bun run dev' >/dev/null 2>&1 </dev/null & )

## Plan
1. src/lib/auth.ts (scrypt + HMAC token) — reused by Task 6 admin.
2. src/lib/cache.ts (60s in-memory TTL), src/lib/settings.ts, src/lib/types.ts, src/lib/format.ts, src/lib/api.ts, src/lib/cart-store.ts (zustand persist, skipHydration).
3. scripts/seed.ts — idempotent (categories 8, products 51, testimonials 7, reviews ~40, adminUser, settings ~18, demo orders 12).
4. Public APIs: categories, products, products/[slug], testimonials, settings, orders (POST), orders/[orderNumber] (GET), contact, newsletter, reviews (GET/POST).
5. Storefront SPA: src/app/page.tsx (server, prisma, force-dynamic) → StoreApp client with hash router (#/shop, #/product/x, #/cart, #/checkout, #/success/x, #/track, #/about, #/contact, #/admin).
6. Theme: emerald-700 primary, amber-500 accent, Oswald display font + Inter.
7. Verify: seed, curls, dev.log, lint, browser smoke test.

## Progress log
- [in progress] Writing lib + auth + cache files.

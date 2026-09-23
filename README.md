# ZameerSports.shop — Complete Sports Centre Ecommerce Store

A complete, production-ready ecommerce store for **Zameer Sports**, Dinga's complete sports centre and cricket specialists. Built with Next.js 16, Tailwind CSS 4, shadcn/ui and Prisma (MySQL on Hostinger).

**Business:** Zameer Sports, Board Chowk, Aslah Market, Kolian Road, Dinga, Kharian, Gujrat, Punjab, Pakistan
**Categories:** Cricket (specialist) · Football · Volleyball · Badminton · Trophies · Gifts · Toys · Gym Corner

---

## Admin Dashboard Login

The admin dashboard lives at `/#/admin` (Admin Login link in the footer).

| Field    | Value                        |
| -------- | ---------------------------- |
| Email    | `admin@zameersports.shop`    |
| Password | `Zameer@2025`                |

> **Important:** Change this password before going to production. You can update it in the database (`Admin` table) or via a seed script.

Admin panel features:

- Dashboard with revenue, orders, products and low-stock KPIs plus charts
- Order management with status workflow (Pending → Confirmed → Shipped → Delivered, Cancelled)
- Product, category, review, message, subscriber and settings management
- Image uploads for products and categories

## Storefront Features

- SSR home page (categories, featured gear, testimonials, settings) with graceful degradation if the DB is flaky
- Hash-based views: `#/shop`, `#/product/<slug>`, `#/cart`, `#/checkout`, `#/success`, `#/track`, `#/about`, `#/contact`, `#/admin`
- Full commerce flow: cart drawer with persisted cart, checkout with COD or bank transfer, authoritative DB pricing, stock and sold-count transaction on order placement
- Order tracking timeline (order number + phone number)
- Live product reviews with rating recalculation and a 60-second duplicate guard
- Newsletter subscription and contact message forms
- WhatsApp float button, announcement bar, mobile nav
- SEO: metadata + Open Graph + Twitter cards, `SportingGoodsStore`, `WebSite`, `Product` and `FAQPage` JSON-LD, sitemap, robots, per-view titles, FAQ section
- Responsive, mobile-first design with 44px touch targets and accessible controls

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript 5
- **Styling:** Tailwind CSS 4 + shadcn/ui (New York style) + Lucide icons + Framer Motion
- **Database:** Prisma ORM with MySQL (Hostinger shared hosting)
- **Runtime:** Bun
- **State:** Zustand (cart), TanStack-style hooks

## Project Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure the database

Copy `.env.example` to `.env` and fill in your MySQL connection string:

```bash
cp .env.example .env
```

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE?connection_limit=5&pool_timeout=15"
```

For Hostinger shared hosting use the MySQL hostname (for example `srv939.hstgr.io`) and make sure remote MySQL access is enabled for your client IP in hPanel.

### 3. Push the schema and seed demo data

```bash
bun run db:push     # creates tables (prisma db push)
bun run db:generate # regenerates the Prisma client if needed
bun scripts/seed.ts # seeds categories, 51 products, reviews, admin user, settings
```

> Note: run scripts with the project's `.env` in place (`DATABASE_URL` must be the `mysql://` URL). If your shell exports a stale `DATABASE_URL`, unset it first: `unset DATABASE_URL`.

### 4. Start the dev server

```bash
bun run dev
```

Open <http://localhost:3000>. The store loads at `/` and the admin panel at `/#/admin`.

## Useful Scripts

| Command                    | What it does                            |
| -------------------------- | --------------------------------------- |
| `bun run dev`              | Start the Next.js dev server            |
| `bun run build`            | Prisma generate + production build      |
| `bun run start`            | Run the standalone production server    |
| `bun run lint`             | Run ESLint                              |
| `bun run db:push`          | Push Prisma schema to MySQL             |
| `bun run db:generate`      | Regenerate the Prisma client            |
| `bun scripts/seed.ts`      | Idempotent seed (safe to re-run)        |
| `bun scripts/db-counts.ts` | Print live row counts for sanity checks |

## Production Deploy (Hostinger Node.js hosting)

The `build` script already runs `prisma generate` before `next build`, and `postinstall` regenerates the client after every dependency install, so a clean server without a global Prisma CLI works out of the box:

```bash
npm install          # postinstall runs "prisma generate" automatically
npm run build        # prisma generate && next build (standalone output)
npm run start        # serves .next/standalone/server.js on port 3000
```

Set `DATABASE_URL` in the server's `.env` (same `mysql://` string as local). Uploaded product images are stored in `public/uploads/`, which is created automatically at runtime.

## Project Structure

```
src/
  app/
    page.tsx              # SSR home page (DB reads with retry + fallbacks)
    layout.tsx            # Metadata, OG, JSON-LD (store + website)
    sitemap.ts            # sitemap.xml
    robots.ts             # robots.txt
    api/                  # REST API routes (products, orders, reviews,
                          #   newsletter, contact, settings, admin/*)
  components/
    store/                # Storefront: Header, Footer, CartDrawer, views/
    admin/                # Admin panel views and managers
    ui/                   # shadcn/ui component set
  data/
    catalog.json          # Product + category seed data
    business-info.json    # Researched business details
  hooks/                  # Cart, catalog, checkout, admin hooks
  lib/                    # db client, retry helper, settings, types, utils
prisma/
  schema.prisma           # MySQL schema (Category, Product, Order, Review, ...)
scripts/
  seed.ts                 # Idempotent seeder (creates admin user too)
public/
  images/                 # Brand, category and product imagery
```

## Business Contact (used across the site)

- WhatsApp: +92 346 5002049
- Call: +92 310 7220870
- Address: Board Chowk, Aslah Market, Kolian Road, Dinga, Kharian, Gujrat, Punjab
- Hours: 09:00 - 22:00, Monday to Sunday

## Notes

- Product images are local placeholder assets under `/public/images/products`. Replace with real photography before launch.
- Demo data (ZSDEMO orders and seeded reviews) is intentionally present for showcase purposes.
- The remote Hostinger MySQL occasionally refuses cold connections; every read and write retries automatically and the storefront degrades gracefully instead of failing.

# ZameerSports.shop — Complete Sports Centre Ecommerce Store

A complete, production-ready ecommerce store for **Zameer Sports**, Dinga's complete sports centre and cricket specialists. Built with Next.js 16, Tailwind CSS 4, shadcn/ui and a raw MySQL layer (mysql2 pool, MySQL on Hostinger).

**Business:** Zameer Sports, Board Chowk, Aslah Market, Kolian Road, Dinga, Kharian, Gujrat, Punjab, Pakistan
**Categories:** Cricket (specialist) · Football · Volleyball · Badminton · Trophies · Gifts · Toys · Gym Corner

---

## Admin Dashboard Login

The admin dashboard lives at `/admin` (Admin Login link in the footer).

| Field    | Value                        |
| -------- | ---------------------------- |
| Email    | `admin@zameersports.shop`    |
| Password | `Zameer@2025`                |

> **Important:** Change this password before going to production. You can update it in the database (`AdminUser` table) or via a seed script.

Admin panel features:

- Dashboard with revenue, orders, products and low-stock KPIs plus charts
- Order management with status workflow (Pending → Confirmed → Shipped → Delivered, Cancelled)
- Product, category, coupon, review, message, subscriber and settings management
- Image uploads for products and categories

## Storefront Features

- SSR home page (categories, featured gear, testimonials, settings) with graceful degradation if the DB is flaky
- Clean URL routes: `/shop`, `/product/<slug>`, `/cart`, `/checkout`, `/success/<orderNumber>`, `/track`, `/about`, `/contact`, `/wishlist`, `/admin`
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
- **Database:** Raw MySQL via mysql2 (pooled, Hostinger-ready). Prisma remains a devDependency for schema management (`prisma db push`) and seeding only — production runtime has zero Prisma dependency.
- **Runtime:** Bun
- **State:** Zustand (cart), TanStack-style hooks

## Project Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure the database

Copy `.env.example` to `.env` and fill in your MySQL connection details:

```bash
cp .env.example .env
```

Two configuration styles are supported (see `.env.example`):

```env
# Option 1 — discrete vars (recommended on Hostinger Node.js hosting;
# use localhost when the app runs on the same server as MySQL):
DB_HOST=localhost
DB_USER=u123456_user
DB_PASSWORD=your_mysql_password
DB_NAME=u123456_sports
DB_PORT=3306

# Option 2 — single URL (takes effect only when DB_HOST is unset):
# DATABASE_URL="mysql://user:password@host:3306/database"
```

If you develop against a remote Hostinger MySQL from your own machine, use the MySQL hostname (for example `srv939.hstgr.io`) in `DATABASE_URL` and make sure remote MySQL access is enabled for your client IP in hPanel.

### 3. Create the tables and seed demo data

```bash
bun run db:generate # generates the Prisma client (needed by the seed script)
bun run db:push     # creates tables (prisma db push — dev-time only)
bun scripts/seed.ts # seeds categories, 51 products, reviews, admin user, settings
```

> Seeding is a dev-time operation that uses Prisma (a devDependency). Run `bun run db:generate` once after install. Production runtime uses raw mysql2 (`src/lib/db.ts`) — no Prisma needed on the server. The seed is idempotent (upserts by slug/email/key, skips existing testimonials/reviews/demo orders).

> If your shell exports a stale `DATABASE_URL`, unset it before running scripts: `env -u DATABASE_URL bun scripts/seed.ts` (the project `.env` file has the correct URL).

### 4. Start the dev server

```bash
bun run dev
```

Open <http://localhost:3000>. The store loads at `/` and the admin panel at `/admin`.

## URL Routes

All storefront views are served by a single Next.js page via rewrites in `next.config.ts` — no per-route page files, one page component per view:

| Path                       | View                                            |
| -------------------------- | ----------------------------------------------- |
| `/`                        | Home (categories, featured gear, testimonials)  |
| `/shop`                    | Product catalog with filters                    |
| `/product/<slug>`          | Product detail + reviews                        |
| `/cart`                    | Cart                                            |
| `/checkout`                | Checkout (COD or bank transfer)                 |
| `/success/<orderNumber>`   | Order confirmation                              |
| `/track`                   | Order tracking (order number + phone)           |
| `/about`                   | About the store                                 |
| `/contact`                 | Contact form                                    |
| `/wishlist`                | Wishlist                                        |
| `/admin`                   | Admin panel (login required)                    |

## Useful Scripts

| Command                    | What it does                                          |
| -------------------------- | ----------------------------------------------------- |
| `bun run dev`              | Start the Next.js dev server                          |
| `bun run build`            | Production build (standalone output, no Prisma step)  |
| `bun run start`            | Run the standalone production server                  |
| `bun run lint`             | Run ESLint                                            |
| `bun run db:push`          | Push Prisma schema to MySQL (dev-time, creates tables)|
| `bun run db:generate`      | Regenerate the Prisma client (dev-time)               |
| `bun scripts/seed.ts`      | Idempotent seed (safe to re-run)                      |
| `bun scripts/db-counts.ts` | Print live row counts for sanity checks (mysql2)      |

## Production Deploy (Hostinger Node.js hosting)

1. **Create the database** — hPanel → Databases → MySQL Databases: create a database + user. The MySQL host is `localhost` because the Node.js app runs on the same server as MySQL.
2. **Set environment variables** — hPanel → Advanced → Environment Variables: add `DB_HOST` (`localhost`), `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` (`3306`). Optionally also `ADMIN_SECRET` (long random string) and `NEXT_PUBLIC_SITE_URL`.
3. **Build and start**:

```bash
npm install          # NO prisma generate needed anymore
npm run build        # next build (standalone output)
npm run start        # serves the standalone server on port 3000
```

The production runtime talks to MySQL through the raw mysql2 pool in `src/lib/db.ts` — there is no Prisma step at install or build time. Connection pool limits for shared hosting (connectionLimit 5, enableKeepAlive) are already built into `src/lib/db.ts`.

Tables must exist before the first start: run `bun run db:push` once from a machine that can reach the database (your dev environment with a `DATABASE_URL`, or via hPanel's database admin) — the production server never needs Prisma.

Uploaded product images are stored in `public/uploads/`, which is created automatically at runtime.

## Project Structure

```
src/
  app/
    page.tsx              # single page serving all views (via rewrites)
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
  lib/
    db.ts                 # mysql2 pool + query/execute/withTransaction helpers
    db-types.ts           # Row interfaces for the 11 MySQL tables
    retry.ts              # Transient-error classification + withRetry
    settings.ts           # Settings read-through cache (mysql2)
    auth.ts, coupon.ts, utils.ts, ...
prisma/
  schema.prisma           # MySQL schema (dev-time: prisma db push + seed)
scripts/
  seed.ts                 # Idempotent seeder via Prisma (dev-time only)
  db-counts.ts            # Live row counts via mysql2 (sanity checks)
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
- The remote Hostinger MySQL occasionally refuses cold connections; the mysql2 layer (`src/lib/retry.ts`) retries transient connection errors (resets, timeouts, deadlocks) automatically, and the storefront degrades gracefully instead of failing.

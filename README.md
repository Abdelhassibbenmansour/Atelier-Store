# Atelier Store

A full-stack fashion e-commerce storefront built with **Next.js 16** (App Router, Cache Components), **Better Auth**, **Drizzle ORM** on **Neon Postgres**, and **Stripe Checkout**.

Customers can browse a catalogue, search, manage a shopping bag, pay through Stripe and follow their orders. Admins manage products, categories, stock and orders. The database owns prices and stock, and only Stripe decides whether an order is paid.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Data model](#data-model)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Conventions](#conventions)
- [Verifying changes](#verifying-changes)
- [Deployment notes](#deployment-notes)
- [Scope and limitations](#scope-and-limitations)

---

## Features

**Storefront**
- Homepage with featured collections and new arrivals.
- Category pages (`/<category>`), a new arrivals page (`/new-in`) and full-text search (`/search`).
- Product pages with gallery, size picker, live stock states ("Only N left", "Sold out") and schema.org data.

**Customers**
- Email and password sign-up and sign-in, with sessions that last 30 days.
- Account area with profile details, order history and order detail pages. Customers can only ever see their own orders.

**Shopping bag**
- Cookie-based bag that works for guests and survives signing in and out.
- Quantities are capped by live stock on the server. Prices always come from the database.

**Checkout and payments**
- Stripe-hosted Checkout (USD, US shipping, free shipping).
- Stock is reserved when checkout starts and released if the payment doesn't complete.
- Orders are marked paid only by a signature-verified Stripe webhook or a server-side session lookup, never by the browser.

**Admin** (`/admin`, admins only)
- Create and edit products and categories.
- Adjust stock safely while checkouts are running, and see units held by open checkouts.
- Browse and inspect orders, including their Stripe references.

---

## Tech stack

| Layer | Technology | Why |
| --- | --- | --- |
| Framework | [Next.js 16.4](https://nextjs.org) (App Router, Turbopack) | Server Components, Server Actions and Route Handlers in one app |
| Rendering | Cache Components + Partial Prefetching | Static shells prerendered by default; request-specific data streams in through `<Suspense>` |
| UI | React 19.3, TypeScript 5 | Typed components end to end |
| Styling | Tailwind CSS 4.3 (CSS-first config) | Design tokens and utilities live in `src/app/globals.css`; no `tailwind.config` |
| Database | [Neon](https://neon.tech) serverless Postgres | HTTP driver for fast single queries, WebSocket pool for transactions |
| ORM and migrations | [Drizzle ORM 0.45](https://orm.drizzle.team) + drizzle-kit | Typed SQL, versioned migrations committed to `drizzle/` |
| Authentication | [Better Auth 1.7](https://better-auth.com) (Drizzle adapter) | Email and password, database-backed sessions and rate limiting, a role field clients can't set |
| Payments | [Stripe](https://stripe.com) Checkout (stripe-node 23) | Hosted, PCI-compliant payment page; webhooks as the source of truth |
| Validation | [Zod 4](https://zod.dev) | Server-side validation of every admin input |
| Images | `next/image` with a custom loader | Unsplash's CDN resizes each width directly |
| Tooling | ESLint 9, tsx, dotenv | Linting and scripts that run outside Next (seed, role management) |

---

## Architecture

### Rendering and caching

Pages are prerendered by default. Anything request-specific (the session, cookies, `searchParams`, live stock) renders inside `<Suspense>`, so the static shell is served at once and the rest streams in.

Catalogue reads are `"use cache"` functions tagged `products` and `product:<slug>`. They're invalidated as soon as data changes:
- **Admin edits:** Server Actions call `updateTag(...)`.
- **Checkout holds and releases:** stock changes call `invalidateProductStock()` after their transaction commits.

### Data access

Pages and components never query the database directly. Reads go through dedicated server-only modules in `src/lib`:

| Module | Responsibility |
| --- | --- |
| `catalog.ts` | Cached storefront catalogue reads |
| `bag.ts`, `bag-actions.ts` | Bag reads and the only code that writes the bag cookie |
| `orders.ts`, `checkout-actions.ts` | Stock reservation, order creation and Stripe synchronisation |
| `admin/data.ts`, `admin/actions.ts` | Uncached admin reads and mutations |
| `session.ts` | The only way to read the current user |

### Authentication and authorisation

Protection is layered, and each layer checks independently:

1. **Proxy** (`src/proxy.ts`): a fast cookie check that redirects signed-out visitors away from `/account`, `/admin` and `/checkout`.
2. **Pages:** `requireUser()` or `requireAdmin()` inside the page's `<Suspense>` boundary.
3. **Admin reads and actions:** every function re-checks the admin role against the database, not the cookie cache, so a role change applies immediately.

Non-admins who reach an admin URL get a plain 404. Sign-in and sign-up go through Better Auth's HTTP API, so its rate limiter and origin checks always apply.

### Checkout and payment flow

```
Bag ──► startCheckout (Server Action)
          1. release the customer's earlier unpaid checkout
          2. re-validate the bag against live prices and stock
          3. one transaction: lock stock rows, decrement stock,
             create a pending order with price snapshots
          4. create a Stripe Checkout Session from those snapshots
     ──► Stripe hosted payment page
     ──► Stripe webhook (signature verified, idempotent) ──► order paid / failed / expired
     ──► /checkout/complete (server-side session lookup) ──► confirmation page
```

**Guarantees:**
- **Prices:** Stripe only receives prices from the database's order snapshot. The browser never sends a price.
- **Stock:** every change is a single conditional SQL statement. Stock is never read and then written back.
- **Idempotency:** each Stripe event is recorded in `stripe_events` in the same transaction as its effects, so redelivered events are no-ops.
- **Releases:** held stock is released at most once, and only when the payment can no longer complete.
- **Mismatches:** a payment whose amount or currency differs from the order is flagged `needs_review`.

---

## Data model

```
categories 1──* products 1──1 product_stock
                    │
users 1──* orders 1──* order_items *──1 products
users 1──* sessions, accounts            stripe_events (processed event ids)
```

- **Money** is stored as integer cents everywhere.
- **Stock** is one number per product, shared by all sizes. Units held by open checkouts are already subtracted.
- **Integrity is enforced in the database:** CHECK constraints, unique slugs and references, and foreign keys (`RESTRICT` from products to categories and from order items to products, `CASCADE` from stock to products).
- **Roles:** `users.role` is `customer` or `admin`, guarded by a CHECK constraint.

---

## Getting started

### Prerequisites

- Node.js **20.9 or later**
- A Neon (or any Postgres) database
- A Stripe account with a sandbox for test keys

### Install and run

```bash
npm install
cp .env.example .env.local   # fill in every variable (see below)
npm run db:migrate           # create the tables
npm run db:seed              # add the sample catalogue
npm run dev                  # http://localhost:3000
```

### Stripe webhooks locally

Orders are only marked paid by webhooks. In a second terminal, run:

```bash
npx @stripe/cli listen --api-key <STRIPE_SECRET_KEY> --forward-to localhost:3000/api/stripe/webhook
```

Use the `whsec_…` value it prints (or `--print-secret`) as `STRIPE_WEBHOOK_SECRET`. Pay with the test card `4242 4242 4242 4242`, any future expiry date and any CVC.

### Becoming an admin

Sign up through the site, then run:

```bash
npm run auth:set-role -- you@example.com admin
```

---

## Environment variables

Variables are read from `.env.local` or `.env` (both git-ignored; `.env.local` wins). `.env.example` is the template.

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string |
| `BETTER_AUTH_SECRET` | Random secret, at least 32 characters (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | The app's base URL, used on the server |
| `NEXT_PUBLIC_APP_URL` | The app's base URL, exposed to the browser (read at build time) |
| `STRIPE_SECRET_KEY` | Stripe secret key. A restricted key is preferred (Checkout Sessions: write, PaymentIntents: read) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the webhook endpoint |

---

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the development server (Turbopack) |
| `npm run build` / `start` | Production build (type-checks and queries the database) and server |
| `npm run lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `npm run db:generate` | Generate a SQL migration from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:push` | Push the schema without migrations (throwaway databases only) |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:seed` | Add missing sample categories, products and stock; never overwrites |
| `npm run db:seed -- --reset-catalog` | Overwrite seeded categories and products (undoes admin edits) |
| `npm run db:seed -- --reset-stock` | Overwrite stock; refused while checkouts hold stock |
| `npm run auth:generate` | Regenerate the Better Auth tables (see `CLAUDE.md` first) |
| `npm run auth:set-role -- <email> <customer\|admin>` | Change a user's role |

---

## Project structure

```
src/
├── app/
│   ├── (auth)/                Sign in and sign up
│   ├── [category]/            Category listing pages
│   ├── new-in/                New arrivals
│   ├── products/[slug]/       Product detail
│   ├── search/                Search
│   ├── bag/                   Shopping bag
│   ├── checkout/              Return from Stripe and order confirmation
│   ├── account/               Customer account and order history
│   ├── admin/                 Admin area (products, stock, categories, orders)
│   ├── api/auth/[...all]/     Better Auth handler
│   ├── api/stripe/webhook/    Stripe webhook
│   └── globals.css            Design tokens and utilities
├── components/                Shared UI: layout, product, order, home, auth, ui
├── db/
│   ├── schema/                Catalogue, auth and order tables
│   ├── index.ts               Drizzle client (Neon HTTP)
│   ├── pool.ts                Drizzle client (Neon WebSocket, for transactions)
│   ├── seed.ts, seed-data.ts  Sample catalogue
│   └── set-role.ts            Role management script
├── lib/                       Server data access, session, bag, checkout, admin, Stripe
└── proxy.ts                   Redirects signed-out visitors from protected areas
drizzle/                       Versioned SQL migrations
```

Code used by a single route lives next to it in a private `_components/` folder. Code shared between routes lives in `src/components/`.

---

## Conventions

The full list of project rules is in [`CLAUDE.md`](./CLAUDE.md). The most important ones:

- **Never trust the client** for prices, stock or payment status.
- **Money is integer cents.** Convert only when rendering.
- **Stock changes are single conditional statements.** Never read and then write.
- **Every storefront-affecting write refreshes the cache.**
- **Every admin page, read and action re-checks the role** on the server.
- **Schema changes go through migrations:** `db:generate`, review the SQL, `db:migrate`, then commit the migration.
- **Use the design system:** tokens from `globals.css` instead of raw colours or one-off values.
- **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org): `feat`, `fix`, `docs`, `chore`.

---

## Verifying changes

There is no automated test suite yet. Before merging:

1. Run `npm run lint`, `npm run typecheck` and `npm run build`.
2. Run the production build with `npm start`, then exercise the affected flows with Stripe webhooks forwarded.
3. Use test-owned products and accounts, and clean them up afterwards. Never reset real stock while checkouts may be holding it.

---

## Deployment notes

- Set every environment variable in the hosting platform. `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` must be the public URL.
- The database must be reachable at build time, because the build prerenders product pages.
- Run `npm run db:migrate` against the production database before deploying a schema change.
- In the Stripe Dashboard, add a webhook endpoint at `https://<your-domain>/api/stripe/webhook` listening to:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.async_payment_failed`
  - `checkout.session.expired`

  Use its signing secret as `STRIPE_WEBHOOK_SECRET`.
- Use live Stripe keys only in production.

---

## Scope and limitations

These are intentionally out of scope for now:

- **Products:** variants and per-size stock, product deletion, image uploads (only Unsplash URLs are accepted).
- **Payments:** refunds, disputes and tax.
- **Accounts:** social login, password reset, email verification, two-factor authentication.
- **Engagement:** reviews and wishlists.

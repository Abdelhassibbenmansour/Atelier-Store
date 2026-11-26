# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Next.js 16 and Cache Components

This is Next.js 16.4 (App Router), whose APIs differ from older versions. Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` and follow its deprecation notices. `AGENTS.md` is managed by `next dev`, which re-adds it, so don't edit or delete it.

`cacheComponents` and `partialPrefetching` are on. Pages are prerendered by default, so anything request-specific (session, cookies, `searchParams`, uncached DB reads) must sit inside `<Suspense>` or `"use cache"`.

Gotchas this codebase relies on:
- **Session reads call `await connection()` first** (`src/lib/session.ts`). Without it, the partial-prefetch render starts session DB queries that get aborted, and Better Auth logs them as errors. Keep it.
- **`usePathname()` in a layout must be inside `<Suspense>`** with a fallback, or dynamic routes below it fail to build. The section navs follow this pattern.
- **`notFound()` or `redirect()` inside `<Suspense>` happens after streaming starts.** The response is HTTP 200 carrying the 404 page, or a client-side redirect. That is expected; don't "fix" it with a top-level await.
- **A page's static parts are sent to every visitor.** Render anything role-specific only inside the component that did the check.

## Commands

```bash
npm run dev / build / lint / typecheck     # build also type-checks and queries the DB
npm run db:generate && npm run db:migrate  # schema changes: review the SQL in drizzle/ and commit it
npm run db:seed                            # adds missing sample rows only; never overwrites
npm run db:seed -- --reset-catalog         # overwrite seeded categories/products (undoes admin edits)
npm run db:seed -- --reset-stock           # overwrite stock; refused while checkouts hold stock
npm run auth:set-role -- <email> admin     # grant admin (customer to remove)
```

No test framework is configured. `db:push` is for throwaway databases only.

## Environment

- **Env files:** env vars live in `.env.local` or `.env` (both git-ignored, `.env.local` wins). `.env.example` lists every required variable.
- **Scripts outside Next** (`src/db/seed.ts`, `src/db/set-role.ts`, drizzle-kit) load the same files with `dotenv`. They must use relative imports and their own Drizzle client, never `@/` paths or `src/db/index.ts`, which is `server-only`.
- **Local Stripe:** `npx @stripe/cli listen --api-key <STRIPE_SECRET_KEY> --forward-to localhost:3000/api/stripe/webhook`. Its `--print-secret` gives the `STRIPE_WEBHOOK_SECRET`. Without it running, orders are never marked paid locally.

## Data and database

- **Clients:** `db` (Neon HTTP driver) has no interactive transactions. Use `txDb` (`src/db/pool.ts`, WebSocket) when several writes must succeed together with row locks.
- **Schema:** `src/db/schema/index.ts` is the single export that drizzle-kit, `db` and the Better Auth adapter all use. Put new tables in their own file and re-export them there.
- **Integrity lives in the database:** CHECKs, unique slugs and references, `RESTRICT` from products to categories and from order items to products, `CASCADE` from stock to products.
- **Money is integer cents everywhere.** Convert to display units only when rendering.
- **Pages and components never query `db`.** Storefront catalogue reads go through `src/lib/catalog.ts`: cached `"use cache"` functions tagged `products` / `product:<slug>`. `getProductsForBag` is the one deliberately uncached catalogue read, because bag prices and stock must be live. Orders, admin and held-stock reads live in their own `server-only` modules in `src/lib`. Client components import from `src/lib/product.ts`, never `catalog.ts`.
- **Every write that affects the storefront must refresh the cache:**
  - catalogue writes in Server Actions call `updateTag("products")` (plus `product:<slug>`);
  - stock changes outside admin actions (checkout holds and releases) call `invalidateProductStock()` (`src/lib/stock-cache.ts`) after the transaction commits.

  `db:seed` can't refresh the cache, so pages catch up within the one-minute cache window.
- **`generateStaticParams` must never return `[]`** under Cache Components. Return a placeholder slug that `notFound()`s.
- **Keep the scope small:** no variants or per-size stock, refunds or disputes, reviews, wishlists, product deletion or image uploads until asked.
- **Reuse the shared helpers:** `isUuid`, `firstParam`, `containsPattern` (escaped `ILIKE`), `StatusLabel`, `SectionNavLinks`, plus the order display parts in `src/components/order/`.

## Stock (one number per product)

- **`product_stock.quantity` is the number available to buy,** shared by all sizes. Units held by open checkouts are already subtracted. Sizes only carry an `available` flag.
- **Never read-then-write stock.** Every change is one conditional statement:
  - a checkout reservation decrements only `WHERE quantity >= n`, under `FOR UPDATE` locks taken in id order;
  - the admin "Add / Remove" is `quantity + delta` within 0 to `MAX_STOCK`;
  - the admin "Set to" only applies `WHERE quantity = expected`, and reports a conflict otherwise.
- **"Held" means units in unreleased `pending` or `processing` orders.** They come back if the payment doesn't complete, so the seed reset refuses while any exist.

## Auth

- **Better Auth, email and password only.** No social login, password reset, email verification or 2FA. Sessions last 30 days.
- **Sign-in and sign-up go through `authClient`** over HTTP, not Server Actions: Better Auth's rate limiter and origin check only run on HTTP requests. Sign-out is a Server Action.
- **Server-side input checks Better Auth lacks** (such as the name length) go in `hooks.before` in `src/lib/auth.ts`. The forms mirror them.
- **Read the session only through `src/lib/session.ts`:**
  - `getCurrentUser` and `requireUser` may use the 5-minute cookie cache;
  - `requireAdmin` (pages), `requireAdminForAction` (actions) and `isAdmin` (metadata) always check the database, so role changes apply immediately.
- **Roles:** `users.role` is `customer` or `admin`. A CHECK constraint and `input: false` mean clients can never set it.
- **Two-layer protection:** `src/proxy.ts` only checks for a session cookie on `/account`, `/admin` and `/checkout`. The real check is in each page, read and action.
- **Redirects after sign-in** go through `safeRedirectPath()`.
- **`npm run auth:generate` overwrites `src/db/schema/auth.ts`.** Re-apply the hand edits listed at its top. The CLI can't load configs that import `server-only`, so comment that import out in `src/db/index.ts` while it runs. The CLI is the `auth` package pinned to the `better-auth` version; `@better-auth/cli` is deprecated.

## Admin

- **Every layer re-checks the admin role on the server:** the layout's chrome, each page's content inside `<Suspense>`, every read in `src/lib/admin/data.ts`, and every action in `src/lib/admin/actions.ts` (before it reads input). Non-admins get a plain 404 with a neutral title.
- **Admin reads are uncached.**
- **Inputs are validated with zod** in `src/lib/admin/validation.ts`.
  - Slugs are fixed after creation, so URLs don't break.
  - Prices are parsed to cents from the string.
  - Only Unsplash image URLs are accepted until the image loader supports another host.
  - Unique violations become field errors.
- **Categories live at `/<slug>` next to the top-level routes.** Add any new top-level route to `RESERVED_CATEGORY_SLUGS`.

## Bag

- **One httpOnly cookie** (`atelier_bag`) holding only product ids, sizes and quantities. Prices, names, images and stock always come from the database. It's per browser and survives sign-in and sign-out. Only `src/lib/bag-actions.ts` writes it, re-validating every input.
- **A product's lines together never exceed its stock.** Lines that went stale are shown in their effective state and fixed by the next bag action.
- **The bag reserves nothing.** A signed-in customer's own checkout holds count as available to them (`getBagProducts`), so leaving Stripe without paying doesn't lock them out of their own bag.

## Checkout and orders (Stripe)

- **Stripe-hosted Checkout:** sign-in required, USD, US shipping, free shipping, no tax. Never pass `payment_method_types`. The API version is pinned to the SDK's.
- **Our database owns prices and stock.** `startCheckout`:
  1. releases the customer's earlier checkout;
  2. re-validates the bag;
  3. reserves stock and creates a `pending` order with `order_items` price snapshots, in one `txDb` transaction.

  Stripe receives inline `price_data` built from those snapshots. Never accept prices, quantities beyond stock, or payment status from the browser.
- **Only Stripe decides payment status:** the signature-verified webhook (source of truth) or a server-side `sessions.retrieve` on `/checkout/complete`, both through the idempotent `applyCheckoutSession`.
  - Each Stripe event id is recorded in `stripe_events` in the same transaction as its effects.
  - Status changes are conditional, and stock is released at most once (`stock_released_at`).
  - An amount or currency mismatch, or a payment arriving after release, becomes `needs_review`.
- **Release a hold only when nothing can still be paid:** when Stripe confirms the session `expired`, or, if the order has no session, once it's past `expires_at`. An `open` session keeps its stock. A session is attached only while its order is still `pending`.
- **Orders belong to their customer.** Customer reads always filter by the signed-in user's id. Admin order reads live only in `src/lib/admin/data.ts`.

## Design system

- **Tokens and primitives** (colours, type scale, spacing, containers, buttons, links, media) live in `src/app/globals.css`. Use them instead of raw Tailwind colours, arbitrary values or one-off styles, and add a token or `@utility` there when something is missing.
- **Look:** light-only and monochrome, with square corners and 1px hairlines. Colour only for meaning: `sale`, `error`, `success`, and `warning` for low stock.
- **Fonts:** Geist for UI, Instrument Serif (`heading-display`) only for editorial headlines.
- **Accessibility:** icon-only buttons (`btn-icon`) need an `aria-label`, and nav links set `aria-current="page"`.
- **Images:** `next/image` uses a custom loader (`src/lib/image-loader.ts`) that asks Unsplash's CDN for each width, because the built-in optimizer timed out. Don't use photos showing third-party logos or signature branded hardware.

## Verifying changes

There are no automated tests in the repo. Verify against a production build:

1. `npm run build`, then `next start` on a spare port. Set `BETTER_AUTH_URL` (and `NEXT_PUBLIC_APP_URL` at build time) to that port.
2. Drive it like a browser: the auth endpoints, plus Server Actions through the `next-action` header with React's `encodeReply`.
3. Use only test-owned products and users, and delete them afterwards. Never reset real stock, and never run `db:seed -- --reset-*` against data you haven't checked. Real open checkouts may be holding stock.
4. Sign webhook test events with `stripe.webhooks.generateTestHeaderString` and the server's secret.

A real card payment and any visual check need a browser.

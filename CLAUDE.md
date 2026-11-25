# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Next.js version warning

This is Next.js 16.4 (App Router), whose APIs and conventions differ from older versions. Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` and follow any deprecation notices. `AGENTS.md` is managed by `next dev`, which re-adds it, so don't edit or delete it.

`next.config.ts` turns on `cacheComponents` and `partialPrefetching`. Pages are prerendered by default, so dynamic data such as sessions, cookies and DB reads needs a `<Suspense>` boundary or `"use cache"`. The docs explain this in `01-app/02-guides/authentication-with-cache-components.md`.

## Commands

```bash
npm run dev          # dev server (Turbopack)
npm run build        # production build (also type-checks)
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit

npm run auth:generate  # Better Auth CLI -> writes auth tables to src/db/schema/auth.ts
npm run db:generate    # drizzle-kit: SQL migrations into ./drizzle
npm run db:migrate     # apply migrations to Neon
npm run db:push        # push schema directly (dev only)
npm run db:studio      # Drizzle Studio
npm run db:seed        # upsert the sample catalogue (src/db/seed-data.ts); resets stock
```

No test framework is configured yet.

## Environment

Env vars live in `.env.local`, which git ignores. `.env.example` is the template and has an exception in `.gitignore` so it can be committed. Required variables are `DATABASE_URL` (Neon pooled URL), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL`. `drizzle.config.ts` and `src/db/seed.ts` load `.env.local` then `.env` through `dotenv` (like Next.js), because they run outside Next.js. All tools must point at the same database.

## Architecture

- **DB:** `src/db/index.ts` exports `db`, a Drizzle client that uses the Neon HTTP driver (`drizzle-orm/neon-http`). It imports `server-only` and throws at import time if `DATABASE_URL` is missing. The HTTP driver doesn't support interactive transactions; use `neon-serverless` (WebSocket) if you need them.
- **Schema:** `src/db/schema/index.ts` is the single entry point. Put tables in separate files in that folder and re-export them from `index.ts`. Three things depend on that one export: drizzle-kit (`schema: "./src/db/schema"`), the `db` client and the Better Auth adapter.
- **Auth:** `src/lib/auth.ts` sets up Better Auth on top of `db` with `drizzleAdapter` (provider `pg`, using the same schema export). The `nextCookies()` plugin has to stay last in `plugins`. `src/app/api/auth/[...all]/route.ts` mounts the auth handler. `src/lib/auth-client.ts` is the browser/React client. When you change auth plugins or config, run `npm run auth:generate` and then the db migration scripts.
- **Routing & file layout:** folders in `src/app` are URLs. Code that only one route uses goes next to that route in a private `_components/` folder (the `_` prefix keeps it out of routing). For example, `src/app/products/[slug]/` holds `page.tsx` (data lookup and page sections), `not-found.tsx` and `_components/`. Code used by more than one route goes in `src/components/` (e.g. `product/product-card.tsx`, `ui/section-heading.tsx`, `layout/`).
- **Catalogue data:** categories, products and stock live in Postgres (`src/db/schema/catalog.ts`). `src/lib/sample-data.ts` holds only static marketing content (nav, hero, editorial, footer, featured collections).
- **Images:** `next/image` uses a global custom loader (`src/lib/image-loader.ts`, set through `images.loaderFile`) that asks Unsplash's CDN for each width directly. The built-in optimizer timed out on Unsplash originals. Add a branch to the loader when images move to your own storage. Don't use sample photos that show third-party logos or signature branded hardware.
- Path alias: `@/*` → `src/*`. Tailwind v4 is configured in CSS (`src/app/globals.css`) and has no `tailwind.config` file.

## Database conventions

- **Reads go through `src/lib/catalog.ts` only.** Pages and components never query `db` directly. Each read is a `"use cache"` function with `cacheLife` and `cacheTag("products", "product:<slug>")`, and maps rows to the `Product` type. Client components import types and helpers from `src/lib/product.ts`, never from `catalog.ts` (it is `server-only`).
- **Invalidate after writes:** call `revalidateTag("products")`, or `updateTag` inside a Server Action, after changing catalogue data.
- **Money is integer cents** (`price_cents`). Never store floats or `numeric`; convert to display units only in the mapping layer.
- **Stock lives in its own table** (`product_stock`, 1:1 with `products`), one quantity per product. Decrement it with a conditional update (`quantity = quantity - n WHERE quantity >= n`), never read-then-write.
- **Keep the first version small:** no carts, orders, payments, reviews, wishlists or variants until asked. `sizes` is a JSONB list with an `available` flag only; per-size stock would mean introducing variants.
- **Enforce integrity in the database:** use CHECK constraints, unique slugs and references, `ON DELETE RESTRICT` from products to categories, and `CASCADE` from stock to products.
- **Schema changes use versioned migrations:** run `db:generate`, review the SQL in `drizzle/`, run `db:migrate`, and commit the migration. Don't use `db:push` on shared databases.
- **Scripts outside Next** (`src/db/seed.ts`, drizzle-kit): use relative imports and their own Drizzle client. Don't import `@/` paths or `src/db/index.ts`, which is `server-only`. `db:seed` upserts by slug and resets stock to the seed values.
- **`generateStaticParams` with Cache Components** must never return `[]`. Return a placeholder slug that `notFound()`s when the table is empty. `next build` queries the database, so `DATABASE_URL` must be reachable at build time.

## Design system

All tokens and primitives live in `src/app/globals.css`. Use them rather than raw Tailwind colours, arbitrary values or one-off styles. Add a token or `@utility` there when something is missing.

- **Look:** light-only and monochrome, with square corners and 1px hairlines. Colour is used only for meaning (`sale`, `error`, `success`, `warning` for low stock).
- **Colours:** `paper`, `surface`, `surface-strong`, `ink`, `ink-soft`, `muted`, `subtle`, `line`, `line-strong`, `overlay`.
- **Type:** `font-sans` (Geist) for UI and body text, `font-display` / `heading-display` (Instrument Serif) for editorial headlines. The size scale is `text-caption|label|body-sm|body|lead|title|headline|display`. Use `eyebrow` for uppercase tracked labels.
- **Spacing & width:** `px-gutter` for page padding, `section` for vertical rhythm, `h-header` / `scroll-mt-header`. Containers are `container-site|content|narrow`, and `full-bleed` breaks out to the screen edges.
- **Buttons:** `btn` plus one of `btn-primary|secondary|inverse|paper|ghost` (`inverse`/`paper` sit on top of imagery), with optional `btn-sm|lg|block`. Use `btn-icon` for icon-only buttons, which need an `aria-label`.
- **Links:** `link` for body text, `link-subtle` for footer and product details, `link-nav` for navigation (set `aria-current="page"`).
- **Layout & media:** `grid-products`, `grid-editorial`, `media-product`, `media-hero`, `divider`, `hairline`.

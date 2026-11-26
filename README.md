# Atelier Store

A fashion storefront built with Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS v4, Better Auth, Drizzle ORM, Neon Postgres and Stripe Checkout.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in every variable (database, auth, Stripe)
npm run db:migrate           # create the tables
npm run db:seed              # add the sample catalogue
npm run dev
```

To mark orders paid locally, forward Stripe webhooks while the dev server runs:

```bash
npx @stripe/cli listen --api-key <STRIPE_SECRET_KEY> --forward-to localhost:3000/api/stripe/webhook
```

`--print-secret` prints the value for `STRIPE_WEBHOOK_SECRET`.

To open the admin area, sign up and then run `npm run auth:set-role -- <email> admin`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js (the build queries the database) |
| `npm run lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `npm run db:generate` | Generate SQL migrations from the Drizzle schema |
| `npm run db:migrate` | Apply migrations |
| `npm run db:push` | Push the schema directly (throwaway databases only) |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:seed` | Add missing sample categories, products and stock (never overwrites) |
| `npm run db:seed -- --reset-catalog` | Overwrite seeded categories and products with the seed values |
| `npm run db:seed -- --reset-stock` | Overwrite stock (refused while checkouts hold stock) |
| `npm run auth:generate` | Regenerate the Better Auth tables in `src/db/schema/auth.ts` |
| `npm run auth:set-role -- <email> <customer\|admin>` | Change a user's role |

## Structure

```
src/
  app/
    (auth)/                 Sign in and sign up
    [category]/, new-in/    Product listings
    products/[slug]/        Product detail
    search/                 Search
    bag/                    Shopping bag
    checkout/               Return from Stripe and order confirmation
    account/                Customer account and order history
    admin/                  Products, stock, categories and orders (admins only)
    api/auth/, api/stripe/  Better Auth handler and Stripe webhook
  components/               Shared UI (layout, product, order, home, auth, ui)
  db/
    schema/                 Catalogue, auth and order tables
    index.ts, pool.ts       Drizzle clients (HTTP, and WebSocket for transactions)
    seed.ts, set-role.ts    Scripts run outside Next
  lib/                      Server data access, session, bag, checkout and admin logic
  proxy.ts                  Redirects signed-out visitors from protected areas
drizzle/                    Versioned SQL migrations
```

Project conventions are recorded in `CLAUDE.md`.

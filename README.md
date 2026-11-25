# Atelier Store

Next.js (App Router) + TypeScript + Tailwind CSS + Better Auth + Drizzle ORM + Neon Postgres.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL and BETTER_AUTH_SECRET
npm run dev
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `npm run auth:generate` | Generate Better Auth tables into `src/db/schema/auth.ts` |
| `npm run db:generate` | Generate SQL migrations from the Drizzle schema |
| `npm run db:migrate` | Apply migrations to Neon |
| `npm run db:push` | Push schema directly (dev only) |
| `npm run db:studio` | Open Drizzle Studio |

## Structure

```
src/
  app/
    api/auth/[...all]/route.ts   Better Auth route handler
    layout.tsx, page.tsx         Minimal shell
  db/
    index.ts                     Drizzle client (Neon HTTP driver)
    schema/index.ts              Schema entry point (empty)
  lib/
    auth.ts                      Better Auth server instance
    auth-client.ts               Better Auth React client
drizzle.config.ts                drizzle-kit config (reads .env.local)
```

// Transactional database client (Neon WebSocket Pool). The default `db` in ./index.ts
// uses the HTTP driver, which can't run interactive transactions. Use this client
// only where several writes must succeed or fail together with row locks: stock
// reservation at checkout and Stripe webhook processing (src/lib/orders.ts).
// Node 22+ has a global WebSocket, so no `ws` package is needed.
import "server-only";

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. See .env.example.");
}

const pool = new Pool({ connectionString: databaseUrl, max: 5 });

export const txDb = drizzle({ client: pool, schema });

export type Tx = Parameters<Parameters<typeof txDb.transaction>[0]>[0];

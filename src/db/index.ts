import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. See .env.example.");
}

// The template value from .env.example fails later with an opaque "Failed query".
if (/@HOST\.|USER:PASSWORD/.test(databaseUrl)) {
  throw new Error(
    "DATABASE_URL in .env.local is still the placeholder from .env.example. " +
      "Paste your Neon pooled connection string, save, and restart `npm run dev`.",
  );
}

const sql = neon(databaseUrl);

export const db = drizzle({ client: sql, schema });

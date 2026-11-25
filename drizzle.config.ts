import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Same files Next.js reads; .env.local wins when both set a value.
config({ path: [".env.local", ".env"], quiet: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. See .env.example.");
}

if (/@HOST\.|USER:PASSWORD/.test(process.env.DATABASE_URL)) {
  throw new Error("DATABASE_URL in .env.local is still the placeholder from .env.example.");
}

export default defineConfig({
  schema: "./src/db/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});

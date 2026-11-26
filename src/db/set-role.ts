// Grants or removes admin access: `npm run auth:set-role -- <email> <customer|admin>`.
// The user must already have signed up. The change applies on their next request to
// /admin (requireAdmin skips the session cookie cache).
//
// Standalone script: own Drizzle client and relative imports, like seed.ts, because
// src/db/index.ts imports `server-only`.
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import { users } from "./schema/auth";

// Same files Next.js reads; .env.local wins when both set a value.
config({ path: [".env.local", ".env"], quiet: true });

const ROLES = ["customer", "admin"] as const;
type Role = (typeof ROLES)[number];

function usage(message: string): never {
  console.error(`${message}\nUsage: npm run auth:set-role -- <email> <customer|admin>`);
  process.exit(1);
}

async function main() {
  const [emailArg, roleArg] = process.argv.slice(2);
  if (!emailArg || !roleArg) usage("Missing arguments.");
  if (!ROLES.includes(roleArg as Role)) usage(`Unknown role "${roleArg}".`);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set. See .env.example.");

  const db = drizzle({ client: neon(databaseUrl) });
  const email = emailArg.trim().toLowerCase();

  const updated = await db
    .update(users)
    .set({ role: roleArg as Role })
    .where(eq(sql`lower(${users.email})`, email))
    .returning({ email: users.email, role: users.role });

  if (updated.length === 0) {
    console.error(`No user with email ${email}. They need to sign up first.`);
    process.exit(1);
  }

  console.log(`${updated[0].email} is now "${updated[0].role}".`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

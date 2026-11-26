import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";
import * as schema from "@/db/schema";

/** Longest accepted display name (matches the sign-up form). */
const NAME_MAX = 100;

// Server-side auth instance. Pages, layouts and actions read the session through
// src/lib/session.ts, never by calling auth.api.getSession directly.
// After changing this config, run `npm run auth:generate` then the db migration scripts.
export const auth = betterAuth({
  appName: "Atelier",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    // Plural table names (users, sessions...) to match products / categories.
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Sign the customer in straight after sign-up.
    autoSignIn: true,
    // No email sender yet; turn on together with emailVerification.sendVerificationEmail.
    requireEmailVerification: false,
  },
  // Server-side checks Better Auth doesn't do itself. The sign-up form validates the same
  // rules, but the endpoint can be called directly.
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      const name = (ctx.body as { name?: unknown } | undefined)?.name;
      if (typeof name !== "string" || name.trim().length === 0 || name.trim().length > NAME_MAX) {
        throw new APIError("BAD_REQUEST", {
          message: `Enter a name of 1–${NAME_MAX} characters.`,
          code: "INVALID_NAME",
        });
      }
    }),
  },
  user: {
    additionalFields: {
      // input: false — clients can never set their own role (e.g. in the sign-up body).
      // Grant admin with `npm run auth:set-role -- <email> admin`.
      role: { type: "string", required: false, defaultValue: "customer", input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // persistent: 30 days
    updateAge: 60 * 60 * 24, // extended at most once a day while in use
    // Signed copy of the session in a cookie for 5 minutes, saving a DB read per request.
    // requireAdmin() bypasses it so a role change applies immediately.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  // Database storage so limits are shared across serverless instances.
  rateLimit: { enabled: true, storage: "database" },
  // Must stay last so cookies set in server actions are applied.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;

export const ROLES = ["customer", "admin"] as const;
export type Role = (typeof ROLES)[number];

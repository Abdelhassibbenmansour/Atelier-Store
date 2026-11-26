// Stripe client (server only). Created on first use so pages that never touch Stripe
// (and `next build`) don't need the keys. Use a restricted key (rk_…) with only the
// permissions checkout needs; see .env.example.
import "server-only";

import Stripe from "stripe";

/** Stripe isn't set up (missing env var), as opposed to Stripe rejecting a request. */
export class StripeConfigError extends Error {}

let client: Stripe | undefined;

export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new StripeConfigError("STRIPE_SECRET_KEY is not set. See .env.example.");
    // Pinned to the SDK's API version so webhook payloads match the types.
    client = new Stripe(key, { apiVersion: "2026-11-18.endive" });
  }
  return client;
}

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new StripeConfigError("STRIPE_WEBHOOK_SECRET is not set. See .env.example.");
  return secret;
}

/** Absolute site URL for Stripe redirect URLs. */
export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL;
  if (!url) throw new StripeConfigError("NEXT_PUBLIC_APP_URL is not set. See .env.example.");
  return url.replace(/\/$/, "");
}

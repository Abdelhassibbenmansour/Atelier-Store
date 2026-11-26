// Stripe webhook endpoint. The source of truth for payment status.
//
// 1. Verify the signature against the raw body (invalid → 400, nothing processed).
// 2. processStripeEvent records the event id and applies it in one transaction, so a
//    duplicate delivery is a no-op.
// 3. Database errors answer 500 so Stripe retries; everything else answers 200.
//
// Local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
import type Stripe from "stripe";

import { processStripeEvent } from "@/lib/orders";
import { getStripe, getWebhookSecret } from "@/lib/stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let stripe: Stripe;
  let secret: string;
  try {
    stripe = getStripe();
    secret = getWebhookSecret();
  } catch (error) {
    // Misconfiguration, not a bad request: 500 so Stripe retries once it's fixed.
    console.error("[stripe] webhook not configured", error);
    return new Response("Webhook not configured", { status: 500 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    const outcome = await processStripeEvent(event);
    if (outcome !== "ignored") console.info(`[stripe] ${event.type} ${event.id}: ${outcome}`);
    return Response.json({ received: true, outcome });
  } catch (error) {
    console.error(`[stripe] failed to process ${event.type} ${event.id}`, error);
    return new Response("Processing failed", { status: 500 });
  }
}

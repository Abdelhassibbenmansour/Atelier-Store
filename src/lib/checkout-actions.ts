"use server";

// Starts Stripe Checkout for the signed-in customer's bag. Prices sent to Stripe come
// from the order just created from database prices — never from the browser or the
// bag cookie. See "Checkout and orders" in CLAUDE.md.

import { randomBytes } from "node:crypto";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { getProductsForBag } from "@/lib/catalog";
import { clearBag, priceBag, readBag } from "@/lib/bag";
import {
  attachCheckoutSession,
  cancelOrder,
  getOrderForUser,
  reserveAndCreateOrder,
  supersedePendingOrders,
  sweepExpiredReservations,
  type ReservedOrder,
} from "@/lib/orders";
import { getCurrentUser, requireUser } from "@/lib/session";
import { getAppUrl, getStripe, StripeConfigError } from "@/lib/stripe";

export type CheckoutState = { status: "idle" } | { status: "error"; message: string };

/** clearBagAfterConfirmation only acts this soon after the order was confirmed. */
const CONFIRMATION_WINDOW_MS = 15 * 60 * 1000;

const BAG_CHANGED =
  "Some pieces just sold out or changed. Check the notes on the pieces in your bag, then try again.";

export async function startCheckout(): Promise<CheckoutState> {
  const user = await requireUser("/bag");

  // 0. Stripe must be configured before we reserve anything or touch older checkouts.
  try {
    getStripe();
    getAppUrl();
  } catch (error) {
    if (error instanceof StripeConfigError) return checkoutUnavailable(error);
    throw error;
  }

  const lines = await readBag();
  if (lines.length === 0) return { status: "error", message: "Your bag is empty." };

  // 1. Release this customer's own earlier checkout FIRST (e.g. they went back from
  //    Stripe), so its held units count as available again, then reconcile stale ones.
  //    Neither may block checkout: if Stripe can't be reached, holds still expire.
  try {
    await supersedePendingOrders(user.id);
  } catch (error) {
    console.error(`[checkout] could not supersede earlier checkouts for user ${user.id}`, error);
  }
  try {
    await sweepExpiredReservations();
  } catch (error) {
    console.error("[checkout] could not sweep expired reservations", error);
  }

  // 2. The bag must be valid against current (real) stock and prices.
  const bag = priceBag(lines, await getProductsForBag(lines.map((line) => line.productId)));
  if (bag.hasIssues || bag.itemCount === 0) {
    refresh(); // re-render the bag so the changed lines show their stock notices
    return { status: "error", message: BAG_CHANGED };
  }

  // 3. Authoritative stock check + reservation + order with DB prices (one transaction).
  const reserved = await reserveAndCreateOrder(user.id, bag.lines);
  if (!reserved.ok) {
    refresh(); // stock changed since the bag was shown: show current availability
    return { status: "error", message: BAG_CHANGED };
  }

  // 4. Stripe Checkout Session for exactly that order.
  let checkoutUrl: string;
  try {
    checkoutUrl = await createCheckoutSession(reserved.order, user.email);
  } catch (error) {
    console.error(`[checkout] could not create session for order ${reserved.order.id}`, error);
    await cancelOrder(reserved.order.id);
    return checkoutUnavailable(error);
  }

  redirect(checkoutUrl);
}

/** Generic message; in development, says what's wrong when Stripe isn't configured. */
function checkoutUnavailable(error: unknown): CheckoutState {
  if (error instanceof StripeConfigError && process.env.NODE_ENV !== "production") {
    return { status: "error", message: `Stripe isn't configured: ${error.message}` };
  }
  return {
    status: "error",
    message: "Checkout is unavailable right now. Your bag is unchanged. Please try again.",
  };
}

async function createCheckoutSession(order: ReservedOrder, email: string) {
  const appUrl = getAppUrl();

  const session = await getStripe().checkout.sessions.create(
    {
      mode: "payment",
      client_reference_id: order.id,
      metadata: { order_id: order.id },
      payment_intent_data: { metadata: { order_id: order.id } },
      customer_email: email,
      line_items: order.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: "usd",
          unit_amount: item.unitPriceCents,
          product_data: {
            name: item.name,
            ...(item.size ? { description: `Size ${item.size}` } : {}),
            ...(item.imageSrc ? { images: [item.imageSrc] } : {}),
          },
        },
      })),
      // Free shipping within the US for now; the total equals the subtotal.
      shipping_address_collection: { allowed_countries: ["US"] },
      expires_at: Math.floor(order.expiresAt.getTime() / 1000),
      success_url: `${appUrl}/checkout/complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/bag?checkout=canceled`,
      integration_identifier: `atelier-web-${randomLetters(8)}`,
    },
    // Retrying the same order can never create a second session.
    { idempotencyKey: `checkout-${order.id}` },
  );

  if (!session.url) throw new Error("Stripe returned no checkout URL");
  if (!(await attachCheckoutSession(order.id, session.id))) {
    // The order was canceled meanwhile (e.g. a checkout started in another tab
    // superseded it): never send the customer to pay for an order without stock.
    await getStripe()
      .checkout.sessions.expire(session.id)
      .catch(() => {});
    throw new Error(`Order ${order.id} is no longer pending`);
  }
  return session.url;
}

function randomLetters(length: number) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  return Array.from(randomBytes(length), (byte) => alphabet[byte % alphabet.length]).join("");
}

/**
 * Empties the bag once an order is confirmed, for customers who reached the
 * confirmation page before Stripe's webhook did. The order id comes from the browser,
 * so it's only a lookup: the order must belong to the signed-in customer and be
 * confirmed in our database.
 */
export async function clearBagAfterConfirmation(orderId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user || typeof orderId !== "string") return;

  const order = await getOrderForUser(orderId, user.id);
  if (!order || !["paid", "processing", "needs_review"].includes(order.status)) return;
  // Only right after confirmation: an old order id must not empty today's bag.
  const confirmedAt = (order.paidAt ?? order.updatedAt).getTime();
  if (Date.now() - confirmedAt > CONFIRMATION_WINDOW_MS) return;
  await clearBag();
}

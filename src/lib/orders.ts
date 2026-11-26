// Orders, stock reservation and Stripe reconciliation (server only).
//
// Rules (see "Checkout and orders" in CLAUDE.md):
// - Prices come from the database at checkout and are snapshotted in order_items.
//   Nothing price- or status-related is taken from the browser.
// - Stock is reserved (decremented) when the order is created, inside a transaction
//   with row locks, and returned exactly once if the order fails, expires or is
//   canceled (guarded by stock_released_at and conditional status updates).
// - Payment status comes only from Stripe: a signature-verified webhook event, or a
//   Checkout Session retrieved server-side. Both go through applyCheckoutSession().
// - Every Stripe event id is recorded in stripe_events in the same transaction as
//   its effects, so duplicate deliveries are no-ops.
import "server-only";

import { and, asc, desc, eq, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";
import type Stripe from "stripe";

import { db } from "@/db";
import { txDb, type Tx } from "@/db/pool";
import {
  orderItems,
  orders,
  products,
  productStock,
  stripeEvents,
  type OrderShipping,
  type OrderStatus,
} from "@/db/schema";
import { isValidSize, type BagLine } from "@/lib/bag-types";
import { invalidateProductStock } from "@/lib/stock-cache";
import { isUuid } from "@/lib/ids";
import { getStripe } from "@/lib/stripe";

/** Stripe's minimum session lifetime is 30 minutes; add a margin for clock skew. */
const CHECKOUT_TTL_MS = 31 * 60 * 1000;
/** Pending orders this long past expiry are reconciled even if no webhook arrived. */
const SWEEP_GRACE_MS = 15 * 60 * 1000;

const RELEASED_STATUSES: OrderStatus[] = ["failed", "expired", "canceled"];

/* ---------------------------------------------------------------------------
   Reservation
   --------------------------------------------------------------------------- */

export type ReservedOrder = {
  id: string;
  expiresAt: Date;
  subtotalCents: number;
  items: {
    productId: string;
    name: string;
    size: string | null;
    unitPriceCents: number;
    quantity: number;
    imageSrc: string | undefined;
  }[];
};

export type ReserveResult =
  | { ok: true; order: ReservedOrder }
  | { ok: false; reason: "empty" | "unavailable" };

class ReservationError extends Error {}

/**
 * Authoritative stock check: locks the products' stock rows, re-validates sizes and
 * quantities, decrements stock and creates a pending order with DB prices — all in
 * one transaction. Concurrent checkouts for the last unit serialize on the row lock;
 * only one can succeed.
 */
export async function reserveAndCreateOrder(
  userId: string,
  lines: BagLine[],
): Promise<ReserveResult> {
  const wanted = lines.filter((line) => line.quantity > 0);
  if (wanted.length === 0) return { ok: false, reason: "empty" };
  const productIds = [...new Set(wanted.map((line) => line.productId))].sort();

  try {
    const order = await txDb.transaction(async (tx) => {
      const rows = await tx
        .select({
          id: products.id,
          name: products.name,
          priceCents: products.priceCents,
          sizes: products.sizes,
          images: products.images,
          stock: productStock.quantity,
        })
        .from(products)
        .innerJoin(productStock, eq(productStock.productId, products.id))
        .where(inArray(products.id, productIds))
        .orderBy(asc(products.id)) // consistent lock order avoids deadlocks
        .for("update", { of: productStock });

      const byId = new Map(rows.map((row) => [row.id, row]));
      const totals = new Map<string, number>();

      const items = wanted.map((line) => {
        const product = byId.get(line.productId);
        if (!product || !isValidSize({ sizes: product.sizes ?? undefined }, line.size)) {
          throw new ReservationError();
        }
        totals.set(product.id, (totals.get(product.id) ?? 0) + line.quantity);
        return {
          productId: product.id,
          name: product.name,
          size: line.size,
          unitPriceCents: product.priceCents,
          quantity: line.quantity,
          imageSrc: product.images[0]?.src,
        };
      });

      for (const [productId, quantity] of totals) {
        if (quantity > (byId.get(productId)?.stock ?? 0)) throw new ReservationError();
        // Conditional decrement (never read-then-write): the row lock above already
        // guarantees it, and this keeps it true even if that changes.
        const [decremented] = await tx
          .update(productStock)
          .set({ quantity: sql`${productStock.quantity} - ${quantity}` })
          .where(
            and(eq(productStock.productId, productId), gte(productStock.quantity, quantity)),
          )
          .returning({ productId: productStock.productId });
        if (!decremented) throw new ReservationError();
      }

      const subtotalCents = items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);
      const expiresAt = new Date(Date.now() + CHECKOUT_TTL_MS);

      const [created] = await tx
        .insert(orders)
        .values({ userId, subtotalCents, expiresAt })
        .returning({ id: orders.id });

      await tx.insert(orderItems).values(
        items.map((item) => ({
          orderId: created.id,
          productId: item.productId,
          productName: item.name,
          size: item.size,
          unitPriceCents: item.unitPriceCents,
          quantity: item.quantity,
        })),
      );

      return { id: created.id, expiresAt, subtotalCents, items };
    });

    // Stock changed: refresh cached product pages now that the transaction committed.
    await invalidateProductStock(order.items.map((item) => item.productId));
    return { ok: true, order };
  } catch (error) {
    if (error instanceof ReservationError) return { ok: false, reason: "unavailable" };
    throw error;
  }
}

/**
 * Saves the Stripe session id on a still-pending order. Returns false if the order
 * was canceled meanwhile (e.g. superseded by a checkout in another tab), in which case
 * the caller must not send the customer to that session.
 */
export async function attachCheckoutSession(orderId: string, sessionId: string) {
  const [attached] = await db
    .update(orders)
    .set({ stripeCheckoutSessionId: sessionId })
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.status, "pending"),
        isNull(orders.stripeCheckoutSessionId),
      ),
    )
    .returning({ id: orders.id });
  return Boolean(attached);
}

/** Stripe session could not be created: cancel the order and return its stock. */
export async function cancelOrder(orderId: string) {
  const released = new Set<string>();
  await txDb.transaction((tx) => releaseOrder(tx, orderId, ["pending"], "canceled", released));
  await invalidateProductStock(released);
}

/* ---------------------------------------------------------------------------
   Status transitions (always conditional; release stock at most once)
   --------------------------------------------------------------------------- */

/**
 * Moves an order from one of `from` to `to` and returns its stock. Does nothing
 * (returns false) if another transaction already moved it or released its stock.
 * Product ids whose stock went back up are added to `released`; the caller refreshes
 * their cached pages after its transaction commits (invalidateProductStock).
 */
async function releaseOrder(
  tx: Tx,
  orderId: string,
  from: OrderStatus[],
  to: OrderStatus,
  released: Set<string>,
) {
  const [updated] = await tx
    .update(orders)
    .set({ status: to, stockReleasedAt: sql`now()` })
    .where(
      and(eq(orders.id, orderId), inArray(orders.status, from), isNull(orders.stockReleasedAt)),
    )
    .returning({ id: orders.id });
  if (!updated) return false;

  const items = await tx
    .select({ productId: orderItems.productId, quantity: orderItems.quantity })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  const totals = new Map<string, number>();
  for (const item of items) {
    totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity);
  }
  for (const [productId, quantity] of [...totals].sort(([a], [b]) => a.localeCompare(b))) {
    await tx
      .update(productStock)
      .set({ quantity: sql`${productStock.quantity} + ${quantity}` })
      .where(eq(productStock.productId, productId));
    released.add(productId);
  }
  return true;
}

type LockedOrder = typeof orders.$inferSelect;

/** The order a session belongs to, locked for this transaction. Null if it doesn't match. */
async function lockOrderForSession(tx: Tx, session: Stripe.Checkout.Session) {
  const orderId = session.client_reference_id ?? session.metadata?.order_id;
  if (!orderId || !isUuid(orderId)) return null;

  const [order] = await tx
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.id, orderId),
        // Null only if we crashed between creating the session and saving its id.
        or(eq(orders.stripeCheckoutSessionId, session.id), isNull(orders.stripeCheckoutSessionId)),
      ),
    )
    .limit(1)
    .for("update");
  return order ?? null;
}

function shippingFrom(session: Stripe.Checkout.Session): OrderShipping | null {
  const details = session.collected_information?.shipping_details;
  if (!details) return null;
  const a = details.address;
  return {
    name: details.name ?? null,
    address: a
      ? {
          line1: a.line1 ?? null,
          line2: a.line2 ?? null,
          city: a.city ?? null,
          state: a.state ?? null,
          postalCode: a.postal_code ?? null,
          country: a.country ?? null,
        }
      : null,
  };
}

function paymentDetails(session: Stripe.Checkout.Session) {
  return {
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? null),
    email: session.customer_details?.email ?? session.customer_email ?? null,
    shipping: shippingFrom(session),
    amountTotalCents: session.amount_total,
  };
}

/**
 * Payment confirmed by Stripe. The charged amount and currency must match the order
 * built from database prices; otherwise the order is flagged for review. A payment
 * for an order whose stock was already released is also flagged (never re-reserved
 * silently).
 */
async function markPaid(tx: Tx, order: LockedOrder, session: Stripe.Checkout.Session) {
  if (order.status === "paid" || order.status === "needs_review") return order.status;

  const released = RELEASED_STATUSES.includes(order.status);
  const mismatch =
    session.currency !== order.currency || session.amount_total !== order.subtotalCents;
  const status: OrderStatus = released || mismatch ? "needs_review" : "paid";
  if (status === "needs_review") {
    console.error(
      `[orders] order ${order.id} needs review: status=${order.status}, ` +
        `charged ${session.amount_total} ${session.currency}, expected ${order.subtotalCents} ${order.currency}`,
    );
  }

  await tx
    .update(orders)
    .set({ status, paidAt: sql`now()`, ...paymentDetails(session) })
    .where(eq(orders.id, order.id));
  return status;
}

/**
 * Applies the state of a Checkout Session (from a webhook payload or a server-side
 * retrieve) to its order. Idempotent: running it twice changes nothing.
 */
async function applyCheckoutSession(
  tx: Tx,
  order: LockedOrder,
  session: Stripe.Checkout.Session,
  released: Set<string>,
): Promise<string> {
  if (session.status === "complete") {
    if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
      return markPaid(tx, order, session);
    }
    // Delayed payment method: wait for async_payment_succeeded / _failed.
    await tx
      .update(orders)
      .set({ status: "processing", ...paymentDetails(session) })
      .where(and(eq(orders.id, order.id), eq(orders.status, "pending")));
    return "processing";
  }
  if (session.status === "expired") {
    return (await releaseOrder(tx, order.id, ["pending"], "expired", released))
      ? "expired"
      : order.status;
  }
  return order.status; // still open
}

/* ---------------------------------------------------------------------------
   Webhooks
   --------------------------------------------------------------------------- */

const HANDLED_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
]);

/**
 * Processes a signature-verified Stripe event exactly once. Returns a short outcome
 * for logging. Throws on database errors so the route answers 500 and Stripe retries.
 */
export async function processStripeEvent(event: Stripe.Event): Promise<string> {
  if (!HANDLED_EVENTS.has(event.type)) return "ignored";

  const released = new Set<string>();
  const outcome = await txDb.transaction(async (tx) => {
    const recorded = await tx
      .insert(stripeEvents)
      .values({ id: event.id, type: event.type })
      .onConflictDoNothing()
      .returning({ id: stripeEvents.id });
    if (recorded.length === 0) return "duplicate";

    const session = event.data.object as Stripe.Checkout.Session;
    const order = await lockOrderForSession(tx, session);
    if (!order) return "unknown_order";

    switch (event.type) {
      case "checkout.session.completed":
        return applyCheckoutSession(tx, order, session, released);
      case "checkout.session.async_payment_succeeded":
        return markPaid(tx, order, session);
      case "checkout.session.async_payment_failed":
        return (await releaseOrder(tx, order.id, ["processing", "pending"], "failed", released))
          ? "failed"
          : order.status;
      case "checkout.session.expired":
        return (await releaseOrder(tx, order.id, ["pending"], "expired", released))
          ? "expired"
          : order.status;
      default:
        return "ignored";
    }
  });

  await invalidateProductStock(released);
  return outcome;
}

/* ---------------------------------------------------------------------------
   Reconciliation with Stripe (return URL, superseded and stale orders)
   --------------------------------------------------------------------------- */

/** Applies a server-side retrieved session to its order (return URL path). */
export async function syncOrderWithSession(session: Stripe.Checkout.Session) {
  const released = new Set<string>();
  const outcome = await txDb.transaction(async (tx) => {
    const order = await lockOrderForSession(tx, session);
    return order ? applyCheckoutSession(tx, order, session, released) : "unknown_order";
  });
  await invalidateProductStock(released);
  return outcome;
}

/**
 * Ends a pending order that is no longer wanted (superseded or stale). Asks Stripe
 * first: if the customer actually completed payment, the order is marked paid or
 * processing instead of being released.
 */
async function settlePendingOrder(
  order: { id: string; stripeCheckoutSessionId: string | null; expiresAt: Date },
  releaseAs: OrderStatus,
) {
  let session: Stripe.Checkout.Session | null = null;
  if (order.stripeCheckoutSessionId) {
    const stripe = getStripe();
    try {
      session = await stripe.checkout.sessions.expire(order.stripeCheckoutSessionId);
    } catch {
      // Already expired or completed — or the call failed: read its real state.
      session = await stripe.checkout.sessions.retrieve(order.stripeCheckoutSessionId);
    }
    // Still open (expire failed): the customer could still pay, so keep the stock
    // held. The session expires on its own and the webhook releases it then.
    if (session.status === "open") return;
  } else if (order.expiresAt.getTime() > Date.now()) {
    // No session yet: another tab may be creating it right now. Any session for this
    // order carries the same expires_at, so it's only safe to release after that.
    return;
  }

  const released = new Set<string>();
  await txDb.transaction(async (tx) => {
    if (session?.status === "complete") {
      const locked = await lockOrderForSession(tx, session);
      if (locked) await applyCheckoutSession(tx, locked, session, released);
      return;
    }
    // Session expired (or never created and past its expiry): nothing can be paid.
    await releaseOrder(tx, order.id, ["pending"], releaseAs, released);
  });
  await invalidateProductStock(released);
}

/** Before a new checkout: end this customer's earlier pending checkouts. */
export async function supersedePendingOrders(userId: string) {
  const pending = await db
    .select({ id: orders.id, stripeCheckoutSessionId: orders.stripeCheckoutSessionId, expiresAt: orders.expiresAt })
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.status, "pending")));
  for (const order of pending) await settlePendingOrder(order, "canceled");
}

/** Safety net for missed webhooks: reconcile pending orders well past expiry. */
export async function sweepExpiredReservations(limit = 20) {
  const stale = await db
    .select({ id: orders.id, stripeCheckoutSessionId: orders.stripeCheckoutSessionId, expiresAt: orders.expiresAt })
    .from(orders)
    .where(
      and(
        eq(orders.status, "pending"),
        lt(orders.expiresAt, new Date(Date.now() - SWEEP_GRACE_MS)),
      ),
    )
    .limit(limit);

  for (const order of stale) {
    try {
      await settlePendingOrder(order, "expired");
    } catch (error) {
      console.error(`[orders] could not reconcile stale order ${order.id}`, error);
    }
  }
}

/* ---------------------------------------------------------------------------
   Reads
   --------------------------------------------------------------------------- */

export type OrderDetails = typeof orders.$inferSelect & {
  items: {
    productName: string;
    size: string | null;
    unitPriceCents: number;
    quantity: number;
    slug: string;
    image: { src: string; alt: string } | undefined;
  }[];
};

/** An order with its items, only if it belongs to `userId`. Fresh read (not cached). */
export async function getOrderForUser(
  orderId: string,
  userId: string,
): Promise<OrderDetails | null> {
  if (!isUuid(orderId)) return null;

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);
  if (!order) return null;

  const items = await db
    .select({
      productName: orderItems.productName,
      size: orderItems.size,
      unitPriceCents: orderItems.unitPriceCents,
      quantity: orderItems.quantity,
      slug: products.slug,
      images: products.images,
    })
    .from(orderItems)
    .innerJoin(products, eq(products.id, orderItems.productId))
    .where(eq(orderItems.orderId, orderId))
    .orderBy(asc(orderItems.productName));

  return {
    ...order,
    items: items.map(({ images, ...item }) => ({ ...item, image: images[0] })),
  };
}

/**
 * Orders shown in a customer's order history: ones where Stripe completed checkout.
 * Abandoned, expired and canceled checkouts (no payment taken) are left out.
 */
const ORDER_HISTORY_STATUSES: OrderStatus[] = ["paid", "processing", "needs_review", "failed"];

export type OrderSummary = {
  id: string;
  status: OrderStatus;
  createdAt: Date;
  totalCents: number;
  itemCount: number;
  itemNames: string[];
  image: { src: string; alt: string } | undefined;
};

/** The signed-in customer's orders, newest first. Fresh read (not cached). */
export async function listOrdersForUser(userId: string, limit = 50): Promise<OrderSummary[]> {
  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      createdAt: orders.createdAt,
      subtotalCents: orders.subtotalCents,
      amountTotalCents: orders.amountTotalCents,
    })
    .from(orders)
    .where(and(eq(orders.userId, userId), inArray(orders.status, ORDER_HISTORY_STATUSES)))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
  if (rows.length === 0) return [];

  const items = await db
    .select({
      orderId: orderItems.orderId,
      productName: orderItems.productName,
      quantity: orderItems.quantity,
      images: products.images,
    })
    .from(orderItems)
    .innerJoin(products, eq(products.id, orderItems.productId))
    .where(inArray(orderItems.orderId, rows.map((row) => row.id)))
    .orderBy(asc(orderItems.productName));

  return rows.map((row) => {
    const own = items.filter((item) => item.orderId === row.id);
    return {
      id: row.id,
      status: row.status,
      createdAt: row.createdAt,
      // What Stripe charged once paid; the order's own total before that.
      totalCents: row.amountTotalCents ?? row.subtotalCents,
      itemCount: own.reduce((sum, item) => sum + item.quantity, 0),
      itemNames: own.map((item) => item.productName),
      image: own[0]?.images[0],
    };
  });
}

/** The order id for a Checkout Session, only if it belongs to `userId`. */
export async function getOrderIdForSession(sessionId: string, userId: string) {
  const [order] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.stripeCheckoutSessionId, sessionId), eq(orders.userId, userId)))
    .limit(1);
  return order?.id ?? null;
}

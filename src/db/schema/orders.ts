// Orders created by Stripe Checkout. See "Checkout and orders" in CLAUDE.md.
//
// An order is created (status "pending") when the customer presses Checkout, in the
// same transaction that reserves its stock. Stripe webhooks then move it to paid,
// processing, failed or expired; failed/expired/canceled orders give their stock back
// exactly once (stock_released_at).
import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { products } from "./catalog";

export const ORDER_STATUSES = [
  "pending", // stock reserved, customer on (or sent to) Stripe Checkout
  "processing", // checkout completed, delayed payment method not settled yet
  "paid",
  "failed", // delayed payment failed; stock released
  "expired", // checkout session expired or abandoned; stock released
  "canceled", // superseded by a newer checkout or Stripe session never created; stock released
  "needs_review", // paid, but the amount/currency didn't match the order
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderShipping = {
  name: string | null;
  address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
  } | null;
};

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: text("status").$type<OrderStatus>().notNull().default("pending"),
    currency: text("currency").notNull().default("usd"),
    /** Sum of order_items, from database prices at checkout. What Stripe must charge. */
    subtotalCents: integer("subtotal_cents").notNull(),
    /** What Stripe reports it charged (set when paid). */
    amountTotalCents: integer("amount_total_cents"),
    email: text("email"),
    shipping: jsonb("shipping").$type<OrderShipping>(),
    stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
    /** When the Stripe Checkout Session (and the stock reservation) expires. */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    /** Set once when reserved stock is returned; guards against double release. */
    stockReleasedAt: timestamp("stock_released_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("orders_user_id_status_idx").on(table.userId, table.status),
    index("orders_status_expires_at_idx").on(table.status, table.expiresAt),
    check(
      "orders_status_valid",
      sql`${table.status} IN (${sql.raw(ORDER_STATUSES.map((s) => `'${s}'`).join(", "))})`,
    ),
    check("orders_subtotal_non_negative", sql`${table.subtotalCents} >= 0`),
    check(
      "orders_amount_total_non_negative",
      sql`${table.amountTotalCents} IS NULL OR ${table.amountTotalCents} >= 0`,
    ),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    /** Snapshots at checkout: later catalogue edits don't change past orders. */
    productName: text("product_name").notNull(),
    size: text("size"),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    unique("order_items_order_product_size_unique")
      .on(table.orderId, table.productId, table.size)
      .nullsNotDistinct(),
    check("order_items_unit_price_non_negative", sql`${table.unitPriceCents} >= 0`),
    check("order_items_quantity_positive", sql`${table.quantity} > 0`),
  ],
);

/** Stripe event ids already processed. The primary key makes webhooks idempotent. */
export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

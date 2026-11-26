// Stock held by open checkouts (server only).
//
// product_stock.quantity already excludes units held by unreleased `pending` orders
// (checkout reserves stock when it starts). For a customer looking at their own bag,
// units held by THEIR OWN open checkout are theirs to use, so the bag adds them back;
// everyone else keeps seeing them as unavailable.
import "server-only";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";

/** Units of each product held by this customer's own open (pending, unreleased) checkouts. */
export async function getOwnHeldStock(
  userId: string,
  productIds: string[],
): Promise<Map<string, number>> {
  const ids = [...new Set(productIds)];
  if (ids.length === 0) return new Map();

  const rows = await db
    .select({
      productId: orderItems.productId,
      held: sql<number>`sum(${orderItems.quantity})`.mapWith(Number),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(
      and(
        eq(orders.userId, userId),
        eq(orders.status, "pending"),
        isNull(orders.stockReleasedAt),
        inArray(orderItems.productId, ids),
      ),
    )
    .groupBy(orderItems.productId);

  return new Map(rows.map((row) => [row.productId, row.held]));
}

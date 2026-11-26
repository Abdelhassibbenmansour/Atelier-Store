/**
 * Order history — URL: /account/orders (signed-in customers only)
 *
 * Lists only the signed-in customer's orders (filtered by user id in
 * listOrdersForUser). Abandoned or canceled checkouts, where no payment was taken,
 * are not shown.
 */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import {
  formatOrderDate,
  OrderStatusBadge,
  orderReference,
} from "@/components/order/order-parts";
import { centsToUnits } from "@/lib/bag-types";
import { listOrdersForUser, type OrderSummary } from "@/lib/orders";
import { formatPrice } from "@/lib/product";
import { requireUser } from "@/lib/session";

import { AccountSkeleton } from "../_components/account-ui";

export const metadata: Metadata = {
  title: "Orders",
};

export default function OrdersPage() {
  return (
    <section aria-labelledby="orders-title" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id="orders-title" className="heading-display text-headline">
          Orders
        </h2>
        <p className="text-body text-muted">Your orders, newest first.</p>
      </div>
      <Suspense fallback={<AccountSkeleton rows={3} />}>
        <OrderList />
      </Suspense>
    </section>
  );
}

async function OrderList() {
  const user = await requireUser("/account/orders");
  const orders = await listOrdersForUser(user.id);

  if (orders.length === 0) {
    return (
      <div className="hairline flex flex-col items-start gap-4 p-6">
        <h3 className="heading-display text-title">No orders yet</h3>
        <p className="text-body-sm text-muted">
          When you buy something, it will appear here with its status and receipt details.
        </p>
        <Link href="/new-in" className="btn btn-primary">
          Shop new arrivals
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-y border-y">
      {orders.map((order) => (
        <OrderRow key={order.id} order={order} />
      ))}
    </ul>
  );
}

function OrderRow({ order }: { order: OrderSummary }) {
  const reference = orderReference(order.id);
  const [first, ...rest] = order.itemNames;
  const contents = first
    ? `${first}${rest.length ? ` + ${rest.length} more` : ""}`
    : `${order.itemCount} ${order.itemCount === 1 ? "item" : "items"}`;

  return (
    <li className="group relative flex gap-4 py-5 sm:gap-6">
      <div className="media-product w-16 shrink-0 sm:w-20">
        {order.image && (
          <Image
            src={order.image.src}
            alt=""
            fill
            sizes="(min-width: 40rem) 5rem, 4rem"
            className="object-cover"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-body-sm font-medium">
            {/* Stretched link: the whole row opens the order, one tab stop. */}
            <Link
              href={`/account/orders/${order.id}`}
              className="link-subtle after:absolute after:inset-0"
            >
              Order <span className="tabular-nums">{reference}</span>
            </Link>
          </h3>
          <p className="text-body-sm text-muted">
            <time dateTime={order.createdAt.toISOString()}>{formatOrderDate(order.createdAt)}</time>
          </p>
          <p className="text-body-sm break-words text-muted">
            {contents} · {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 sm:flex-col sm:items-end sm:justify-start">
          <OrderStatusBadge status={order.status} />
          <p className="text-body-sm font-medium tabular-nums">
            {formatPrice(centsToUnits(order.totalCents))}
          </p>
        </div>
      </div>
    </li>
  );
}

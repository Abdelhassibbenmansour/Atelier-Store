/**
 * Order details — URL: /account/orders/[orderId] (the order's owner only)
 *
 * getOrderForUser filters by the signed-in customer's id, so another customer's order
 * id gives a 404 rather than its details.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  formatOrderDate,
  isConfirmedOrder,
  OrderItems,
  orderReference,
  OrderShipping,
  OrderStatusBadge,
  OrderTotals,
} from "@/components/order/order-parts";
import { getOrderForUser } from "@/lib/orders";
import { requireUser } from "@/lib/session";

import { AccountSkeleton, DetailList } from "../../_components/account-ui";

export const metadata: Metadata = {
  title: "Order details",
};

export default function OrderDetailsPage({ params }: PageProps<"/account/orders/[orderId]">) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/account/orders" className="link-nav self-start text-muted hover:text-ink">
        ← All orders
      </Link>
      <Suspense fallback={<AccountSkeleton rows={4} />}>
        <OrderDetails orderIdPromise={params.then((p) => p.orderId)} />
      </Suspense>
    </div>
  );
}

const statusNotes: Partial<Record<string, string>> = {
  processing: "Your bank is confirming the payment. We’ll email you as soon as it clears.",
  needs_review: "We’ve received your payment and our team is reviewing this order.",
  failed: "The payment didn’t go through and no money was taken.",
  pending: "This checkout hasn’t been paid yet. If you just paid, it will update in a moment.",
  expired: "This checkout expired before payment. No money was taken.",
  canceled: "This checkout was canceled. No money was taken.",
};

async function OrderDetails({ orderIdPromise }: { orderIdPromise: Promise<string> }) {
  const orderId = await orderIdPromise;
  const user = await requireUser(`/account/orders/${orderId}`);
  const order = await getOrderForUser(orderId, user.id);
  if (!order) notFound();

  const note = statusNotes[order.status];

  return (
    <article aria-labelledby="order-title" className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h2 id="order-title" className="heading-display text-headline">
          Order <span className="tabular-nums">{orderReference(order.id)}</span>
        </h2>
        <OrderStatusBadge status={order.status} />
        {note && <p className="max-w-prose text-body-sm text-muted">{note}</p>}
      </header>

      <DetailList
        items={[
          {
            label: "Placed",
            value: (
              <time dateTime={order.createdAt.toISOString()}>
                {formatOrderDate(order.createdAt)}
              </time>
            ),
          },
          ...(order.paidAt
            ? [
                {
                  label: "Paid",
                  value: (
                    <time dateTime={order.paidAt.toISOString()}>
                      {formatOrderDate(order.paidAt)}
                    </time>
                  ),
                },
              ]
            : []),
          ...(order.email
            ? [{ label: "Receipt sent to", value: <span className="break-all">{order.email}</span> }]
            : []),
        ]}
      />

      <div className="grid gap-8 xl:grid-cols-12 xl:gap-10">
        <div className="xl:col-span-7">
          <OrderItems
            items={order.items}
            title={isConfirmedOrder(order.status) ? "Your pieces" : "Pieces"}
          />
        </div>
        <aside className="flex flex-col gap-6 xl:col-span-5">
          <OrderTotals order={order} />
          <OrderShipping shipping={order.shipping} />
        </aside>
      </div>
    </article>
  );
}

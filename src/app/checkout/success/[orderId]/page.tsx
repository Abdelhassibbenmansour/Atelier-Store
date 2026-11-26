/**
 * Order confirmation — URL: /checkout/success/[orderId] (the order's owner only)
 *
 * Shows the order as recorded in our database. Status is set only by Stripe webhooks
 * or /checkout/complete (server-side session retrieve), never by this page.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  isConfirmedOrder,
  OrderItems,
  orderReference,
  OrderShipping,
  OrderTotals,
} from "@/components/order/order-parts";
import { getOrderForUser, type OrderDetails } from "@/lib/orders";
import { requireUser } from "@/lib/session";

import { RefreshWhilePending } from "./_components/refresh-while-pending";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};

export default function OrderConfirmationPage({
  params,
}: PageProps<"/checkout/success/[orderId]">) {
  return (
    <div className="container-content section">
      <Suspense fallback={<p className="text-body-sm text-muted">Loading your order…</p>}>
        <OrderConfirmation orderIdPromise={params.then((p) => p.orderId)} />
      </Suspense>
    </div>
  );
}

const statusCopy: Record<
  OrderDetails["status"],
  { eyebrow: string; title: string; body: string; tone?: "warning" | "muted" }
> = {
  paid: {
    eyebrow: "Order confirmed",
    title: "Thank you for your order",
    body: "Your payment was successful. Stripe has emailed you a receipt.",
  },
  needs_review: {
    eyebrow: "Order received",
    title: "Thank you for your order",
    body: "We’ve received your payment and our team is reviewing your order. We’ll be in touch shortly.",
  },
  processing: {
    eyebrow: "Payment processing",
    title: "Your payment is on its way",
    body: "Your bank is confirming the payment. We’ll email you as soon as it clears.",
    tone: "warning",
  },
  pending: {
    eyebrow: "Confirming payment",
    title: "Confirming your payment…",
    body: "This usually takes a few seconds. This page updates automatically.",
    tone: "muted",
  },
  failed: {
    eyebrow: "Payment failed",
    title: "Your payment didn’t go through",
    body: "No payment was taken. The pieces have been released. You can try again from your bag.",
    tone: "warning",
  },
  expired: {
    eyebrow: "Checkout expired",
    title: "This checkout has expired",
    body: "No payment was taken. Your bag is unchanged, so you can check out again.",
    tone: "muted",
  },
  canceled: {
    eyebrow: "Checkout canceled",
    title: "This checkout was canceled",
    body: "No payment was taken. Your bag is unchanged, so you can check out again.",
    tone: "muted",
  },
};

async function OrderConfirmation({ orderIdPromise }: { orderIdPromise: Promise<string> }) {
  const orderId = await orderIdPromise;
  const user = await requireUser(`/checkout/success/${orderId}`);
  const order = await getOrderForUser(orderId, user.id);
  if (!order) notFound();

  const copy = statusCopy[order.status];
  const confirmed = isConfirmedOrder(order.status);
  const reference = orderReference(order.id);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3 border-b pb-8 lg:pb-12">
        <p
          className={`eyebrow ${copy.tone === "warning" ? "text-warning" : "text-muted"}`}
          role="status"
        >
          {copy.eyebrow}
        </p>
        <h1 className="heading-display text-display">{copy.title}</h1>
        <p className="max-w-prose text-body text-muted">{copy.body}</p>
        {/* Always mounted so it can notice pending → confirmed during this visit. */}
        <RefreshWhilePending orderId={order.id} status={order.status} />
        <p className="text-body-sm text-muted">
          Order <span className="text-ink tabular-nums">{reference}</span>
          {order.email && (
            <>
              {" "}
              · <span className="break-all">{order.email}</span>
            </>
          )}
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <OrderItems
            items={order.items}
            title={confirmed ? "Your pieces" : "Pieces in this checkout"}
          />
        </div>

        <aside className="flex flex-col gap-6 lg:col-span-4 lg:col-start-9">
          <OrderTotals order={order} />
          <OrderShipping shipping={order.shipping} />
          <div className="flex flex-col gap-3">
            <Link href={confirmed ? "/new-in" : "/bag"} className="btn btn-primary btn-block">
              {confirmed ? "Continue shopping" : "Return to your bag"}
            </Link>
            {confirmed && (
              <Link href="/account/orders" className="btn btn-ghost btn-block">
                View your orders
              </Link>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

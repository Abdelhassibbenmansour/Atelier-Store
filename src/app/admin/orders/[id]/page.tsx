/** Admin order details — URL: /admin/orders/[id] (role "admin" only). Read-only. */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  formatOrderDate,
  OrderItems,
  orderReference,
  OrderShipping,
  OrderStatusBadge,
  OrderTotals,
} from "@/components/order/order-parts";
import { getAdminOrder } from "@/lib/admin/data";
import { isAdmin, requireAdmin } from "@/lib/session";

import { AdminSkeleton } from "../../_components/admin-ui";

// Title only for admins, so the tab doesn't reveal the admin area to anyone else.
export async function generateMetadata(): Promise<Metadata> {
  return (await isAdmin()) ? { title: "Order details" } : {};
}

export default function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  return (
    <div className="flex flex-col gap-8">
      <Suspense fallback={<AdminSkeleton rows={4} />}>
        <AdminOrder idPromise={params.then((p) => p.id)} />
      </Suspense>
    </div>
  );
}

async function AdminOrder({ idPromise }: { idPromise: Promise<string> }) {
  const id = await idPromise;
  await requireAdmin(`/admin/orders/${id}`);
  const order = await getAdminOrder(id);
  if (!order) notFound();

  const facts = [
    { label: "Placed", value: formatOrderDate(order.createdAt) },
    { label: "Paid", value: order.paidAt ? formatOrderDate(order.paidAt) : "—" },
    { label: "Customer", value: `${order.customer.name} · ${order.customer.email}` },
    { label: "Receipt email", value: order.email ?? "—" },
    { label: "Stripe checkout", value: order.stripeCheckoutSessionId ?? "—", mono: true },
    { label: "Stripe payment", value: order.stripePaymentIntentId ?? "—", mono: true },
    {
      label: "Stock",
      value: order.stockReleasedAt
        ? `Returned to stock on ${formatOrderDate(order.stockReleasedAt)}`
        : "Held / sold",
    },
  ];

  return (
    <article aria-labelledby="order-title" className="flex flex-col gap-8">
      <Link href="/admin/orders" className="link-nav self-start text-muted hover:text-ink">
        ← All orders
      </Link>
      <header className="flex flex-col gap-3">
        <h2 id="order-title" className="heading-display text-headline">
          Order <span className="tabular-nums">{orderReference(order.id)}</span>
        </h2>
        <OrderStatusBadge status={order.status} />
        {order.status === "needs_review" && (
          <p className="max-w-prose text-body-sm text-warning">
            The amount or currency Stripe charged didn’t match this order, or the payment arrived
            after its stock was released. Check the payment in the Stripe Dashboard.
          </p>
        )}
      </header>

      <dl className="flex flex-col divide-y border-y text-body-sm">
        {facts.map((fact) => (
          <div key={fact.label} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-6">
            <dt className="text-muted sm:w-40 sm:shrink-0">{fact.label}</dt>
            <dd className={`min-w-0 break-all ${fact.mono ? "font-mono text-caption" : ""}`}>
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-8 xl:grid-cols-12 xl:gap-10">
        <div className="xl:col-span-7">
          <OrderItems items={order.items} title="Items" />
        </div>
        <aside className="flex flex-col gap-6 xl:col-span-5">
          <OrderTotals order={order} />
          <OrderShipping shipping={order.shipping} />
        </aside>
      </div>
    </article>
  );
}

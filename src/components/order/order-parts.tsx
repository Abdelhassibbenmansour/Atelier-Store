// Order display pieces shared by the checkout confirmation page and the account's
// order history. Server components: they only render data already loaded (and
// ownership-checked) by src/lib/orders.ts.
import Image from "next/image";
import Link from "next/link";

import { StatusLabel, type StatusTone } from "@/components/ui/status-label";
import type { OrderStatus } from "@/db/schema/orders";
import { centsToUnits } from "@/lib/bag-types";
import type { OrderDetails } from "@/lib/orders";
import { formatPrice } from "@/lib/product";

/* ---------------------------------------------------------------------------
   Status, date, reference
   --------------------------------------------------------------------------- */

const statusLabels: Record<OrderStatus, { label: string; tone: StatusTone }> = {
  paid: { label: "Paid", tone: "success" },
  processing: { label: "Payment processing", tone: "warning" },
  needs_review: { label: "Under review", tone: "warning" },
  pending: { label: "Awaiting payment", tone: "muted" },
  failed: { label: "Payment failed", tone: "error" },
  expired: { label: "Checkout expired", tone: "muted" },
  canceled: { label: "Checkout canceled", tone: "muted" },
};

/** Payment status with a colour dot (same pattern as the product stock status). */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, tone } = statusLabels[status];
  return <StatusLabel tone={tone}>{label}</StatusLabel>;
}

/** Paid, or paid and being checked by the team. */
export function isConfirmedOrder(status: OrderStatus) {
  return status === "paid" || status === "needs_review";
}

/** Short human reference, e.g. "F140305D". */
export function orderReference(orderId: string) {
  return orderId.slice(0, 8).toUpperCase();
}

export function formatOrderDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/* ---------------------------------------------------------------------------
   Sections
   --------------------------------------------------------------------------- */

export function OrderItems({ items, title }: { items: OrderDetails["items"]; title: string }) {
  return (
    <section aria-labelledby="order-items">
      <h2 id="order-items" className="eyebrow mb-4">
        {title}
      </h2>
      <ul className="divide-y border-y">
        {items.map((item) => (
          <li key={`${item.slug}:${item.size ?? ""}`} className="flex gap-4 py-4">
            <div className="media-product w-20 shrink-0">
              {item.image && (
                <Image
                  src={item.image.src}
                  alt={item.image.alt}
                  fill
                  sizes="5rem"
                  className="object-cover"
                />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap justify-between gap-x-4 gap-y-1 text-body-sm">
              <div className="flex min-w-0 flex-col gap-1">
                <Link href={`/products/${item.slug}`} className="link-subtle break-words">
                  {item.productName}
                </Link>
                <p className="text-muted">
                  {[item.size && `Size ${item.size}`, `Qty ${item.quantity}`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {item.quantity > 1 && (
                  <p className="text-caption text-muted">
                    {formatPrice(centsToUnits(item.unitPriceCents))} each
                  </p>
                )}
              </div>
              <p className="tabular-nums">
                {formatPrice(centsToUnits(item.unitPriceCents * item.quantity))}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function OrderTotals({ order }: { order: OrderDetails }) {
  return (
    <section
      aria-labelledby="order-total"
      className="hairline flex flex-col gap-3 p-6 text-body-sm"
    >
      <h2 id="order-total" className="eyebrow">
        Summary
      </h2>
      <div className="flex justify-between gap-4">
        <span>Subtotal</span>
        <span className="tabular-nums">{formatPrice(centsToUnits(order.subtotalCents))}</span>
      </div>
      <div className="flex justify-between gap-4 text-muted">
        <span>Shipping</span>
        <span>Free</span>
      </div>
      <div className="flex justify-between gap-4 border-t pt-3 font-medium">
        <span>{isConfirmedOrder(order.status) ? "Paid" : "Total"}</span>
        <span className="tabular-nums">
          {formatPrice(centsToUnits(order.amountTotalCents ?? order.subtotalCents))}
        </span>
      </div>
    </section>
  );
}

export function OrderShipping({ shipping }: { shipping: OrderDetails["shipping"] }) {
  if (!shipping?.address) return null;
  const { address } = shipping;
  const lines = [
    shipping.name,
    address.line1,
    address.line2,
    [address.city, address.state, address.postalCode].filter(Boolean).join(", "),
  ].filter(Boolean);

  return (
    <section aria-labelledby="order-shipping" className="flex flex-col gap-2 text-body-sm">
      <h2 id="order-shipping" className="eyebrow">
        Shipping to
      </h2>
      <address className="not-italic text-muted">
        {lines.map((line) => (
          <span key={line} className="block break-words">
            {line}
          </span>
        ))}
      </address>
    </section>
  );
}

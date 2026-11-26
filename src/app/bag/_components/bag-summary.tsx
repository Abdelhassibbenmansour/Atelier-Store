import Link from "next/link";

import { centsToUnits, type BagSummary as Bag } from "@/lib/bag-types";
import { formatPrice } from "@/lib/product";

import { CheckoutButton } from "./checkout-button";

/** Subtotal panel with the Stripe Checkout button. */
export function BagSummary({
  bag,
  signedIn,
  canceled,
}: {
  bag: Bag;
  signedIn: boolean;
  /** The customer came back from Stripe without paying. */
  canceled: boolean;
}) {
  const items = `${bag.itemCount} ${bag.itemCount === 1 ? "item" : "items"}`;

  return (
    <section
      aria-labelledby="bag-summary-title"
      className="hairline flex flex-col gap-6 p-6 lg:sticky lg:top-[calc(var(--spacing-header)+2rem)]"
    >
      <h2 id="bag-summary-title" className="eyebrow">
        Summary
      </h2>

      {canceled && (
        <p role="status" className="text-body-sm text-muted">
          Checkout canceled. No payment was taken and your bag is unchanged.
        </p>
      )}

      <dl className="flex flex-col gap-3 text-body-sm">
        <div className="flex justify-between gap-4">
          <dt>
            Subtotal <span className="text-muted">({items})</span>
          </dt>
          <dd className="tabular-nums">{formatPrice(centsToUnits(bag.subtotalCents))}</dd>
        </div>
        <div className="flex justify-between gap-4 text-muted">
          <dt>Shipping (US)</dt>
          <dd>Free</dd>
        </div>
      </dl>

      {bag.hasIssues && (
        <p className="text-body-sm text-warning">
          Some pieces in your bag have changed. Remove or update them to check out.
        </p>
      )}

      <div className="flex flex-col gap-3">
        <CheckoutButton signedIn={signedIn} disabled={bag.hasIssues || bag.itemCount === 0} />
        <Link href="/new-in" className="btn btn-ghost btn-block">
          Continue shopping
        </Link>
      </div>
    </section>
  );
}

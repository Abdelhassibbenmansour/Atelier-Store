"use client";

import Link from "next/link";
import { useActionState, useId, useState, type FormEvent } from "react";

import { addToBag } from "@/lib/bag-actions";
import type { BagActionResult } from "@/lib/bag-types";
import type { ProductSize, StockStatus } from "@/lib/product";

type PurchasePanelProps = {
  productId: string;
  sizes?: ProductSize[];
  /** From the cached product page, so it may be a few minutes old. addToBag re-checks. */
  stockStatus: StockStatus;
};

const IDLE: BagActionResult = { status: "idle" };

// Posts to the addToBag Server Action, which validates size and stock against the
// database. Works without JavaScript (plain form post); with it, the result appears
// inline and the header count updates.
export function PurchasePanel({ productId, sizes, stockStatus }: PurchasePanelProps) {
  const [size, setSize] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState(false);
  const [result, formAction, pending] = useActionState(addToBag, IDLE);
  const legendId = useId();
  const soldOut = stockStatus === "out_of_stock";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    // Ask for a size before a round trip; the server checks again.
    if (sizes && !size) {
      event.preventDefault();
      setSizeError(true);
    }
  }

  const message = soldOut
    ? { tone: "muted", text: "This piece is currently unavailable. Contact client services for availability." }
    : sizeError
      ? { tone: "error", text: "Please select a size." }
      : result.status !== "idle"
        ? { tone: result.status === "success" ? "success" : "error", text: result.message }
        : null;

  return (
    <form action={formAction} onSubmit={onSubmit} className="flex flex-col gap-6">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="quantity" value="1" />

      {sizes && (
        <fieldset aria-labelledby={legendId} disabled={soldOut}>
          <div className="mb-3 flex items-center justify-between">
            <legend id={legendId} className="eyebrow">
              Size
            </legend>
            <span className="text-caption text-muted">IT sizing</span>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {sizes.map((option) => (
              <label
                key={option.label}
                className="relative flex min-h-control cursor-pointer items-center justify-center border border-line text-body-sm transition-colors duration-150 hover:border-ink has-checked:border-ink has-checked:bg-ink has-checked:text-paper has-disabled:cursor-not-allowed has-disabled:border-line has-disabled:text-subtle has-disabled:line-through has-focus-visible:outline-1 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink"
              >
                <input
                  type="radio"
                  name="size"
                  value={option.label}
                  disabled={!option.available}
                  checked={size === option.label}
                  onChange={() => {
                    setSize(option.label);
                    setSizeError(false);
                  }}
                  className="sr-only"
                />
                {option.label}
                {!option.available && <span className="sr-only"> (unavailable)</span>}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={soldOut || pending}
          aria-busy={pending}
          className="btn btn-primary btn-lg btn-block"
        >
          {soldOut ? "Sold out" : pending ? "Adding…" : "Add to bag"}
        </button>

        {/* Always rendered so screen readers pick up changes to the live region. */}
        <div role="status" className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {message && (
            <p
              className={`text-body-sm ${
                message.tone === "error"
                  ? "text-error"
                  : message.tone === "success"
                    ? "text-success"
                    : "text-muted"
              }`}
            >
              {message.text}
            </p>
          )}
          {!pending && !sizeError && result.status === "success" && (
            <Link href="/bag" className="link text-body-sm">
              View bag
            </Link>
          )}
        </div>
      </div>
    </form>
  );
}

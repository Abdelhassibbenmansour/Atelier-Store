"use client";

import { useId, useState } from "react";

import type { ProductSize, StockStatus } from "@/lib/product";

type PurchasePanelProps = {
  productName: string;
  sizes?: ProductSize[];
  stockStatus: StockStatus;
};

// UI only: there is no cart yet. Selecting a size and "adding" shows a confirmation
// but nothing is persisted. Wire this to the cart once it exists.
export function PurchasePanel({ productName, sizes, stockStatus }: PurchasePanelProps) {
  const [size, setSize] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const legendId = useId();
  const soldOut = stockStatus === "out_of_stock";

  function addToBag() {
    if (sizes && !size) {
      setMessage({ tone: "error", text: "Please select a size." });
      return;
    }
    setMessage({
      tone: "success",
      text: `${productName}${size ? `, size ${size},` : ""} has been added to your bag.`,
    });
  }

  return (
    <div className="flex flex-col gap-6">
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
                    setMessage(null);
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
          type="button"
          onClick={addToBag}
          disabled={soldOut}
          className="btn btn-primary btn-lg btn-block"
        >
          {soldOut ? "Sold out" : "Add to bag"}
        </button>

        {/* Always rendered so screen readers pick up changes to the live region. */}
        <p
          role="status"
          className={`text-body-sm ${
            soldOut ? "text-muted" : message?.tone === "error" ? "text-error" : "text-success"
          }`}
        >
          {soldOut
            ? "This piece is currently unavailable. Contact client services for availability."
            : message?.text}
        </p>
      </div>
    </div>
  );
}

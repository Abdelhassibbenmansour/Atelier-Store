"use client";

import { useFormStatus } from "react-dom";

import { MinusIcon, PlusIcon } from "@/components/icons";
import { removeLine, updateQuantity } from "@/lib/bag-actions";

/**
 * − / + for one bag line. A single form: the clicked button submits its own
 * quantity, so it works without JavaScript. The server clamps to stock regardless.
 */
export function QuantityStepper({
  lineKey,
  productName,
  quantity,
  max,
}: {
  lineKey: string;
  productName: string;
  quantity: number;
  max: number;
}) {
  return (
    <form action={updateQuantity} className="flex items-center border border-line">
      <input type="hidden" name="key" value={lineKey} />
      <StepperButtons productName={productName} quantity={quantity} max={max} />
    </form>
  );
}

function StepperButtons({
  productName,
  quantity,
  max,
}: {
  productName: string;
  quantity: number;
  max: number;
}) {
  const { pending } = useFormStatus();

  return (
    <>
      <button
        type="submit"
        name="quantity"
        value={quantity - 1}
        disabled={pending || quantity <= 1}
        aria-label={`Decrease quantity of ${productName}`}
        className="btn-icon disabled:cursor-not-allowed disabled:text-subtle"
      >
        <MinusIcon width={16} height={16} />
      </button>
      <output
        aria-live="polite"
        aria-label={`Quantity of ${productName}`}
        className={`min-w-8 text-center text-body-sm tabular-nums ${pending ? "text-muted" : ""}`}
      >
        {quantity}
      </output>
      <button
        type="submit"
        name="quantity"
        value={quantity + 1}
        disabled={pending || quantity >= max}
        aria-label={
          quantity >= max
            ? `No more ${productName} available`
            : `Increase quantity of ${productName}`
        }
        className="btn-icon disabled:cursor-not-allowed disabled:text-subtle"
      >
        <PlusIcon width={16} height={16} />
      </button>
    </>
  );
}

export function RemoveButton({ lineKey, productName }: { lineKey: string; productName: string }) {
  return (
    <form action={removeLine}>
      <input type="hidden" name="key" value={lineKey} />
      <RemoveSubmit productName={productName} />
    </form>
  );
}

function RemoveSubmit({ productName }: { productName: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={`Remove ${productName} from your bag`}
      className="link-nav inline-flex min-h-control cursor-pointer items-center text-muted hover:text-ink disabled:cursor-wait"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}

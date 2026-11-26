"use client";

import { useActionState, useState, useTransition, type FormEvent } from "react";

import { MinusIcon, PlusIcon } from "@/components/icons";
import { adjustStock, setStock, type AdminActionState } from "@/lib/admin/actions";
import { MAX_STOCK } from "@/lib/admin/validation";

const IDLE: AdminActionState = { status: "idle" };

type Mode = "adjust" | "set";

/**
 * Stock editor with two modes:
 * - Add / Remove (default): relative change, applied atomically on the server, so it
 *   never conflicts with checkouts holding stock at the same time.
 * - Set to: absolute number; sends the quantity the admin saw (`expected`) so the
 *   server refuses if stock changed meanwhile.
 * After a successful save the input resets to the new server value; after a conflict
 * it keeps the admin's number so they can review and save again.
 */
export function StockControl({
  productId,
  productName,
  current,
}: {
  productId: string;
  productName: string;
  current: number;
}) {
  const [mode, setMode] = useState<Mode>("adjust");
  const [adjustState, adjustAction] = useActionState(adjustStock, IDLE);
  const [setState, setAction] = useActionState(setStock, IDLE);
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState("1");
  const [target, setTarget] = useState(String(current));
  const [seen, setSeen] = useState(current);
  if (seen !== current) {
    // Adjust state while rendering when the prop changes (no effect needed). After a
    // "Set to" conflict, keep what the admin typed: the message shows the new stock and
    // Save stays available (it now compares against the new value).
    setSeen(current);
    if (setState.status !== "error") setTarget(String(current));
  }

  const amountNumber = Number(amount);
  const amountValid = /^\d+$/.test(amount) && amountNumber > 0 && amountNumber <= MAX_STOCK;
  const targetNumber = Number(target);
  const targetValid = /^\d+$/.test(target) && targetNumber <= MAX_STOCK;
  const state = mode === "adjust" ? adjustState : setState;

  function onAdjust(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const sign = submitter?.value === "remove" ? "-" : "";
    const data = new FormData();
    data.set("productId", productId);
    data.set("delta", `${sign}${amount}`);
    startTransition(() => adjustAction(data));
  }

  function onSet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => setAction(data));
  }

  const stepTarget = (delta: number) =>
    setTarget((v) => String(Math.min(MAX_STOCK, Math.max(0, (Number(v) || 0) + delta))));

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      <div role="group" aria-label={`How to change stock of ${productName}`} className="flex gap-4">
        {(
          [
            ["adjust", "Add / Remove"],
            ["set", "Set to"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            aria-pressed={mode === value}
            className={`link-nav ${mode === value ? "text-ink" : "text-muted hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "adjust" ? (
        <form onSubmit={onAdjust} className="flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor={`amount-${productId}`}>
            Units to add or remove for {productName}
          </label>
          <input
            id={`amount-${productId}`}
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.currentTarget.value.replace(/[^\d]/g, ""))}
            aria-invalid={!amountValid || undefined}
            disabled={pending}
            className="h-control w-20 border border-line-strong bg-paper text-center text-body-sm tabular-nums outline-none focus-visible:outline-1 focus-visible:outline-offset-2"
          />
          <button
            type="submit"
            value="add"
            disabled={pending || !amountValid}
            className="btn btn-secondary btn-sm"
          >
            <PlusIcon width={14} height={14} />
            Add
          </button>
          <button
            type="submit"
            value="remove"
            disabled={pending || !amountValid || current === 0}
            className="btn btn-secondary btn-sm"
          >
            <MinusIcon width={14} height={14} />
            Remove
          </button>
        </form>
      ) : (
        <form onSubmit={onSet} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="expected" value={current} />
          <div className="flex items-center border border-line-strong">
            <button
              type="button"
              onClick={() => stepTarget(-1)}
              disabled={pending || targetNumber <= 0}
              aria-label={`Decrease target stock of ${productName}`}
              className="btn-icon disabled:cursor-not-allowed disabled:text-subtle"
            >
              <MinusIcon width={16} height={16} />
            </button>
            <label className="sr-only" htmlFor={`stock-${productId}`}>
              Set stock for {productName}
            </label>
            <input
              id={`stock-${productId}`}
              name="quantity"
              inputMode="numeric"
              value={target}
              onChange={(e) => setTarget(e.currentTarget.value.replace(/[^\d]/g, ""))}
              aria-invalid={!targetValid || undefined}
              disabled={pending}
              className="h-control w-16 border-0 bg-paper text-center text-body-sm tabular-nums outline-none focus-visible:outline-1 focus-visible:outline-offset-2"
            />
            <button
              type="button"
              onClick={() => stepTarget(1)}
              disabled={pending || targetNumber >= MAX_STOCK}
              aria-label={`Increase target stock of ${productName}`}
              className="btn-icon disabled:cursor-not-allowed disabled:text-subtle"
            >
              <PlusIcon width={16} height={16} />
            </button>
          </div>
          <button
            type="submit"
            disabled={pending || !targetValid || targetNumber === current}
            className="btn btn-secondary btn-sm"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </form>
      )}

      {state.status !== "idle" && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`text-caption ${state.status === "error" ? "text-error" : "text-success"}`}
        >
          {state.message}
        </p>
      )}
    </div>
  );
}

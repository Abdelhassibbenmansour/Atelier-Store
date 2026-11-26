"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { OrderStatus } from "@/db/schema/orders";
import { clearBagAfterConfirmation } from "@/lib/checkout-actions";

const CONFIRMED: OrderStatus[] = ["paid", "processing", "needs_review"];

/**
 * Watches an order while its payment is being confirmed.
 *
 * - While "pending", re-fetches the page (the webhook may not have arrived yet). Once
 *   it gives up, it says so instead of implying the page is still updating.
 * - If the order becomes confirmed during this visit, the bag still holds the pieces
 *   (/checkout/complete only empties it when Stripe had already confirmed), so ask the
 *   server to empty it. The server re-checks the order; reopening an old order page
 *   never clears a new bag because only a pending → confirmed change triggers it.
 */
export function RefreshWhilePending({
  orderId,
  status,
  intervalMs = 3000,
  maxAttempts = 10,
}: {
  orderId: string;
  status: OrderStatus;
  intervalMs?: number;
  maxAttempts?: number;
}) {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);
  const wasPending = useRef(status === "pending");
  const cleared = useRef(false);
  const pending = status === "pending";

  useEffect(() => {
    if (!pending) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      router.refresh();
      if (attempts >= maxAttempts) {
        clearInterval(timer);
        setGaveUp(true);
      }
    }, intervalMs);
    return () => clearInterval(timer);
  }, [pending, router, intervalMs, maxAttempts]);

  useEffect(() => {
    if (wasPending.current && CONFIRMED.includes(status) && !cleared.current) {
      cleared.current = true;
      void clearBagAfterConfirmation(orderId);
    }
  }, [orderId, status]);

  if (!pending || !gaveUp) return null;

  return (
    <p role="status" className="text-body-sm text-warning">
      This is taking longer than usual. If you completed payment, you’ll receive Stripe’s
      receipt by email and this order will update.{" "}
      <button type="button" onClick={() => router.refresh()} className="link cursor-pointer">
        Check again
      </button>
    </p>
  );
}

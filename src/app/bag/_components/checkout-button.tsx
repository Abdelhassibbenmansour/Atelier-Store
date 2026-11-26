"use client";

import Link from "next/link";
import { useActionState } from "react";

import { startCheckout, type CheckoutState } from "@/lib/checkout-actions";
import { signInPath } from "@/lib/redirect";

const IDLE: CheckoutState = { status: "idle" };

/**
 * Starts Stripe Checkout. The Server Action re-validates the bag, reserves stock and
 * redirects to Stripe; on failure it returns a message shown here.
 */
export function CheckoutButton({ signedIn, disabled }: { signedIn: boolean; disabled: boolean }) {
  const [state, formAction, pending] = useActionState(startCheckout, IDLE);

  if (!signedIn) {
    return (
      <div className="flex flex-col gap-2">
        <Link href={signInPath("/bag")} className="btn btn-primary btn-block">
          Sign in to check out
        </Link>
        <p className="text-caption text-muted">You’ll come straight back to your bag.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <button
        type="submit"
        disabled={disabled || pending}
        aria-busy={pending}
        className="btn btn-primary btn-block"
      >
        {pending ? "Going to secure checkout…" : "Checkout"}
      </button>
      {state.status === "error" && (
        <p role="alert" className="text-body-sm text-error">
          {state.message}
        </p>
      )}
      <p className="text-caption text-muted">
        Secure payment by Stripe. Pieces are held for 30 minutes while you pay.
      </p>
    </form>
  );
}

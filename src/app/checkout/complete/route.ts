// Stripe redirects here after payment: /checkout/complete?session_id=cs_…
//
// The session id in the URL is only a lookup key. The order must belong to the
// signed-in customer, and its status comes from Stripe (sessions.retrieve), applied
// through the same idempotent code as the webhook. The bag is emptied once the payment
// is confirmed (webhooks can't clear cookies). Then we show the order page.
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { clearBag } from "@/lib/bag";
import { getOrderIdForSession, syncOrderWithSession } from "@/lib/orders";
import { signInPath } from "@/lib/redirect";
import { getCurrentUser } from "@/lib/session";
import { getStripe } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) redirect("/bag");

  const user = await getCurrentUser();
  if (!user) redirect(signInPath(`/checkout/complete?session_id=${sessionId}`));

  const orderId = await getOrderIdForSession(sessionId, user.id);
  if (!orderId) redirect("/bag");

  let outcome: string | null = null;
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.client_reference_id === orderId) outcome = await syncOrderWithSession(session);
  } catch (error) {
    // Stripe unreachable: don't guess. The order stays as it is and the webhook will
    // settle it; the order page shows "Confirming your payment…" meanwhile.
    console.error(`[checkout] could not confirm session ${sessionId} on return`, error);
  }
  if (outcome && ["paid", "processing", "needs_review"].includes(outcome)) await clearBag();

  redirect(`/checkout/success/${orderId}`);
}

/**
 * Account details — URL: /account/details (signed-in users only)
 *
 * Read-only for now: the details the customer signs in with.
 */
import type { Metadata } from "next";
import { Suspense } from "react";

import { requireUser } from "@/lib/session";

import { AccountSkeleton, DetailList, formatMemberSince } from "../_components/account-ui";

export const metadata: Metadata = {
  title: "Account details",
};

export default function AccountDetailsPage() {
  return (
    <section aria-labelledby="account-details-title" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id="account-details-title" className="heading-display text-headline">
          Account details
        </h2>
        <p className="text-body text-muted">The details you use to sign in to Atelier.</p>
      </div>
      <Suspense fallback={<AccountSkeleton rows={3} />}>
        <Details />
      </Suspense>
    </section>
  );
}

async function Details() {
  const user = await requireUser("/account/details");

  return (
    <DetailList
      items={[
        { label: "Name", value: user.name },
        { label: "Email", value: <span className="break-all">{user.email}</span> },
        { label: "Member since", value: formatMemberSince(user.memberSince) },
        ...(user.role === "admin" ? [{ label: "Access", value: "Administrator" }] : []),
      ]}
    />
  );
}

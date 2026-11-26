/**
 * Account overview — URL: /account (signed-in users only)
 *
 * requireUser() is the access check: it validates the session and redirects to
 * sign-in otherwise. It reads the request, so it runs inside <Suspense>.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { requireUser } from "@/lib/session";

import { AccountSkeleton, formatMemberSince } from "./_components/account-ui";

// The layout's title template only applies to child routes, so name this page directly.
export const metadata: Metadata = {
  title: "Your account",
};

export default function AccountOverviewPage() {
  return (
    <Suspense fallback={<AccountSkeleton />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const user = await requireUser("/account");
  const firstName = user.name.split(/\s+/)[0] || user.name;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 className="heading-display text-headline break-words">Hello, {firstName}</h2>
        <p className="text-body text-muted">
          Member since {formatMemberSince(user.memberSince)}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <OverviewCard
          eyebrow="Account details"
          title={user.name}
          body={user.email}
          action={{ label: "View details", href: "/account/details" }}
        />
        {user.role === "admin" ? (
          <OverviewCard
            eyebrow="Admin"
            title="Store administration"
            body="You have admin access to Atelier."
            action={{ label: "Go to admin", href: "/admin" }}
          />
        ) : (
          <OverviewCard
            eyebrow="Just in"
            title="New arrivals"
            body="The latest pieces from the atelier."
            action={{ label: "Shop new arrivals", href: "/new-in" }}
          />
        )}
      </div>
    </div>
  );
}

function OverviewCard({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow: string;
  title: string;
  body: string;
  action: { label: string; href: string };
}) {
  return (
    <section className="hairline flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-2">
        <p className="eyebrow text-muted">{eyebrow}</p>
        <h3 className="heading-display text-title break-words">{title}</h3>
        <p className="text-body-sm text-muted break-all">{body}</p>
      </div>
      <Link href={action.href} className="link-nav mt-auto self-start">
        {action.label}
      </Link>
    </section>
  );
}

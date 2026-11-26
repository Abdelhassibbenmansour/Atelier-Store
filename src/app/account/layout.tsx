/**
 * Account area — /account and /account/*
 *
 * The layout is static (heading + section navigation) and prerendered. It never reads
 * the session: each page calls requireUser() inside <Suspense>, which is the real
 * access check. src/proxy.ts additionally redirects visitors without a session cookie.
 */
import type { Metadata } from "next";
import { Suspense } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";

import { AccountNavLinks, AccountNavLinksFallback } from "./_components/account-nav";

export const metadata: Metadata = {
  title: { default: "Your account", template: "%s | Your account | Atelier Store" },
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <div className="container-site pb-section lg:pt-8">
      <header className="flex flex-col gap-2 border-b pt-8 pb-6 lg:pt-0 lg:pb-12">
        <p className="eyebrow text-muted">Your account</p>
        <h1 className="heading-display text-display">My account</h1>
      </header>

      <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
        {/* Phones: one scrollable row of tabs. Desktop: vertical sidebar. */}
        <nav aria-label="Account" className="border-b lg:col-span-3 lg:border-b-0 lg:pt-12">
          <ul className="-mx-gutter flex gap-6 overflow-x-auto px-gutter lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
            <Suspense fallback={<AccountNavLinksFallback />}>
              <AccountNavLinks />
            </Suspense>
            <li className="lg:mt-6 lg:border-t lg:pt-6">
              <SignOutButton className="link-nav inline-flex min-h-control cursor-pointer items-center whitespace-nowrap text-muted hover:text-ink" />
            </li>
          </ul>
        </nav>

        <div className="min-w-0 lg:col-span-9 lg:pt-12">{children}</div>
      </div>
    </div>
  );
}

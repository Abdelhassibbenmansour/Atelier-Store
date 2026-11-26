/**
 * Admin area — /admin and /admin/* (role "admin" only)
 *
 * Even the admin chrome (heading, section nav) renders only after requireAdmin(), so
 * signed-in non-admins get a plain 404 that doesn't reveal the admin area. This is
 * still not the only check: every page calls requireAdmin() inside <Suspense>, every
 * read in src/lib/admin/data.ts checks again, and every Server Action in
 * src/lib/admin/actions.ts starts with requireAdminForAction(). The session read is
 * cached per request, so repeating the check is cheap. src/proxy.ts additionally
 * redirects visitors without a session cookie.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireAdmin } from "@/lib/session";

import { AdminNavLinks, AdminNavLinksFallback } from "./_components/admin-nav";
import { AdminSkeleton } from "./_components/admin-ui";

export const metadata: Metadata = {
  // Neutral default: pages set an admin title only for admins (see generateMetadata).
  title: { default: "Atelier Store", template: "%s | Admin | Atelier Store" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="container-site pb-section pt-8">
      <Suspense fallback={<AdminSkeleton rows={3} />}>
        <AdminChrome>{children}</AdminChrome>
      </Suspense>
    </div>
  );
}

async function AdminChrome({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-6 lg:pb-8">
        <div className="flex flex-col gap-2">
          <p className="eyebrow text-muted">Atelier</p>
          <h1 className="heading-display text-display">Admin</h1>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/" className="link-nav text-muted hover:text-ink">
            View storefront
          </Link>
          <SignOutButton className="link-nav inline-flex cursor-pointer items-center text-muted hover:text-ink" />
        </div>
      </header>

      <nav aria-label="Admin" className="border-b">
        <ul className="-mx-gutter flex gap-6 overflow-x-auto px-gutter lg:mx-0 lg:gap-8 lg:px-0">
          <Suspense fallback={<AdminNavLinksFallback />}>
            <AdminNavLinks />
          </Suspense>
        </ul>
      </nav>

      <div className="min-w-0 pt-8 lg:pt-12">{children}</div>
    </>
  );
}

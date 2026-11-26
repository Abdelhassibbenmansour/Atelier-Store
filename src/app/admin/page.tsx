/**
 * Admin overview — URL: /admin (role "admin" only)
 *
 * requireAdmin() re-reads the session from the database on every request (no cookie
 * cache), so promoting or demoting a user applies immediately. Non-admins get a 404.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { getAdminCounts } from "@/lib/admin/data";
import { isAdmin, requireAdmin } from "@/lib/session";

import { AdminSkeleton } from "./_components/admin-ui";

// Title only for admins, so the tab doesn't reveal the admin area to anyone else.
export async function generateMetadata(): Promise<Metadata> {
  return (await isAdmin()) ? { title: { absolute: "Admin | Atelier Store" } } : {};
}

export default function AdminOverviewPage() {
  return (
    <Suspense fallback={<AdminSkeleton rows={2} />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const admin = await requireAdmin("/admin");
  const counts = await getAdminCounts();

  const sections = [
    {
      title: "Products",
      href: "/admin/products",
      body: `${counts.products} ${counts.products === 1 ? "product" : "products"} in the catalogue.`,
      action: "Manage products",
    },
    {
      title: "Stock",
      href: "/admin/stock",
      body:
        counts.outOfStock + counts.lowStock > 0
          ? `${counts.outOfStock} out of stock · ${counts.lowStock} running low.`
          : "Everything is in stock.",
      action: "Update stock",
      tone: counts.outOfStock + counts.lowStock > 0 ? "warning" : undefined,
    },
    {
      title: "Categories",
      href: "/admin/categories",
      body: "Create, rename and order the storefront’s categories.",
      action: "Manage categories",
    },
    {
      title: "Orders",
      href: "/admin/orders",
      body:
        counts.needsReview > 0
          ? `${counts.orders} placed · ${counts.needsReview} need review.`
          : `${counts.orders} ${counts.orders === 1 ? "order" : "orders"} placed.`,
      action: "View orders",
      tone: counts.needsReview > 0 ? "warning" : undefined,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <p className="text-body-sm text-muted">
        Signed in as <span className="break-all text-ink">{admin.email}</span>
      </p>
      <ul className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <li key={section.href} className="hairline relative flex flex-col gap-3 p-6">
            <h2 className="heading-display text-title">{section.title}</h2>
            <p
              className={`text-body-sm ${section.tone === "warning" ? "text-warning" : "text-muted"}`}
            >
              {section.body}
            </p>
            <Link
              href={section.href}
              className="link-nav mt-auto self-start after:absolute after:inset-0"
            >
              {section.action}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

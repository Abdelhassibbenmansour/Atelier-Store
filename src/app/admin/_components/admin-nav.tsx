"use client";

import { SectionNavLinks, SectionNavLinksFallback } from "@/components/layout/section-nav";

const items = [
  { label: "Overview", href: "/admin" },
  { label: "Products", href: "/admin/products" },
  { label: "Stock", href: "/admin/stock" },
  { label: "Categories", href: "/admin/categories" },
  { label: "Orders", href: "/admin/orders" },
] as const;

/** Admin section links (render inside <Suspense> with the fallback). */
export function AdminNavLinks() {
  return <SectionNavLinks items={items} />;
}

export function AdminNavLinksFallback() {
  return <SectionNavLinksFallback items={items} />;
}

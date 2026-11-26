"use client";

import { SectionNavLinks, SectionNavLinksFallback } from "@/components/layout/section-nav";

const items = [
  { label: "Overview", href: "/account" },
  { label: "Orders", href: "/account/orders" },
  { label: "Account details", href: "/account/details" },
] as const;

/** Account section links (render inside <Suspense> with the fallback). */
export function AccountNavLinks() {
  return <SectionNavLinks items={items} />;
}

export function AccountNavLinksFallback() {
  return <SectionNavLinksFallback items={items} />;
}

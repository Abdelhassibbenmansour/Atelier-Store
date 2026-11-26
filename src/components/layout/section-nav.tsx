"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type SectionNavItem = { label: string; href: string };

/**
 * Section links (account area, admin area) with the current one marked. The first item
 * is the section's root and only matches exactly; the others also match their sub-pages
 * (e.g. /account/orders/…). Reads the URL, so render it inside <Suspense> with
 * <SectionNavLinksFallback /> — required for dynamic routes under Cache Components.
 */
export function SectionNavLinks({ items }: { items: readonly SectionNavItem[] }) {
  return <NavItems items={items} pathname={usePathname()} />;
}

/** Same links without a current item, for the prerendered shell. */
export function SectionNavLinksFallback({ items }: { items: readonly SectionNavItem[] }) {
  return <NavItems items={items} pathname={null} />;
}

function NavItems({
  items,
  pathname,
}: {
  items: readonly SectionNavItem[];
  pathname: string | null;
}) {
  const root = items[0]?.href;
  return (
    <>
      {items.map((item) => {
        const current =
          pathname !== null &&
          (item.href === root
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`));
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={current ? "page" : undefined}
              className={`link-nav inline-flex min-h-control items-center whitespace-nowrap ${current ? "text-ink" : "text-muted hover:text-ink"}`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </>
  );
}

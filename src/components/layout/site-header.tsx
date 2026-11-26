import Link from "next/link";

import { SearchIcon, UserIcon } from "@/components/icons";
import { BagLink } from "@/components/layout/bag-link";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { navigation } from "@/lib/sample-data";

export function SiteHeader() {
  // Solid background, no backdrop-filter: a filter would trap the fixed mobile menu panel inside the header.
  return (
    <header className="sticky top-0 z-40 border-b bg-paper">
      <div className="container-site grid h-header grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* Left: menu on mobile, primary navigation on desktop */}
        <div className="flex items-center">
          <MobileMenu items={navigation} />
          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-7">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="link-nav">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Centre: wordmark */}
        <Link
          href="/"
          aria-label="Atelier, home"
          className="heading-display text-[1.625rem] leading-none tracking-[0.18em] uppercase lg:text-[2rem]"
        >
          Atelier
        </Link>

        {/* Right: utilities */}
        <div className="flex items-center justify-end -mr-2.5">
          <Link href="/search" aria-label="Search" className="btn-icon">
            <SearchIcon />
          </Link>
          <Link href="/account" aria-label="Account" className="btn-icon hidden sm:inline-flex">
            <UserIcon />
          </Link>
          <BagLink />
        </div>
      </div>
    </header>
  );
}

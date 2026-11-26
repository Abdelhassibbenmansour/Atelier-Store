"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { CloseIcon, MenuIcon } from "@/components/icons";

type NavItem = { label: string; href: string };

export function MobileMenu({ items }: { items: readonly NavItem[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="btn-icon -ml-2.5"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="fixed inset-x-0 top-header bottom-0 z-40 overflow-y-auto bg-paper"
      >
        <nav aria-label="Mobile" className="container-site py-8">
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.href} className="border-b">
                <Link
                  href={item.href}
                  className="flex items-center justify-between py-5 text-title"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-4">
            <Link href="/account" className="link-subtle text-body-sm" onClick={() => setOpen(false)}>
              My account
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}

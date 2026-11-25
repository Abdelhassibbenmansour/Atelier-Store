import Link from "next/link";

import { NewsletterForm } from "@/components/layout/newsletter-form";
import { footerLinks } from "@/lib/sample-data";

export function SiteFooter() {
  return (
    <footer className="border-t bg-paper">
      <div className="container-site section grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 className="eyebrow">Newsletter</h2>
          <p className="mt-4 max-w-sm text-body-sm text-muted">
            Be the first to hear about new collections, private events and the stories behind our
            craft.
          </p>
          <div className="mt-6 max-w-md">
            <NewsletterForm />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-6 lg:col-start-7">
          {footerLinks.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="eyebrow">{group.title}</h2>
              <ul className="mt-5 flex flex-col gap-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="link-subtle text-body-sm text-muted hover:text-ink">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="border-t">
        <div className="container-site flex flex-col items-center gap-3 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <span className="heading-display text-[1.5rem] leading-none tracking-[0.18em] uppercase">
            Atelier
          </span>
          <p className="text-caption text-muted">© 2026 Atelier Store. Sample storefront.</p>
        </div>
      </div>
    </footer>
  );
}

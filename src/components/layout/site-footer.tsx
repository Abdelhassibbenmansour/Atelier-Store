import { NewsletterForm } from "@/components/layout/newsletter-form";

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

// Product listing layout shared by listing routes (/new-in, /[category], /search):
// breadcrumb + editorial header, then the product grid or an empty state.
import Link from "next/link";
import type { ReactNode } from "react";

import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/lib/product";

type EmptyState = {
  title: string;
  body: string;
  action: { label: string; href: string };
};

type ListingHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  /** Shown as "N pieces" on the right; omit to hide. */
  count?: number;
  /** Extra content under the title, e.g. a search form. */
  children?: ReactNode;
};

export function ListingHeader({ eyebrow, title, description, count, children }: ListingHeaderProps) {
  return (
    <header className="flex flex-col gap-6 border-b pb-8 lg:pb-12">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2 text-caption uppercase tracking-label text-muted">
          <li>
            <Link href="/" className="link-subtle">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink">
            {title}
          </li>
        </ol>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="max-w-xl">
          <p className="eyebrow text-muted">{eyebrow}</p>
          <h1 className="heading-display mt-2 text-display">{title}</h1>
          {description && <p className="mt-4 text-body text-muted">{description}</p>}
        </div>
        {count !== undefined && count > 0 && (
          <p className="text-body-sm text-muted">
            {count} {count === 1 ? "piece" : "pieces"}
          </p>
        )}
      </div>

      {children}
    </header>
  );
}

type ProductResultsProps = {
  products: Product[];
  empty: EmptyState;
  /** Optional line above the grid, e.g. "3 results for “coat”". */
  summary?: ReactNode;
};

export function ProductResults({ products, empty, summary }: ProductResultsProps) {
  if (products.length === 0) {
    return (
      <div className="container-narrow section flex flex-col items-center gap-6 text-center">
        <h2 className="heading-display max-w-full text-headline break-words">{empty.title}</h2>
        <p className="max-w-prose text-body text-muted">{empty.body}</p>
        <Link href={empty.action.href} className="btn btn-secondary mt-2">
          {empty.action.label}
        </Link>
      </div>
    );
  }

  return (
    <section aria-labelledby="listing-products" className="pt-8 lg:pt-12">
      <h2 id="listing-products" className="sr-only">
        Products
      </h2>
      {summary && <div className="mb-8 text-body-sm text-muted">{summary}</div>}
      <div className="grid-products">
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    </section>
  );
}

type ProductListingProps = Omit<ListingHeaderProps, "count" | "children"> & {
  products: Product[];
  empty: EmptyState;
};

export function ProductListing({ products, empty, ...header }: ProductListingProps) {
  return (
    <div className="container-site pb-section lg:pt-8">
      <ListingHeader {...header} count={products.length} />
      <ProductResults products={products} empty={empty} />
    </div>
  );
}

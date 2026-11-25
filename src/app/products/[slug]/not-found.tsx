import Link from "next/link";

// Shown when /products/[slug] calls notFound() for a slug that matches no product.
export default function ProductNotFound() {
  return (
    <div className="container-narrow section flex flex-col items-center gap-6 text-center">
      <p className="eyebrow text-muted">Product not found</p>
      <h1 className="heading-display text-headline">This piece is no longer available</h1>
      <p className="max-w-prose text-body text-muted">
        It may have sold out or been removed from the collection. Discover the latest arrivals
        instead.
      </p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <Link href="/new-in" className="btn btn-primary">
          Shop new arrivals
        </Link>
        <Link href="/" className="btn btn-secondary">
          Back to home
        </Link>
      </div>
    </div>
  );
}

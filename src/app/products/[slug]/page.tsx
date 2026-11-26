/**
 * Product detail page — URL: /products/[slug]
 *
 * Folder layout (Next.js colocation):
 *   products/[slug]/
 *     page.tsx        ← this file: data lookup + the page UI
 *     not-found.tsx   ← shown when the slug matches no product
 *     _components/    ← UI used only by this page ("_" = private, never a route)
 *
 * Shared UI (e.g. ProductCard, also used on the homepage) lives in src/components.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/product/product-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getProduct, getProductSlugs, getRelatedProducts } from "@/lib/catalog";
import { formatPrice, getStockStatus, type Product } from "@/lib/product";
import { productServices } from "@/lib/sample-data";

import { ProductAccordion } from "./_components/product-accordion";
import { ProductGallery } from "./_components/product-gallery";
import { PurchasePanel } from "./_components/purchase-panel";
import { StockStatus } from "./_components/stock-status";

type Props = PageProps<"/products/[slug]">;

/* ---------------------------------------------------------------------------
   Routing & data
   --------------------------------------------------------------------------- */

// Prerender one page per product in the database at build time. Products added
// later are rendered on first visit and cached; unknown slugs hit notFound() below.
// Cache Components rejects an empty list, so an empty catalogue falls back to a
// placeholder slug (which 404s).
export async function generateStaticParams() {
  const slugs = await getProductSlugs();
  if (slugs.length === 0) return [{ slug: "__placeholder__" }];
  return slugs.map((slug) => ({ slug }));
}

// <title>, description and social preview for each product.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};

  const [image] = product.images;
  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [{ url: image.src, alt: image.alt }],
    },
  };
}

/* ---------------------------------------------------------------------------
   Page
   --------------------------------------------------------------------------- */

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound(); // renders ./not-found.tsx with a 404 status

  return (
    <>
      <ProductStructuredData product={product} />

      <div className="container-site pb-section lg:pt-8">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12 xl:gap-16">
          {/* Left: large imagery */}
          <div className="lg:col-span-7">
            <ProductGallery images={product.images} productName={product.name} />
          </div>

          {/* Right: information, sticky on desktop */}
          <div className="lg:col-span-5 xl:col-span-4 xl:col-start-9">
            <div className="flex flex-col gap-8 lg:sticky lg:top-[calc(var(--spacing-header)+2rem)]">
              <Breadcrumbs product={product} />
              <ProductSummary product={product} />
              <PurchasePanel
                productId={product.id}
                sizes={product.sizes}
                stockStatus={getStockStatus(product)}
              />
              <ProductDetails product={product} />
            </div>
          </div>
        </div>
      </div>

      <RelatedProducts product={product} />
    </>
  );
}

/* ---------------------------------------------------------------------------
   Page sections
   --------------------------------------------------------------------------- */

function Breadcrumbs({ product }: { product: Product }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-caption uppercase tracking-label text-muted">
        <li>
          <Link href="/" className="link-subtle">
            Home
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link href={product.category.href} className="link-subtle">
            {product.category.name}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="text-ink">
          {product.name}
        </li>
      </ol>
    </nav>
  );
}

/** Name, price, colour, style reference and stock state. */
function ProductSummary({ product }: { product: Product }) {
  return (
    <header className="flex flex-col gap-3">
      {product.isNew && <p className="eyebrow text-muted">New season</p>}
      <h1 className="heading-display text-headline">{product.name}</h1>
      <p className="text-lead">{formatPrice(product.price)}</p>

      <dl className="mt-1 flex flex-col gap-1 text-body-sm">
        <div className="flex gap-2">
          <dt className="text-muted">Colour</dt>
          <dd>{product.color}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted">Style</dt>
          <dd>{product.reference}</dd>
        </div>
      </dl>

      <StockStatus product={product} />
    </header>
  );
}

/** Collapsible description, materials and service information. */
function ProductDetails({ product }: { product: Product }) {
  return (
    <ProductAccordion
      items={[
        {
          title: "Description",
          defaultOpen: true,
          content: <p>{product.description}</p>,
        },
        {
          title: "Details & materials",
          content: (
            <ul className="flex list-disc flex-col gap-1.5 pl-4 marker:text-subtle">
              {product.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ),
        },
        ...productServices.map((service) => ({
          title: service.title,
          content: <p>{service.body}</p>,
        })),
      ]}
    />
  );
}

/** "You may also like": same category first, then the rest of the catalogue. */
async function RelatedProducts({ product }: { product: Product }) {
  const related = await getRelatedProducts(product.id);

  return (
    <section aria-labelledby="related-title" className="section border-t">
      <div className="container-site">
        <SectionHeading
          id="related-title"
          eyebrow="Complete the look"
          title="You may also like"
          action={{ label: `View ${product.category.name}`, href: product.category.href }}
        />
        <div className="grid-products">
          {related.map((item) => (
            <ProductCard key={item.slug} product={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** schema.org Product data, read by search engines (not visible on the page). */
function ProductStructuredData({ product }: { product: Product }) {
  const availability = {
    in_stock: "https://schema.org/InStock",
    low_stock: "https://schema.org/LimitedAvailability",
    out_of_stock: "https://schema.org/OutOfStock",
  }[getStockStatus(product)];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.reference,
    description: product.description,
    color: product.color,
    category: product.category.name,
    image: product.images.map((image) => image.src),
    offers: { "@type": "Offer", price: product.price, priceCurrency: "USD", availability },
  };

  return (
    <script
      type="application/ld+json"
      // Escape "<" so product copy can never close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
    />
  );
}

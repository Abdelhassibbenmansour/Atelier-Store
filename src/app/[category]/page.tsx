/**
 * Category collection page — URL: /[category] (e.g. /handbags, /shoes)
 *
 * Matches the category hrefs built in src/lib/catalog.ts (`/${category.slug}`).
 * Static routes such as /new-in take precedence over this dynamic segment.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductListing } from "@/components/product/product-listing";
import { getCategorySlugs, getCategoryWithProducts } from "@/lib/catalog";

type Props = PageProps<"/[category]">;

// Prerender one page per category. Categories added later render on first visit
// and are cached. Cache Components rejects an empty list, so an empty table falls
// back to a placeholder slug (which 404s).
export async function generateStaticParams() {
  const slugs = await getCategorySlugs();
  if (slugs.length === 0) return [{ category: "__placeholder__" }];
  return slugs.map((category) => ({ category }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const result = await getCategoryWithProducts(slug);
  if (!result) return {};

  const { name } = result.category;
  return {
    title: name,
    description: `Shop ${name.toLowerCase()} from the atelier.`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category: slug } = await params;
  const result = await getCategoryWithProducts(slug);
  if (!result) notFound();

  const { category, products } = result;

  return (
    <ProductListing
      eyebrow="Collection"
      title={category.name}
      products={products}
      empty={{
        title: "New pieces are on their way",
        body: `There is nothing in ${category.name.toLowerCase()} right now. Discover the latest arrivals instead.`,
        action: { label: "Shop new arrivals", href: "/new-in" },
      }}
    />
  );
}

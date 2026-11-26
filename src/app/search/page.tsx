/**
 * Product search — URL: /search?q=…
 *
 * The header is prerendered. Only the parts that read the query (the form's value
 * and the results) wait for searchParams, inside <Suspense>, as Cache Components
 * requires. Results come from searchProducts() in src/lib/catalog.ts, cached per query.
 */
import type { Metadata } from "next";
import { Suspense } from "react";

import { ListingHeader, ProductResults } from "@/components/product/product-listing";
import { searchProducts, toSearchTerms } from "@/lib/catalog";
import { firstParam } from "@/lib/search-params";

import { SearchForm } from "./_components/search-form";

export const metadata: Metadata = {
  title: "Search",
  description: "Search the Atelier collection by piece, colour or category.",
  // Result pages are endless query variations: keep them out of search engines.
  robots: { index: false, follow: true },
};

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  const query = searchParams.then(({ q }) => firstParam(q).trim());

  return (
    <div className="container-site pb-section lg:pt-8">
      <ListingHeader eyebrow="Discover" title="Search">
        <Suspense fallback={<SearchForm />}>
          <QueryForm query={query} />
        </Suspense>
      </ListingHeader>

      <Suspense>
        <SearchResults query={query} />
      </Suspense>
    </div>
  );
}

async function QueryForm({ query }: { query: Promise<string> }) {
  return <SearchForm query={await query} />;
}

async function SearchResults({ query: queryPromise }: { query: Promise<string> }) {
  const query = await queryPromise;

  if (toSearchTerms(query).length === 0) {
    return (
      <ProductResults
        products={[]}
        empty={{
          title: "What are you looking for?",
          body: "Search by piece, colour or category, such as “tote”, “black” or “shoes”.",
          action: { label: "Shop new arrivals", href: "/new-in" },
        }}
      />
    );
  }

  const results = await searchProducts(query);
  const count = results.length;

  return (
    <ProductResults
      products={results}
      empty={{
        title: `No results for “${query}”`,
        body: "Check the spelling or try a broader word, such as a colour or category.",
        action: { label: "Shop new arrivals", href: "/new-in" },
      }}
      summary={
        <p role="status" className="break-words">
          {count} {count === 1 ? "result" : "results"} for{" "}
          <span className="text-ink">“{query}”</span>
        </p>
      }
    />
  );
}

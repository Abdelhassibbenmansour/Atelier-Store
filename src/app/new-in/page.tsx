/**
 * New arrivals — URL: /new-in
 *
 * The latest pieces from the catalogue: new-season products first, then the most
 * recently added (see getNewArrivals in src/lib/catalog.ts). The read is cached with
 * "use cache", so the page is prerendered and refreshed by revalidateTag("products").
 */
import type { Metadata } from "next";

import { ProductListing } from "@/components/product/product-listing";
import { getNewArrivals } from "@/lib/catalog";

const MAX_PRODUCTS = 48;
const DESCRIPTION = "The latest pieces from the atelier, from soft tailoring to sculpted leather.";

export const metadata: Metadata = {
  title: "New arrivals",
  description: DESCRIPTION,
};

export default async function NewInPage() {
  const products = await getNewArrivals(MAX_PRODUCTS);

  return (
    <ProductListing
      eyebrow="Just in"
      title="New arrivals"
      description={DESCRIPTION}
      products={products}
      empty={{
        title: "New pieces are on their way",
        body: "The next collection is being finished in the atelier. Come back soon.",
        action: { label: "Back to home", href: "/" },
      }}
    />
  );
}

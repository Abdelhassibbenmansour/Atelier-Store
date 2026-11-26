// Keeps cached storefront pages in step with product_stock (server only).
//
// Storefront reads in src/lib/catalog.ts are cached ("use cache", tags "products" and
// "product:<slug>"). Anything that changes stock outside the admin actions — checkout
// holding stock and giving it back — calls invalidateProductStock() after its
// transaction commits. revalidateTag works in Server Actions and Route Handlers (the
// Stripe webhook), unlike updateTag.
import "server-only";

import { inArray } from "drizzle-orm";
import { revalidateTag } from "next/cache";

import { db } from "@/db";
import { products } from "@/db/schema";
import { CATALOG_TAG } from "@/lib/catalog";

/**
 * Product pages show the new stock on the next request ({ expire: 0 }). Listings and
 * related products (cards with "Sold out" / "Only N left") refresh in the background
 * ("max"), so the first visitor after a change may still see the previous card; the
 * bag and checkout always re-check live stock, so this can't oversell.
 * Never throws: a failed refresh must not undo a committed stock change.
 */
export async function invalidateProductStock(productIds: Iterable<string>) {
  const ids = [...new Set(productIds)];
  if (ids.length === 0) return;

  try {
    const rows = await db
      .select({ slug: products.slug })
      .from(products)
      .where(inArray(products.id, ids));
    for (const { slug } of rows) revalidateTag(`product:${slug}`, { expire: 0 });
    revalidateTag(CATALOG_TAG, "max");
  } catch (error) {
    console.error("[stock] could not refresh cached product pages", error);
  }
}

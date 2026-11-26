// Catalogue data access for the storefront. Every read is cached with "use cache", so
// pages that use it are still prerendered — except getProductsForBag, which is fresh
// on purpose (bag prices and stock limits must be current). cacheLife("minutes") bounds how stale stock
// and prices can get; call revalidateTag("products") (or updateTag in a Server Action)
// after writing catalogue data to refresh immediately.
import "server-only";

import { and, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db";
import { categories, products, productStock } from "@/db/schema";
import type { BagProduct } from "@/lib/bag-types";
import type { Product } from "@/lib/product";

export const CATALOG_TAG = "products";

const productTag = (slug: string) => `product:${slug}`;

const productFields = {
  product: products,
  category: { name: categories.name, slug: categories.slug },
  quantity: productStock.quantity,
};

function selectProducts() {
  return db
    .select(productFields)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(productStock, eq(productStock.productId, products.id));
}

type ProductRow = Awaited<ReturnType<typeof selectProducts>>[number];

function toProduct({ product, category, quantity }: ProductRow): Product {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    reference: product.reference,
    category: { name: category.name, href: `/${category.slug}` },
    price: product.priceCents / 100,
    href: `/products/${product.slug}`,
    isNew: product.isNew,
    color: product.color,
    description: product.description,
    details: product.details,
    sizes: product.sizes ?? undefined,
    stock: quantity ?? 0,
    // Non-empty is enforced by the products_images_not_empty check constraint.
    images: product.images as Product["images"],
  };
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG, productTag(slug));

  const [row] = await selectProducts().where(eq(products.slug, slug)).limit(1);
  return row ? toProduct(row) : undefined;
}

export async function getProductSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const rows = await db.select({ slug: products.slug }).from(products);
  return rows.map((row) => row.slug);
}

/** New-season pieces first, then the most recently added. */
export async function getNewArrivals(limit = 8): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const rows = await selectProducts()
    .orderBy(desc(products.isNew), desc(products.createdAt), products.slug)
    .limit(limit);
  return rows.map(toProduct);
}

/**
 * Current price and stock for the products in a bag, keyed by product id.
 *
 * Deliberately NOT cached: the bag must show current prices and must never allow
 * more than the stock available right now. It reads the database on every call, so
 * callers render it inside <Suspense> or call it from a Server Action.
 */
export async function getProductsForBag(ids: string[]): Promise<Map<string, BagProduct>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();

  const rows = await selectProducts().where(inArray(products.id, unique));
  return new Map(
    rows.map((row) => {
      const product = toProduct(row);
      return [
        product.id,
        {
          id: product.id,
          slug: product.slug,
          name: product.name,
          href: product.href,
          color: product.color,
          categoryName: product.category.name,
          priceCents: row.product.priceCents,
          stock: product.stock,
          sizes: product.sizes,
          image: product.images[0],
        },
      ];
    }),
  );
}

export type Category = {
  slug: string;
  name: string;
  href: string;
};

export async function getCategorySlugs(): Promise<string[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const rows = await db
    .select({ slug: categories.slug })
    .from(categories)
    .orderBy(categories.sortOrder, categories.slug);
  return rows.map((row) => row.slug);
}

/** A category and its products, newest first. Undefined if the slug is unknown. */
export async function getCategoryWithProducts(
  slug: string,
): Promise<{ category: Category; products: Product[] } | undefined> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const [category] = await db
    .select({ slug: categories.slug, name: categories.name })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  if (!category) return undefined;

  const rows = await selectProducts()
    .where(eq(categories.slug, slug))
    .orderBy(desc(products.createdAt), products.slug);

  return {
    category: { ...category, href: `/${category.slug}` },
    products: rows.map(toProduct),
  };
}

/**
 * ILIKE pattern matching `term` anywhere. Escapes the LIKE wildcards "%" and "_" (and
 * the escape character "\") so they match literally. Used by every search.
 */
export function containsPattern(term: string) {
  return `%${term.replace(/[\\%_]/g, "\\$&")}%`;
}

/** Longest query and most words searched; anything beyond is ignored. */
const SEARCH_MAX_LENGTH = 100;
const SEARCH_MAX_TERMS = 6;

/** Splits a raw query into lower-cased words, within the limits above. */
export function toSearchTerms(query: string): string[] {
  return query
    .slice(0, SEARCH_MAX_LENGTH)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, SEARCH_MAX_TERMS);
}

/**
 * Products matching every word of the query in their name, colour, category,
 * style reference or description. New-season pieces first, then newest.
 */
export async function searchProducts(query: string, limit = 48): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const terms = toSearchTerms(query);
  if (terms.length === 0) return [];

  const conditions = terms.map((term) => {
    const pattern = containsPattern(term);
    return or(
      ilike(products.name, pattern),
      ilike(products.color, pattern),
      ilike(products.reference, pattern),
      ilike(products.description, pattern),
      ilike(categories.name, pattern),
    );
  });

  const rows = await selectProducts()
    .where(and(...conditions))
    .orderBy(desc(products.isNew), desc(products.createdAt), products.slug)
    .limit(limit);
  return rows.map(toProduct);
}

/** Same category first, then the rest of the catalogue. */
export async function getRelatedProducts(productId: string, limit = 4): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const categoryId = db
    .select({ id: products.categoryId })
    .from(products)
    .where(eq(products.id, productId));

  const rows = await selectProducts()
    .where(ne(products.id, productId))
    .orderBy(
      desc(sql`${products.categoryId} = (${categoryId})`),
      desc(products.createdAt),
      products.slug,
    )
    .limit(limit);
  return rows.map(toProduct);
}

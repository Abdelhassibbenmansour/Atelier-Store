// Catalogue data access for the storefront. Every read is cached with "use cache", so
// pages that use it are still prerendered. cacheLife("minutes") bounds how stale stock
// and prices can get; call revalidateTag("products") (or updateTag in a Server Action)
// after writing catalogue data to refresh immediately.
import "server-only";

import { desc, eq, ne, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db";
import { categories, products, productStock } from "@/db/schema";
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

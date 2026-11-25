// Loads the initial catalogue: `npm run db:seed`.
// Safe to re-run: rows are upserted by slug, and existing rows (including stock
// quantities) are reset to the values in seed-data.ts.
//
// Standalone script: it builds its own client instead of importing src/db/index.ts,
// which imports `server-only` and so only works inside Next.js.
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { getTableColumns, sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import type { PgTable } from "drizzle-orm/pg-core";

import * as schema from "./schema";
import { categories, products, productStock } from "./schema";
import { seedCategories, seedProducts } from "./seed-data";

// Same files Next.js reads; .env.local wins when both set a value.
config({ path: [".env.local", ".env"], quiet: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. See .env.example.");
}
if (/@HOST\.|USER:PASSWORD/.test(databaseUrl)) {
  throw new Error("DATABASE_URL in .env.local is still the placeholder from .env.example.");
}

const db = drizzle({ client: neon(databaseUrl), schema });

/** `set` clause that overwrites the given columns with the incoming row on conflict. */
function excluded<T extends PgTable, K extends keyof T["_"]["columns"] & string>(
  table: T,
  keys: K[],
) {
  const columns = getTableColumns(table);
  return Object.fromEntries(
    keys.map((key) => [key, sql.raw(`excluded."${columns[key].name}"`)]),
  ) as Record<K, SQL>;
}

async function main() {
  const categoryRows = await db
    .insert(categories)
    .values(seedCategories)
    .onConflictDoUpdate({
      target: categories.slug,
      set: { ...excluded(categories, ["name", "sortOrder"]), updatedAt: new Date() },
    })
    .returning({ id: categories.id, slug: categories.slug });

  const categoryIds = new Map(categoryRows.map((row) => [row.slug, row.id]));

  // Stagger created_at so "newest first" follows the order in seed-data.ts.
  const now = Date.now();
  const productRows = await db
    .insert(products)
    .values(
      seedProducts.map((product, index) => {
        const categoryId = categoryIds.get(product.categorySlug);
        if (!categoryId) {
          throw new Error(`Unknown category "${product.categorySlug}" for ${product.slug}`);
        }
        return {
          slug: product.slug,
          reference: product.reference,
          name: product.name,
          color: product.color,
          description: product.description,
          priceCents: product.priceCents,
          isNew: product.isNew ?? false,
          details: product.details,
          sizes: product.sizes ?? null,
          images: product.images,
          categoryId,
          createdAt: new Date(now - index * 60_000),
        };
      }),
    )
    .onConflictDoUpdate({
      target: products.slug,
      set: {
        ...excluded(products, [
          "categoryId",
          "reference",
          "name",
          "color",
          "description",
          "priceCents",
          "isNew",
          "details",
          "sizes",
          "images",
          "createdAt",
        ]),
        updatedAt: new Date(),
      },
    })
    .returning({ id: products.id, slug: products.slug });

  const productIds = new Map(productRows.map((row) => [row.slug, row.id]));

  await db
    .insert(productStock)
    .values(
      seedProducts.map((product) => ({
        productId: productIds.get(product.slug)!,
        quantity: product.stock,
      })),
    )
    .onConflictDoUpdate({
      target: productStock.productId,
      set: { ...excluded(productStock, ["quantity"]), updatedAt: new Date() },
    });

  console.log(
    `Seeded ${categoryRows.length} categories, ${productRows.length} products and their stock.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

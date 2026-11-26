// Loads the initial catalogue: `npm run db:seed`.
// Safe to re-run: everything is insert-only. Categories, products and stock that already
// exist keep their live values (admins manage them in /admin), and only missing seed
// rows are added.
//   --reset-catalog  overwrite seeded categories and products (names, prices, images...)
//                    with seed-data.ts, matched by slug
//   --reset-stock    overwrite stock with seed values; refused while checkouts hold stock
// The storefront cache can't be refreshed from here: after a reset, cached pages update
// within a few minutes (cacheLife "minutes").
//
// Standalone script: it builds its own client instead of importing src/db/index.ts,
// which imports `server-only` and so only works inside Next.js.
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { getTableColumns, inArray, sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import type { PgTable } from "drizzle-orm/pg-core";

import * as schema from "./schema";
import { categories, orders, products, productStock } from "./schema";
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
  const resetCatalog = process.argv.includes("--reset-catalog");

  const insertCategories = db.insert(categories).values(seedCategories);
  const createdCategories = await (
    resetCatalog
      ? insertCategories.onConflictDoUpdate({
          target: categories.slug,
          set: { ...excluded(categories, ["name", "sortOrder"]), updatedAt: new Date() },
        })
      : insertCategories.onConflictDoNothing()
  ).returning({ id: categories.id });

  const categoryRows = await db
    .select({ id: categories.id, slug: categories.slug })
    .from(categories)
    .where(
      inArray(
        categories.slug,
        seedCategories.map((category) => category.slug),
      ),
    );
  const categoryIds = new Map(categoryRows.map((row) => [row.slug, row.id]));

  // Stagger created_at so "newest first" follows the order in seed-data.ts.
  const now = Date.now();
  const insertProducts = db.insert(products).values(
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
  );
  const createdProducts = await (
    resetCatalog
      ? insertProducts.onConflictDoUpdate({
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
      : // Any unique conflict (slug or a reference an admin reused) keeps the existing row.
        insertProducts.onConflictDoNothing()
  ).returning({ id: products.id });

  const productRows = await db
    .select({ id: products.id, slug: products.slug })
    .from(products)
    .where(
      inArray(
        products.slug,
        seedProducts.map((product) => product.slug),
      ),
    );
  const productIds = new Map(productRows.map((row) => [row.slug, row.id]));
  const catalogSummary = resetCatalog
    ? `reset ${categoryRows.length} categories and ${productRows.length} products to seed values`
    : `added ${createdCategories.length} new categories and ${createdProducts.length} new products ` +
      `(existing ones kept their live values)`;

  // A seed product skipped because its reference is taken by another product has no row.
  const stockRows = seedProducts.flatMap((product) => {
    const productId = productIds.get(product.slug);
    return productId ? [{ productId, quantity: product.stock }] : [];
  });

  if (process.argv.includes("--reset-stock")) {
    // Stock held by open checkouts (pending, or processing = delayed payment still
    // settling) comes back if they aren't paid; resetting under them would
    // double-count it. Run this only when no checkouts are in progress.
    const openHolds = sql`EXISTS (SELECT 1 FROM ${orders} WHERE ${orders.status} IN ('pending', 'processing') AND ${orders.stockReleasedAt} IS NULL)`;
    const [{ held }] = await db
      .select({ held: sql<boolean>`${openHolds}` })
      .from(sql`(SELECT 1) AS one`);
    if (held) {
      throw new Error(
        "Refusing --reset-stock: open checkouts hold stock. Try again once they are paid or expired.",
      );
    }
    // The guard is repeated inside the upsert itself, so a checkout starting between
    // the check above and this write can't have its hold overwritten.
    const updated = await db
      .insert(productStock)
      .values(stockRows)
      .onConflictDoUpdate({
        target: productStock.productId,
        set: { ...excluded(productStock, ["quantity"]), updatedAt: new Date() },
        setWhere: sql`NOT ${openHolds}`,
      })
      .returning({ productId: productStock.productId });
    if (updated.length < stockRows.length) {
      throw new Error(
        `A checkout started during --reset-stock: ${stockRows.length - updated.length} stock row(s) were left unchanged. Run it again once checkouts are finished.`,
      );
    }
    console.log(`Seed: ${catalogSummary}; stock reset to seed values.`);
    return;
  }

  const inserted = await db
    .insert(productStock)
    .values(stockRows)
    .onConflictDoNothing({ target: productStock.productId })
    .returning({ productId: productStock.productId });

  console.log(
    `Seed: ${catalogSummary}; created stock for ${inserted.length}, ` +
      `kept existing stock for ${stockRows.length - inserted.length}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

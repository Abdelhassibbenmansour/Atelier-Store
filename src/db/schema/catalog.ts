import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Shapes stored in JSONB columns. Kept here (not in src/lib) so drizzle-kit and the
// seed script can load the schema without going through the `@/` path alias.
export type ProductImage = {
  src: string;
  alt: string;
};

export type ProductSize = {
  label: string;
  available: boolean;
};

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    slug: text("slug").notNull().unique(),
    /** Style reference / SKU shown on the detail page. */
    reference: text("reference").notNull().unique(),
    name: text("name").notNull(),
    color: text("color").notNull(),
    description: text("description").notNull(),
    /** Whole price in cents, e.g. 245000 = $2,450. */
    priceCents: integer("price_cents").notNull(),
    isNew: boolean("is_new").notNull().default(false),
    details: text("details").array().notNull().default(sql`'{}'::text[]`),
    /** Null for one-size items (bags, jewellery...). No per-size stock yet. */
    sizes: jsonb("sizes").$type<ProductSize[]>(),
    /** Ordered; the first image is the primary one, used on cards. */
    images: jsonb("images").$type<ProductImage[]>().notNull(),
    ...timestamps,
  },
  (table) => [
    index("products_category_id_idx").on(table.categoryId),
    index("products_created_at_idx").on(table.createdAt),
    check("products_price_cents_non_negative", sql`${table.priceCents} >= 0`),
    check(
      "products_images_not_empty",
      sql`jsonb_typeof(${table.images}) = 'array' AND jsonb_array_length(${table.images}) > 0`,
    ),
  ],
);

/** Units available per product (one total across sizes). 1:1 with products. */
export const productStock = pgTable(
  "product_stock",
  {
    productId: uuid("product_id")
      .primaryKey()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(0),
    updatedAt: timestamps.updatedAt,
  },
  (table) => [check("product_stock_quantity_non_negative", sql`${table.quantity} >= 0`)],
);

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  stock: one(productStock),
}));

export const productStockRelations = relations(productStock, ({ one }) => ({
  product: one(products, {
    fields: [productStock.productId],
    references: [products.id],
  }),
}));

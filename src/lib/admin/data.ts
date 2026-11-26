// Admin reads (server only). Every function checks the admin role itself, so no page
// can show admin data by forgetting a check. Reads are NOT cached: admins need current
// stock, prices and orders. Callers render them inside <Suspense>.
//
// Customer-facing reads stay in src/lib/catalog.ts (cached) and src/lib/orders.ts
// (scoped to the signed-in customer).
import "server-only";

import { and, asc, count, desc, eq, ilike, inArray, isNull, notInArray, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  categories,
  orderItems,
  orders,
  products,
  productStock,
  users,
  type OrderStatus,
} from "@/db/schema";
import type { StockFilters } from "@/lib/admin/validation";
import { containsPattern, toSearchTerms } from "@/lib/catalog";
import type { OrderDetails } from "@/lib/orders";
import { isUuid } from "@/lib/ids";
import { LOW_STOCK_THRESHOLD } from "@/lib/product";
import { requireAdmin } from "@/lib/session";


/* ---------------------------------------------------------------------------
   Products & stock
   --------------------------------------------------------------------------- */

export type AdminProductRow = {
  id: string;
  slug: string;
  name: string;
  reference: string;
  categoryName: string;
  categorySlug: string;
  priceCents: number;
  isNew: boolean;
  stock: number;
  sizes: { label: string; available: boolean }[] | null;
  image: { src: string; alt: string } | undefined;
};

const productRowFields = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  reference: products.reference,
  categoryName: categories.name,
  categorySlug: categories.slug,
  priceCents: products.priceCents,
  isNew: products.isNew,
  sizes: products.sizes,
  images: products.images,
  stock: sql<number>`coalesce(${productStock.quantity}, 0)`.mapWith(Number),
};

type SelectedProductRow = Omit<AdminProductRow, "image"> & {
  images: { src: string; alt: string }[];
};

function toProductRow({ images, ...row }: SelectedProductRow): AdminProductRow {
  return { ...row, image: images[0] };
}

export async function listAdminProducts(filters: { categorySlug?: string; q?: string } = {}) {
  await requireAdmin("/admin/products");

  const terms = toSearchTerms(filters.q ?? "");
  const conditions = [
    filters.categorySlug ? eq(categories.slug, filters.categorySlug) : undefined,
    ...terms.map((term) => {
      const pattern = containsPattern(term);
      return or(
        ilike(products.name, pattern),
        ilike(products.reference, pattern),
        ilike(products.slug, pattern),
      );
    }),
  ].filter(Boolean);

  const rows = await db
    .select(productRowFields)
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(productStock, eq(productStock.productId, products.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(categories.sortOrder), asc(products.name));
  return rows.map(toProductRow);
}

/**
 * Units currently held by open checkouts, per product: pending orders (on Stripe's
 * page) and processing ones (delayed payment still settling) whose stock wasn't
 * released. Both come back if the payment doesn't complete. product_stock.quantity
 * already excludes them; this is for display.
 */
const heldByProduct = db
  .select({
    productId: orderItems.productId,
    held: sql<number>`sum(${orderItems.quantity})`.mapWith(Number).as("held"),
  })
  .from(orderItems)
  .innerJoin(orders, eq(orders.id, orderItems.orderId))
  .where(and(inArray(orders.status, ["pending", "processing"]), isNull(orders.stockReleasedAt)))
  .groupBy(orderItems.productId)
  .as("held_by_product");

export type AdminStockRow = AdminProductRow & { held: number };

/**
 * Stock per product with optional filters, lowest first so the ones needing attention
 * come first. `status`: low = 1..LOW_STOCK_THRESHOLD, out = 0.
 */
export async function listAdminStock(filters: StockFilters = { status: "all", category: "", q: "" }) {
  await requireAdmin("/admin/stock");

  const quantity = sql`coalesce(${productStock.quantity}, 0)`;
  const terms = toSearchTerms(filters.q);
  const conditions = [
    filters.status === "out" ? sql`${quantity} = 0` : undefined,
    filters.status === "low" ? sql`${quantity} between 1 and ${LOW_STOCK_THRESHOLD}` : undefined,
    filters.category ? eq(categories.slug, filters.category) : undefined,
    ...terms.map((term) => {
      const pattern = containsPattern(term);
      return or(
        ilike(products.name, pattern),
        ilike(products.reference, pattern),
        ilike(products.slug, pattern),
      );
    }),
  ].filter(Boolean);

  const rows = await db
    .select({
      ...productRowFields,
      held: sql<number>`coalesce(${heldByProduct.held}, 0)`.mapWith(Number),
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(productStock, eq(productStock.productId, products.id))
    .leftJoin(heldByProduct, eq(heldByProduct.productId, products.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(quantity), asc(products.name));
  return rows.map(({ held, ...row }) => ({ ...toProductRow(row), held }) as AdminStockRow);
}

/** Units of one product held by open checkouts. */
export async function getHeldStock(productId: string) {
  await requireAdmin(`/admin/products/${productId}`);
  if (!isUuid(productId)) return 0;
  const [row] = await db
    .select({ held: heldByProduct.held })
    .from(heldByProduct)
    .where(eq(heldByProduct.productId, productId));
  return row?.held ?? 0;
}

export async function getAdminProduct(id: string) {
  await requireAdmin(`/admin/products/${id}`);
  if (!isUuid(id)) return null;

  const [row] = await db
    .select({
      product: products,
      stock: sql<number>`coalesce(${productStock.quantity}, 0)`.mapWith(Number),
    })
    .from(products)
    .leftJoin(productStock, eq(productStock.productId, products.id))
    .where(eq(products.id, id))
    .limit(1);
  return row ? { ...row.product, stock: row.stock } : null;
}

/* ---------------------------------------------------------------------------
   Categories
   --------------------------------------------------------------------------- */

export async function listAdminCategories() {
  await requireAdmin("/admin/categories");

  return db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      sortOrder: categories.sortOrder,
      productCount: count(products.id),
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

/* ---------------------------------------------------------------------------
   Orders
   --------------------------------------------------------------------------- */

/** Default list hides checkouts that never took a payment. */
const HIDDEN_BY_DEFAULT: OrderStatus[] = ["canceled", "expired"];

export async function listAdminOrders(filters: { status?: OrderStatus | "all" } = {}) {
  await requireAdmin("/admin/orders");

  const where =
    filters.status === "all"
      ? undefined
      : filters.status
        ? eq(orders.status, filters.status)
        : notInArray(orders.status, HIDDEN_BY_DEFAULT);

  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      createdAt: orders.createdAt,
      totalCents: sql<number>`coalesce(${orders.amountTotalCents}, ${orders.subtotalCents})`.mapWith(
        Number,
      ),
      customerEmail: users.email,
      itemCount: sql<number>`coalesce((select sum(${orderItems.quantity}) from ${orderItems} where ${orderItems.orderId} = ${orders.id}), 0)`.mapWith(
        Number,
      ),
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(100);
  return rows;
}

export type AdminOrder = OrderDetails & { customer: { name: string; email: string } };

/** Any customer's order, for admins only. */
export async function getAdminOrder(id: string): Promise<AdminOrder | null> {
  await requireAdmin(`/admin/orders/${id}`);
  if (!isUuid(id)) return null;

  const [row] = await db
    .select({ order: orders, customer: { name: users.name, email: users.email } })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .where(eq(orders.id, id))
    .limit(1);
  if (!row) return null;

  const items = await db
    .select({
      productName: orderItems.productName,
      size: orderItems.size,
      unitPriceCents: orderItems.unitPriceCents,
      quantity: orderItems.quantity,
      slug: products.slug,
      images: products.images,
    })
    .from(orderItems)
    .innerJoin(products, eq(products.id, orderItems.productId))
    .where(eq(orderItems.orderId, id))
    .orderBy(asc(orderItems.productName));

  return {
    ...row.order,
    customer: row.customer,
    items: items.map(({ images, ...item }) => ({ ...item, image: images[0] })),
  };
}

/* ---------------------------------------------------------------------------
   Overview
   --------------------------------------------------------------------------- */

export async function getAdminCounts() {
  await requireAdmin("/admin");

  const [[productsRow], [stockRow], [ordersRow]] = await Promise.all([
    db.select({ n: count() }).from(products),
    db
      .select({
        low: sql<number>`count(*) filter (where ${productStock.quantity} > 0 and ${productStock.quantity} <= ${LOW_STOCK_THRESHOLD})`.mapWith(Number),
        out: sql<number>`count(*) filter (where ${productStock.quantity} = 0)`.mapWith(Number),
      })
      .from(productStock),
    db
      .select({ n: count() })
      .from(orders)
      .where(inArray(orders.status, ["paid", "processing", "needs_review"])),
  ]);

  return {
    products: productsRow.n,
    lowStock: stockRow.low,
    outOfStock: stockRow.out,
    orders: ordersRow.n,
    // Orders that need someone to look at them.
    needsReview: (
      await db.select({ n: count() }).from(orders).where(eq(orders.status, "needs_review"))
    )[0].n,
  };
}


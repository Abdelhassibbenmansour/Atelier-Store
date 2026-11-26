"use server";

// Admin Server Actions. Every exported action starts with requireAdminForAction(),
// a fresh database role check, before reading input or writing anything. A non-admin
// (or a direct call by action id) gets a "no access" result and nothing changes.
// After catalogue writes, updateTag() refreshes the cached storefront immediately.

import { and, count, eq, sql } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { txDb } from "@/db/pool";
import { categories, products, productStock } from "@/db/schema";
import {
  adjustStockSchema,
  createCategorySchema,
  createProductSchema,
  fieldErrorsOf,
  MAX_STOCK,
  readProductForm,
  stockSchema,
  updateCategorySchema,
  updateProductSchema,
} from "@/lib/admin/validation";
import { CATALOG_TAG } from "@/lib/catalog";
import { AdminAccessError, requireAdminForAction } from "@/lib/session";

export type AdminActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

const NO_ACCESS: AdminActionState = { status: "error", message: "You don’t have access to do this." };
function invalid(fieldErrors: Record<string, string>): AdminActionState {
  return { status: "error", message: "Check the highlighted fields.", fieldErrors };
}

/** Runs the admin check; returns NO_ACCESS instead of throwing for non-admins. */
async function adminGuard(): Promise<AdminActionState | null> {
  try {
    await requireAdminForAction();
    return null;
  } catch (error) {
    if (error instanceof AdminAccessError) return NO_ACCESS;
    throw error;
  }
}

/** Postgres error code and constraint, unwrapping Drizzle's query error. */
function pgError(error: unknown): { code?: string; constraint?: string } {
  const e = error as { code?: string; constraint?: string; cause?: unknown };
  if (e?.code) return { code: e.code, constraint: e.constraint };
  const cause = e?.cause as { code?: string; constraint?: string } | undefined;
  return { code: cause?.code, constraint: cause?.constraint };
}

function invalidateProduct(slug?: string) {
  updateTag(CATALOG_TAG);
  if (slug) updateTag(`product:${slug}`);
}

/* ---------------------------------------------------------------------------
   Products
   --------------------------------------------------------------------------- */

const UNIQUE_PRODUCT_FIELDS: Record<string, [string, string]> = {
  products_slug_unique: ["slug", "Another product already uses this slug."],
  products_reference_unique: ["reference", "Another product already uses this reference."],
};

function productWriteError(error: unknown): AdminActionState | null {
  const { code, constraint } = pgError(error);
  if (code === "23505" && constraint && UNIQUE_PRODUCT_FIELDS[constraint]) {
    const [field, message] = UNIQUE_PRODUCT_FIELDS[constraint];
    return invalid({ [field]: message });
  }
  if (code === "23503") {
    return invalid({ categoryId: "Choose an existing category." });
  }
  return null;
}

export async function createProduct(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await adminGuard();
  if (denied) return denied;

  const parsed = createProductSchema.safeParse(readProductForm(formData));
  if (!parsed.success) return invalid(fieldErrorsOf(parsed.error));
  const input = parsed.data;

  let id: string;
  try {
    id = await txDb.transaction(async (tx) => {
      const [created] = await tx
        .insert(products)
        .values({
          slug: input.slug,
          reference: input.reference,
          name: input.name,
          categoryId: input.categoryId,
          priceCents: input.price,
          color: input.color,
          description: input.description,
          details: input.details,
          sizes: input.sizes.length > 0 ? input.sizes : null,
          images: input.images,
          isNew: input.isNew,
        })
        .returning({ id: products.id });
      await tx.insert(productStock).values({ productId: created.id, quantity: input.initialStock });
      return created.id;
    });
  } catch (error) {
    const known = productWriteError(error);
    if (known) return known;
    throw error;
  }

  invalidateProduct(input.slug);
  redirect(`/admin/products/${id}?created=1`);
}

export async function updateProduct(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await adminGuard();
  if (denied) return denied;

  const parsed = updateProductSchema.safeParse(readProductForm(formData));
  if (!parsed.success) return invalid(fieldErrorsOf(parsed.error));
  const input = parsed.data;

  let updated: { slug: string } | undefined;
  try {
    [updated] = await db
      .update(products)
      .set({
        reference: input.reference,
        name: input.name,
        categoryId: input.categoryId,
        priceCents: input.price,
        color: input.color,
        description: input.description,
        details: input.details,
        sizes: input.sizes.length > 0 ? input.sizes : null,
        images: input.images,
        isNew: input.isNew,
      })
      .where(eq(products.id, input.id))
      .returning({ slug: products.slug });
  } catch (error) {
    const known = productWriteError(error);
    if (known) return known;
    throw error;
  }
  if (!updated) return { status: "error", message: "This product no longer exists." };

  invalidateProduct(updated.slug);
  return { status: "success", message: "Product saved." };
}

/* ---------------------------------------------------------------------------
   Stock
   --------------------------------------------------------------------------- */

/**
 * Sets a product's stock only if it still equals what the admin saw (`expected`).
 * Checkout reserves stock by decrementing this row, so a blind overwrite could undo a
 * reservation made while the admin was editing; a mismatch is reported instead.
 */
export async function setStock(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await adminGuard();
  if (denied) return denied;

  const parsed = stockSchema.safeParse({
    productId: formData.get("productId"),
    expected: formData.get("expected"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) return invalid(fieldErrorsOf(parsed.error));
  const { productId, expected, quantity } = parsed.data;

  const [saved] = await db
    .update(productStock)
    .set({ quantity })
    .where(and(eq(productStock.productId, productId), eq(productStock.quantity, expected)))
    .returning({ quantity: productStock.quantity });

  if (!saved) {
    const [current] = await db
      .select({ quantity: productStock.quantity })
      .from(productStock)
      .where(eq(productStock.productId, productId));
    if (!current) return { status: "error", message: "This product no longer exists." };
    refresh(); // show the current quantity
    return {
      status: "error",
      message: `Stock changed to ${current.quantity} since you opened this page (for example, a customer checked out). Review it and save again.`,
    };
  }

  const [product] = await db
    .select({ slug: products.slug })
    .from(products)
    .where(eq(products.id, productId));
  invalidateProduct(product?.slug);
  return { status: "success", message: `Stock is now ${saved.quantity}.` };
}

/**
 * Adds or removes units relative to the current stock in one atomic statement, so it
 * never conflicts with checkouts holding stock at the same moment. The WHERE clause
 * keeps the result between 0 and MAX_STOCK (the CHECK constraint backs up the 0).
 */
export async function adjustStock(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await adminGuard();
  if (denied) return denied;

  const parsed = adjustStockSchema.safeParse({
    productId: formData.get("productId"),
    delta: formData.get("delta"),
  });
  if (!parsed.success) return invalid(fieldErrorsOf(parsed.error));
  const { productId, delta } = parsed.data;

  const [saved] = await db
    .update(productStock)
    .set({ quantity: sql`${productStock.quantity} + ${delta}` })
    .where(
      and(
        eq(productStock.productId, productId),
        sql`${productStock.quantity} + ${delta} BETWEEN 0 AND ${MAX_STOCK}`,
      ),
    )
    .returning({ quantity: productStock.quantity });

  if (!saved) {
    const [current] = await db
      .select({ quantity: productStock.quantity })
      .from(productStock)
      .where(eq(productStock.productId, productId));
    if (!current) return { status: "error", message: "This product no longer exists." };
    refresh(); // show the current quantity
    return {
      status: "error",
      message:
        delta < 0
          ? `Only ${current.quantity} in stock. You can remove at most ${current.quantity}.`
          : `Stock can’t go above ${MAX_STOCK}.`,
    };
  }

  const [product] = await db
    .select({ slug: products.slug })
    .from(products)
    .where(eq(products.id, productId));
  invalidateProduct(product?.slug);
  const sign = delta > 0 ? `+${delta}` : `${delta}`;
  return { status: "success", message: `Stock is now ${saved.quantity} (${sign}).` };
}

/* ---------------------------------------------------------------------------
   Categories
   --------------------------------------------------------------------------- */

export async function createCategory(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await adminGuard();
  if (denied) return denied;

  const parsed = createCategorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    sortOrder: formData.get("sortOrder") || "0",
  });
  if (!parsed.success) return invalid(fieldErrorsOf(parsed.error));

  try {
    await db.insert(categories).values(parsed.data);
  } catch (error) {
    if (pgError(error).code === "23505") {
      return invalid({ slug: "Another category already uses this slug." });
    }
    throw error;
  }

  invalidateProduct();
  return { status: "success", message: `Category “${parsed.data.name}” created.` };
}

export async function updateCategory(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await adminGuard();
  if (denied) return denied;

  const parsed = updateCategorySchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder") || "0",
  });
  if (!parsed.success) return invalid(fieldErrorsOf(parsed.error));
  const { id, ...values } = parsed.data;

  const [updated] = await db
    .update(categories)
    .set(values)
    .where(eq(categories.id, id))
    .returning({ id: categories.id });
  if (!updated) return { status: "error", message: "This category no longer exists." };

  invalidateProduct();
  return { status: "success", message: "Saved." };
}

/** Deletes a category only when no product uses it (also enforced by ON DELETE RESTRICT). */
export async function deleteCategory(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await adminGuard();
  if (denied) return denied;

  const parsed = updateCategorySchema.pick({ id: true }).safeParse({ id: formData.get("id") });
  if (!parsed.success) return { status: "error", message: "Unknown category." };
  const { id } = parsed.data;

  const [{ n }] = await db.select({ n: count() }).from(products).where(eq(products.categoryId, id));
  if (n > 0) {
    return {
      status: "error",
      message: `This category has ${n} ${n === 1 ? "product" : "products"}. Move them to another category first.`,
    };
  }

  try {
    await db.delete(categories).where(eq(categories.id, id));
  } catch (error) {
    if (pgError(error).code === "23503") {
      return { status: "error", message: "Products were added to this category. Move them first." };
    }
    throw error;
  }

  invalidateProduct();
  return { status: "success", message: "Category deleted." };
}

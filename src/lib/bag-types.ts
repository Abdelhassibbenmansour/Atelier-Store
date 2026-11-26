// Shopping bag types and constants. Safe to import from client components.
// The bag itself is read and written on the server only: see src/lib/bag.ts.

import type { ProductImage, ProductSize } from "@/lib/product";

/** Most distinct lines a bag can hold (keeps the cookie well under 4 KB). */
export const MAX_BAG_LINES = 30;
/** Upper bound for any single quantity input; stock is the real limit. */
export const MAX_LINE_QUANTITY = 99;

/** What the bag cookie stores: identifiers and quantities only, never prices. */
export type BagLine = {
  productId: string;
  /** Null for one-size products. */
  size: string | null;
  quantity: number;
};

/** One line per product + size. */
export function lineKey(line: Pick<BagLine, "productId" | "size">) {
  return `${line.productId}:${line.size ?? ""}`;
}

/** Current catalogue data for a product in the bag (read fresh, never cached). */
export type BagProduct = {
  id: string;
  slug: string;
  name: string;
  href: string;
  color: string;
  categoryName: string;
  priceCents: number;
  stock: number;
  sizes?: ProductSize[];
  image: ProductImage;
};

/**
 * ok          — quantity as stored
 * reduced     — less stock than requested; shown at the available quantity
 * sold_out    — no stock left; excluded from the subtotal
 * unavailable — product removed or size no longer offered; excluded from the subtotal
 */
export type BagLineState = "ok" | "reduced" | "sold_out" | "unavailable";

export type PricedBagLine = {
  key: string;
  productId: string;
  size: string | null;
  /** Missing when the product no longer exists. */
  product?: BagProduct;
  state: BagLineState;
  /** Quantity saved in the bag. */
  requestedQuantity: number;
  /** Quantity that counts: requested, limited by current stock. */
  quantity: number;
  /** Highest quantity this line can have, given other lines of the same product. */
  maxQuantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

export type BagSummary = {
  lines: PricedBagLine[];
  /** Sum of effective quantities. */
  itemCount: number;
  subtotalCents: number;
  /** True when any line was reduced, sold out or is unavailable. */
  hasIssues: boolean;
};

export type BagActionResult =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

/** Whole-dollar display, matching formatPrice in src/lib/product.ts. */
export function centsToUnits(cents: number) {
  return cents / 100;
}

/** One-size products take no size; sized products need an offered, available size. */
export function isValidSize(product: Pick<BagProduct, "sizes">, size: string | null) {
  if (product.sizes && product.sizes.length > 0) {
    return size !== null && product.sizes.some((s) => s.label === size && s.available);
  }
  return size === null;
}

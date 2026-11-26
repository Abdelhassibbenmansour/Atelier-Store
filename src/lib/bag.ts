// Shopping bag storage and pricing (server only).
//
// The bag is a single httpOnly cookie holding product ids, sizes and quantities —
// nothing else. Prices, names, images and stock always come fresh from the database
// (getProductsForBag), so a tampered or stale cookie can never change what a customer
// pays or let them exceed stock.
//
// Only the Server Actions in src/lib/bag-actions.ts write the cookie. Rendering only
// reads it (cookies can't be set while rendering), so stale lines are shown in their
// effective state and corrected by the next write.
import "server-only";

import { cookies } from "next/headers";

import {
  isValidSize,
  lineKey,
  MAX_BAG_LINES,
  MAX_LINE_QUANTITY,
  type BagLine,
  type BagLineState,
  type BagProduct,
  type BagSummary,
  type PricedBagLine,
} from "@/lib/bag-types";
import { getProductsForBag } from "@/lib/catalog";
import { getOwnHeldStock } from "@/lib/held-stock";
import { isUuid } from "@/lib/ids";
import { getCurrentUser } from "@/lib/session";

const COOKIE_NAME = "atelier_bag";
const COOKIE_VERSION = 1;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
/** Anything longer is not a bag we wrote; treat it as empty. */
const MAX_COOKIE_LENGTH = 4096;
const MAX_SIZE_LABEL_LENGTH = 20;

// Secure cookies are only sent over HTTPS, so follow the site's URL (as Better Auth
// does) rather than NODE_ENV: a production build served over plain http (local
// `next start`, a LAN IP) would otherwise silently lose the bag.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL;
const SECURE_COOKIE = APP_URL
  ? APP_URL.startsWith("https://")
  : process.env.NODE_ENV === "production";


export function isProductId(value: unknown): value is string {
  return isUuid(value);
}

/* ---------------------------------------------------------------------------
   Cookie (untrusted input)
   --------------------------------------------------------------------------- */

/** Parses the cookie defensively: anything malformed is dropped, never thrown. */
export function parseBag(raw: string | undefined): BagLine[] {
  if (!raw || raw.length > MAX_COOKIE_LENGTH) return [];

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!isRecord(data) || data.v !== COOKIE_VERSION || !Array.isArray(data.lines)) return [];

  const lines: BagLine[] = [];
  for (const item of data.lines.slice(0, MAX_BAG_LINES)) {
    if (!isRecord(item)) continue;
    const { p, s, q } = item;
    if (!isProductId(p)) continue;
    if (s !== null && (typeof s !== "string" || !s || s.length > MAX_SIZE_LABEL_LENGTH)) continue;
    if (!Number.isInteger(q) || (q as number) < 1) continue;
    lines.push({ productId: p, size: s, quantity: Math.min(q as number, MAX_LINE_QUANTITY) });
  }
  return mergeDuplicates(lines);
}

export async function readBag(): Promise<BagLine[]> {
  return parseBag((await cookies()).get(COOKIE_NAME)?.value);
}

/** Server Actions only. An empty bag deletes the cookie. */
export async function writeBag(lines: BagLine[]) {
  const store = await cookies();
  const kept = mergeDuplicates(lines.filter((line) => line.quantity > 0)).slice(0, MAX_BAG_LINES);

  if (kept.length === 0) {
    store.delete(COOKIE_NAME);
    return;
  }

  store.set(
    COOKIE_NAME,
    JSON.stringify({
      v: COOKIE_VERSION,
      lines: kept.map((line) => ({ p: line.productId, s: line.size, q: line.quantity })),
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: SECURE_COOKIE,
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    },
  );
}

/** Empties the bag after a confirmed payment (Server Actions / Route Handlers only). */
export async function clearBag() {
  (await cookies()).delete(COOKIE_NAME);
}

/* ---------------------------------------------------------------------------
   Validation & pricing
   --------------------------------------------------------------------------- */

// Pure size rule; lives in bag-types.ts so order code can use it without this module.
export { isValidSize } from "@/lib/bag-types";

/**
 * Prices every line against current catalogue data. Stock is per product (shared
 * by all its sizes), so earlier lines of the same product are filled first.
 */
export function priceBag(lines: BagLine[], products: Map<string, BagProduct>): BagSummary {
  const remaining = new Map<string, number>();

  const priced = lines.map((line): PricedBagLine => {
    const product = products.get(line.productId);
    const base = {
      key: lineKey(line),
      productId: line.productId,
      size: line.size,
      product,
      requestedQuantity: line.quantity,
    };

    if (!product || !isValidSize(product, line.size)) {
      return { ...base, state: "unavailable", quantity: 0, maxQuantity: 0, unitPriceCents: product?.priceCents ?? 0, lineTotalCents: 0 };
    }

    const left = remaining.get(product.id) ?? product.stock;
    const quantity = Math.max(0, Math.min(line.quantity, left));
    remaining.set(product.id, left - quantity);

    const state: BagLineState =
      product.stock <= 0 ? "sold_out" : quantity < line.quantity ? "reduced" : "ok";

    return {
      ...base,
      state,
      quantity,
      maxQuantity: 0, // filled in below, once every line of the product is known
      unitPriceCents: product.priceCents,
      lineTotalCents: product.priceCents * quantity,
    };
  });

  // A line may grow into whatever stock the product's other lines don't use.
  const usedByProduct = new Map<string, number>();
  for (const line of priced) {
    usedByProduct.set(line.productId, (usedByProduct.get(line.productId) ?? 0) + line.quantity);
  }
  for (const line of priced) {
    if (line.state === "unavailable" || !line.product) continue;
    const usedByOthers = (usedByProduct.get(line.productId) ?? 0) - line.quantity;
    line.maxQuantity = Math.min(MAX_LINE_QUANTITY, Math.max(0, line.product.stock - usedByOthers));
  }

  return {
    lines: priced,
    itemCount: priced.reduce((sum, line) => sum + line.quantity, 0),
    subtotalCents: priced.reduce((sum, line) => sum + line.lineTotalCents, 0),
    hasIssues: priced.some((line) => line.state !== "ok"),
  };
}

/** Lines as they should be saved: invalid ones dropped, quantities within stock. */
export function normalizeBag(lines: BagLine[], products: Map<string, BagProduct>): BagLine[] {
  return priceBag(mergeDuplicates(lines), products)
    .lines.filter((line) => line.quantity > 0)
    .map((line) => ({ productId: line.productId, size: line.size, quantity: line.quantity }));
}

/* ---------------------------------------------------------------------------
   Reads used by pages
   --------------------------------------------------------------------------- */

/**
 * Current product data for the bag, with stock as THIS customer can use it: live
 * stock plus units held by their own open checkout. Without this, a customer who
 * left Stripe without paying would see their own reserved piece as sold out (and
 * bag actions would drop it) until the checkout expired. Guests and other customers
 * get plain live stock. Checkout itself still reserves against real stock.
 */
export async function getBagProducts(productIds: string[]): Promise<Map<string, BagProduct>> {
  const [products, user] = await Promise.all([getProductsForBag(productIds), getCurrentUser()]);
  if (!user || products.size === 0) return products;

  const held = await getOwnHeldStock(user.id, [...products.keys()]);
  if (held.size === 0) return products;
  return new Map(
    [...products].map(([id, product]) => [
      id,
      held.has(id) ? { ...product, stock: product.stock + (held.get(id) ?? 0) } : product,
    ]),
  );
}

/** The bag with current prices, stock limits and subtotal. Reads the database. */
export async function getBag(): Promise<BagSummary> {
  const lines = await readBag();
  if (lines.length === 0) return { lines: [], itemCount: 0, subtotalCents: 0, hasIssues: false };

  const products = await getBagProducts(lines.map((line) => line.productId));
  return priceBag(lines, products);
}

/** Item count for the header badge. Cookie only (no database), so it's cheap. */
export async function getBagCount(): Promise<number> {
  const lines = await readBag();
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/* ---------------------------------------------------------------------------
   Helpers
   --------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Same product + size twice becomes one line (quantities added, first position kept). */
function mergeDuplicates(lines: BagLine[]): BagLine[] {
  const merged = new Map<string, BagLine>();
  for (const line of lines) {
    const key = lineKey(line);
    const existing = merged.get(key);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + line.quantity, MAX_LINE_QUANTITY);
    } else {
      merged.set(key, { ...line });
    }
  }
  return [...merged.values()];
}

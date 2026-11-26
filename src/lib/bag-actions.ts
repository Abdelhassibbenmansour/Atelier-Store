"use server";

// The only code that writes the bag cookie. Every action re-reads current stock and
// sizes from the database and re-validates everything the browser sent. Setting the
// cookie re-renders the current page, so the bag and header count update.

import { getBagProducts, isProductId, isValidSize, normalizeBag, readBag, writeBag } from "@/lib/bag";
import { lineKey, MAX_BAG_LINES, MAX_LINE_QUANTITY, type BagActionResult } from "@/lib/bag-types";

const GENERIC_ERROR: BagActionResult = {
  status: "error",
  message: "Something went wrong. Please try again.",
};

/** Product page: add a product (and size) to the bag, within available stock. */
export async function addToBag(
  _previous: BagActionResult,
  formData: FormData,
): Promise<BagActionResult> {
  const productId = formData.get("productId");
  const rawSize = formData.get("size");
  const size = typeof rawSize === "string" && rawSize !== "" ? rawSize : null;
  const quantity = parseQuantity(formData.get("quantity") ?? "1", 1);
  if (!isProductId(productId) || quantity === null) return GENERIC_ERROR;

  const saved = await readBag();
  const products = await getBagProducts([productId, ...saved.map((line) => line.productId)]);
  const product = products.get(productId);
  if (!product) return { status: "error", message: "This piece is no longer available." };

  if (product.sizes && product.sizes.length > 0) {
    if (!size) return { status: "error", message: "Please select a size." };
    if (!isValidSize(product, size)) {
      return { status: "error", message: `Size ${size} is not available.` };
    }
  } else if (size !== null) {
    return GENERIC_ERROR;
  }

  if (product.stock <= 0) return { status: "error", message: "This piece is sold out." };

  // Stock is shared by all sizes of a product.
  const lines = normalizeBag(saved, products);
  const inBag = lines
    .filter((line) => line.productId === productId)
    .reduce((sum, line) => sum + line.quantity, 0);
  const allowed = product.stock - inBag;
  if (allowed <= 0) {
    return {
      status: "error",
      message: `You already have all ${product.stock} available in your bag.`,
    };
  }

  const key = lineKey({ productId, size });
  const existing = lines.find((line) => lineKey(line) === key);
  if (!existing && lines.length >= MAX_BAG_LINES) {
    return { status: "error", message: "Your bag is full. Remove a piece to add another." };
  }

  const added = Math.min(quantity, allowed);
  if (existing) existing.quantity += added;
  else lines.push({ productId, size, quantity: added });

  await writeBag(normalizeBag(lines, products));

  const label = `${product.name}${size ? `, size ${size},` : ""}`;
  return {
    status: "success",
    message:
      added < quantity
        ? `Only ${allowed} more available. We added ${added} to your bag.`
        : `${label} has been added to your bag.`,
  };
}

/** Bag page: set a line's quantity (0 removes it). Clamped to available stock. */
export async function updateQuantity(formData: FormData): Promise<void> {
  const key = formData.get("key");
  const quantity = parseQuantity(formData.get("quantity"), 0);
  if (typeof key !== "string" || quantity === null) return;

  const saved = await readBag();
  if (!saved.some((line) => lineKey(line) === key)) return;

  const products = await getBagProducts(saved.map((line) => line.productId));
  const lines = saved
    .map((line) => (lineKey(line) === key ? { ...line, quantity } : line))
    .filter((line) => line.quantity > 0);

  // normalizeBag clamps to stock; other lines keep their quantities first.
  const edited = lines.find((line) => lineKey(line) === key);
  const others = lines.filter((line) => lineKey(line) !== key);
  const ordered = edited ? [...others, edited] : others;
  const normalized = normalizeBag(ordered, products);

  // Keep the customer's original line order.
  const position = new Map(saved.map((line, index) => [lineKey(line), index]));
  normalized.sort((a, b) => (position.get(lineKey(a)) ?? 0) - (position.get(lineKey(b)) ?? 0));

  await writeBag(normalized);
}

/** Bag page: remove a line. Unknown keys are ignored. */
export async function removeLine(formData: FormData): Promise<void> {
  const key = formData.get("key");
  if (typeof key !== "string") return;

  const saved = await readBag();
  await writeBag(saved.filter((line) => lineKey(line) !== key));
}

/** Integer in [min, MAX_LINE_QUANTITY], or null. */
function parseQuantity(value: FormDataEntryValue | null, min: number): number | null {
  if (typeof value !== "string" || !/^\d{1,3}$/.test(value)) return null;
  const quantity = Number(value);
  return quantity >= min && quantity <= MAX_LINE_QUANTITY ? quantity : null;
}

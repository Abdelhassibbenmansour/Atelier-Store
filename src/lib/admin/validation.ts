// Validation for admin forms (products, categories, stock). Pure functions, no
// server-only imports, so constants such as RESERVED_CATEGORY_SLUGS can be shared
// with client components. Every Server Action re-validates with these schemas.
import { z } from "zod";

import { UUID_PATTERN } from "@/lib/ids";
import { firstParam } from "@/lib/search-params";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Category pages live at /<slug> (src/app/[category]), next to these top-level routes.
 * A category with one of these slugs would be unreachable or shadow the route.
 */
export const RESERVED_CATEGORY_SLUGS = [
  "account",
  "admin",
  "api",
  "bag",
  "checkout",
  "new-in",
  "products",
  "search",
  "sign-in",
  "sign-up",
  "_next",
  "favicon.ico",
];

export const MAX_PRICE_CENTS = 100_000_000; // $1,000,000.00
export const MAX_STOCK = 100_000;

/** "Pleated Silk Trousers" → "pleated-silk-trousers" (a suggestion; still validated). */
export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** "1,250.50" → 125050. Parsed from the string (no floating point). */
export function parsePriceToCents(raw: string): number | null {
  const value = raw.trim().replace(/[$,\s]/g, "");
  const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return cents <= MAX_PRICE_CENTS ? cents : null;
}

export function centsToPriceInput(cents: number) {
  return (cents / 100).toFixed(2).replace(/\.00$/, "");
}

const text = (label: string, max: number) =>
  z.string().trim().min(1, `Enter a ${label}.`).max(max, `Use ${max} characters or fewer.`);

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter a slug.")
  .max(80, "Use 80 characters or fewer.")
  .regex(SLUG_PATTERN, "Use lowercase letters, numbers and single hyphens.");

const uuid = (message: string) => z.string().regex(UUID_PATTERN, message);

const intInRange = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,6}$/, message)
    .transform(Number)
    .refine((n) => n >= min && n <= max, message);

/* ---------------------------------------------------------------------------
   Products
   --------------------------------------------------------------------------- */

const imageSchema = z.object({
  src: z
    .string()
    .trim()
    .url("Enter a full image URL.")
    .refine(
      (url) => url.startsWith("https://images.unsplash.com/"),
      "Only https://images.unsplash.com/ images are supported for now.",
    ),
  alt: text("description of the image", 200),
});

const sizeSchema = z.object({
  label: text("size label", 20),
  available: z.boolean(),
});

const productFields = {
  name: text("name", 120),
  reference: text("style reference", 40),
  categoryId: uuid("Choose a category."),
  price: z
    .string()
    .transform((value, ctx) => {
      const cents = parsePriceToCents(value);
      if (cents === null) {
        ctx.addIssue({ code: "custom", message: "Enter a price like 1250 or 1250.50." });
        return z.NEVER;
      }
      return cents;
    }),
  color: text("colour", 60),
  description: text("description", 2000),
  details: z
    .array(z.string().trim().max(200, "Keep each detail under 200 characters."))
    .max(20, "Use 20 details or fewer.")
    .transform((lines) => lines.filter(Boolean)),
  sizes: z
    .array(sizeSchema)
    .max(20, "Use 20 sizes or fewer.")
    .refine(
      (sizes) => new Set(sizes.map((s) => s.label.toLowerCase())).size === sizes.length,
      "Each size label must be unique.",
    ),
  images: z.array(imageSchema).min(1, "Add at least one image.").max(10, "Use 10 images or fewer."),
  isNew: z.boolean(),
};

export const createProductSchema = z.object({
  ...productFields,
  slug,
  initialStock: intInRange(0, MAX_STOCK, `Enter a whole number from 0 to ${MAX_STOCK}.`),
});

export const updateProductSchema = z.object({
  ...productFields,
  id: uuid("Unknown product."),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

/** Reads the product form, including its repeated size and image rows. */
export function readProductForm(formData: FormData) {
  const get = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };

  const rows = (prefix: string) => {
    const indexes = new Set<number>();
    for (const key of formData.keys()) {
      const match = new RegExp(`^${prefix}\\.(\\d+)\\.`).exec(key);
      if (match) indexes.add(Number(match[1]));
    }
    return [...indexes].sort((a, b) => a - b);
  };

  return {
    id: get("id"),
    name: get("name"),
    slug: get("slug"),
    reference: get("reference"),
    categoryId: get("categoryId"),
    price: get("price"),
    color: get("color"),
    description: get("description"),
    details: get("details").split(/\r?\n/),
    sizes: rows("sizes")
      .map((i) => ({
        label: get(`sizes.${i}.label`).trim(),
        available: formData.get(`sizes.${i}.available`) === "on",
      }))
      .filter((size) => size.label !== ""), // blank rows are ignored
    images: rows("images")
      .map((i) => ({ src: get(`images.${i}.src`).trim(), alt: get(`images.${i}.alt`).trim() }))
      .filter((image) => image.src !== "" || image.alt !== ""),
    isNew: formData.get("isNew") === "on",
    initialStock: get("initialStock") || "0",
  };
}

/* ---------------------------------------------------------------------------
   Categories & stock
   --------------------------------------------------------------------------- */

const sortOrder = intInRange(0, 1000, "Enter a whole number from 0 to 1000.");

export const createCategorySchema = z.object({
  name: text("name", 60),
  slug: slug.refine(
    (value) => !RESERVED_CATEGORY_SLUGS.includes(value),
    "This slug is used by another page. Choose a different one.",
  ),
  sortOrder,
});

export const updateCategorySchema = z.object({
  id: uuid("Unknown category."),
  name: text("name", 60),
  sortOrder,
});

export const stockSchema = z.object({
  productId: uuid("Unknown product."),
  expected: intInRange(0, MAX_STOCK, "Reload the page and try again."),
  quantity: intInRange(0, MAX_STOCK, `Enter a whole number from 0 to ${MAX_STOCK}.`),
});

/** Add or remove units relative to the current stock (e.g. "+5" received, "-2" damaged). */
export const adjustStockSchema = z.object({
  productId: uuid("Unknown product."),
  delta: z
    .string()
    .trim()
    .regex(/^[+-]?\d{1,6}$/, "Enter a whole number like 5 or -2.")
    .transform(Number)
    .refine((n) => n !== 0, "Enter a number other than 0.")
    .refine((n) => Math.abs(n) <= MAX_STOCK, `Use a number between -${MAX_STOCK} and ${MAX_STOCK}.`),
});

export const STOCK_STATUS_FILTERS = ["all", "low", "out"] as const;
export type StockStatusFilter = (typeof STOCK_STATUS_FILTERS)[number];

/** /admin/stock filters from the URL. Invalid values fall back to the defaults. */
export function parseStockFilters(params: Record<string, string | string[] | undefined>) {
  const first = (value: string | string[] | undefined) => firstParam(value).trim();
  const status = first(params.status);
  const category = first(params.category).toLowerCase();
  return {
    status: (STOCK_STATUS_FILTERS as readonly string[]).includes(status)
      ? (status as StockStatusFilter)
      : "all",
    category: SLUG_PATTERN.test(category) ? category : "",
    q: first(params.q).slice(0, 100),
  };
}

export type StockFilters = ReturnType<typeof parseStockFilters>;

/** Field → first error message, for useActionState forms. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    errors[field] ??= issue.message;
  }
  return errors;
}

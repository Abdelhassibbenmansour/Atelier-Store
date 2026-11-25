// Storefront product types and helpers. Safe to import from client components.
// Data itself is loaded on the server through src/lib/catalog.ts.

import type { ProductImage, ProductSize } from "@/db/schema/catalog";

export type { ProductImage, ProductSize };

export type ProductCategory = {
  name: string;
  href: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  /** Style reference shown on the detail page. */
  reference: string;
  category: ProductCategory;
  /** Whole currency units (dollars). */
  price: number;
  href: string;
  isNew: boolean;
  color: string;
  description: string;
  details: string[];
  /** Omitted for one-size items (bags, jewellery...). */
  sizes?: ProductSize[];
  /** Units available across all sizes. 0 = sold out. */
  stock: number;
  /** First image is the primary one, used on cards. */
  images: [ProductImage, ...ProductImage[]];
};

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export const LOW_STOCK_THRESHOLD = 3;

export function getStockStatus(product: Pick<Product, "stock">): StockStatus {
  if (product.stock <= 0) return "out_of_stock";
  if (product.stock <= LOW_STOCK_THRESHOLD) return "low_stock";
  return "in_stock";
}

export function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

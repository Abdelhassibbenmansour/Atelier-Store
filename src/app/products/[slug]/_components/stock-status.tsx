import { StatusLabel, type StatusTone } from "@/components/ui/status-label";
import { getStockStatus, type Product, type StockStatus as Status } from "@/lib/product";

const tones: Record<Status, StatusTone> = {
  in_stock: "success",
  low_stock: "warning",
  out_of_stock: "muted",
};

/** "In stock" / "Only N left" / "Sold out" under the product price. */
export function StockStatus({ product }: { product: Pick<Product, "stock"> }) {
  const status = getStockStatus(product);
  const label =
    status === "out_of_stock"
      ? "Sold out"
      : status === "low_stock"
        ? `Only ${product.stock} left`
        : "In stock";

  return (
    <StatusLabel as="p" tone={tones[status]}>
      {label}
    </StatusLabel>
  );
}

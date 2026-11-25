import { getStockStatus, type Product } from "@/lib/product";

const styles = {
  in_stock: { dot: "bg-success", text: "text-ink" },
  low_stock: { dot: "bg-warning", text: "text-warning" },
  out_of_stock: { dot: "bg-subtle", text: "text-muted" },
} as const;

export function StockStatus({ product }: { product: Pick<Product, "stock"> }) {
  const status = getStockStatus(product);
  const label =
    status === "out_of_stock"
      ? "Sold out"
      : status === "low_stock"
        ? `Only ${product.stock} left`
        : "In stock";

  return (
    <p className={`flex items-center gap-2 text-body-sm ${styles[status].text}`}>
      <span aria-hidden="true" className={`size-1.5 rounded-full ${styles[status].dot}`} />
      {label}
    </p>
  );
}

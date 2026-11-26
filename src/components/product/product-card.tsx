import Image from "next/image";
import Link from "next/link";

import { formatPrice, getStockStatus, type Product } from "@/lib/product";

// Stock states match the product page (StockStatus), from the same getStockStatus rule:
// sold out → badge + faded image; low (1..LOW_STOCK_THRESHOLD) → "Only N left" line.
export function ProductCard({ product }: { product: Product }) {
  const [image] = product.images;
  const status = getStockStatus(product);
  const soldOut = status === "out_of_stock";
  const badge = soldOut ? "Sold out" : product.isNew ? "New" : null;

  return (
    <article className="group relative flex flex-col">
      <div className="media-product">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(min-width: 80rem) 25vw, (min-width: 48rem) 33vw, 50vw"
          className={`object-cover transition-transform duration-500 ease-soft group-hover:scale-[1.03] ${soldOut ? "opacity-60" : ""}`}
        />
        {badge && (
          <span className="absolute top-3 left-3 bg-paper px-2 py-1 text-[0.625rem] leading-none font-medium uppercase tracking-label">
            {badge}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 px-1 pt-4 sm:px-0">
        <p className="text-caption uppercase tracking-label text-muted">{product.category.name}</p>
        <h3 className="text-body-sm">
          {/* Stretched link: the whole card is clickable, one tab stop. */}
          <Link href={product.href} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>
        <p className="text-body-sm text-muted">{formatPrice(product.price)}</p>
        {status === "low_stock" && (
          <p className="text-caption text-warning">Only {product.stock} left</p>
        )}
      </div>
    </article>
  );
}

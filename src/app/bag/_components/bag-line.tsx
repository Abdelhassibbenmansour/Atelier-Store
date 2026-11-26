import Image from "next/image";
import Link from "next/link";

import { centsToUnits, type PricedBagLine } from "@/lib/bag-types";
import { formatPrice, LOW_STOCK_THRESHOLD } from "@/lib/product";

import { QuantityStepper, RemoveButton } from "./bag-controls";

/** One bag line: image, details, quantity controls, line total and any stock notice. */
export function BagLineItem({ line }: { line: PricedBagLine }) {
  const { product } = line;
  const name = product?.name ?? "Unavailable piece";
  const inactive = line.state === "unavailable" || line.state === "sold_out";

  return (
    <li className="flex gap-4 py-6 sm:gap-6">
      <div className={`media-product w-24 shrink-0 sm:w-32 ${inactive ? "opacity-50" : ""}`}>
        {product && (
          <Image
            src={product.image.src}
            alt={product.image.alt}
            fill
            sizes="(min-width: 40rem) 8rem, 6rem"
            className="object-cover"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <div className="flex min-w-0 flex-col gap-1">
            {product && (
              <p className="text-caption uppercase tracking-label text-muted">
                {product.categoryName}
              </p>
            )}
            <h3 className="text-body-sm break-words">
              {product ? (
                <Link href={product.href} className="link-subtle">
                  {name}
                </Link>
              ) : (
                name
              )}
            </h3>
            <p className="text-body-sm text-muted">
              {[product?.color, line.size && `Size ${line.size}`].filter(Boolean).join(" · ")}
            </p>
            {product && line.quantity > 1 && (
              <p className="text-caption text-muted">
                {formatPrice(centsToUnits(line.unitPriceCents))} each
              </p>
            )}
          </div>
          <p className={`text-body-sm tabular-nums ${inactive ? "text-muted" : ""}`}>
            {inactive ? "—" : formatPrice(centsToUnits(line.lineTotalCents))}
          </p>
        </div>

        <LineNotice line={line} />

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
          {inactive ? (
            <span />
          ) : (
            <QuantityStepper
              lineKey={line.key}
              productName={name}
              quantity={line.quantity}
              max={line.maxQuantity}
            />
          )}
          <RemoveButton lineKey={line.key} productName={name} />
        </div>
      </div>
    </li>
  );
}

function LineNotice({ line }: { line: PricedBagLine }) {
  switch (line.state) {
    case "unavailable":
      return (
        <p className="text-body-sm text-muted">
          {line.product
            ? `Size ${line.size ?? ""} is no longer available. Remove it to continue.`
            : "This piece is no longer available. Remove it to continue."}
        </p>
      );
    case "sold_out":
      return <p className="text-body-sm text-muted">Sold out. Remove it to continue.</p>;
    case "reduced":
      return (
        <p className="text-body-sm text-warning">
          {line.quantity === 0
            ? `Only ${line.product?.stock ?? 0} available, already in your bag in another size.`
            : `Only ${line.quantity} available. We’ve updated the quantity.`}
        </p>
      );
    default:
      if (line.quantity >= line.maxQuantity && line.maxQuantity <= LOW_STOCK_THRESHOLD) {
        return (
          <p className="text-body-sm text-warning">
            Only {line.maxQuantity} available.
          </p>
        );
      }
      return null;
  }
}

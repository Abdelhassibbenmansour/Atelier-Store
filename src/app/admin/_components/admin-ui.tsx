// Small server-rendered building blocks shared by the admin pages.
import Link from "next/link";
import type { ReactNode } from "react";

import { StatusLabel } from "@/components/ui/status-label";
import { centsToUnits } from "@/lib/bag-types";
import { formatPrice, getStockStatus } from "@/lib/product";

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="flex flex-col gap-2">
        <h2 className="heading-display text-headline">{title}</h2>
        {description && <p className="max-w-prose text-body text-muted">{description}</p>}
      </div>
      {action && (
        <Link href={action.href} className="btn btn-primary btn-sm">
          {action.label}
        </Link>
      )}
    </div>
  );
}

const stockStyles = {
  in_stock: { tone: "success", label: "In stock" },
  low_stock: { tone: "warning", label: "Low" },
  out_of_stock: { tone: "error", label: "Out" },
} as const;

/** Quantity with an in / low / out marker (thresholds from src/lib/product.ts). */
export function StockBadge({ stock }: { stock: number }) {
  const style = stockStyles[getStockStatus({ stock })];
  return (
    <StatusLabel tone={style.tone} className="tabular-nums">
      {stock}
      <span className="sr-only sm:not-sr-only text-caption text-muted">· {style.label}</span>
    </StatusLabel>
  );
}

export function Money({ cents }: { cents: number }) {
  return <span className="tabular-nums">{formatPrice(centsToUnits(cents))}</span>;
}

/** Placeholder while admin data streams in. */
export function AdminSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-14 animate-pulse bg-surface" />
      ))}
    </div>
  );
}

/** Label shown above a value on phones, hidden from md where the table has headings. */
export function CellLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-caption uppercase tracking-label text-muted md:hidden">{children}</span>
  );
}

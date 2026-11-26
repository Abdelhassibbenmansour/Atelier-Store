import type { ReactNode } from "react";

/** Placeholder shown while the session is read (keeps layout stable). */
export function AccountSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="h-8 w-48 animate-pulse bg-surface" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="h-12 animate-pulse bg-surface" />
        ))}
      </div>
    </div>
  );
}

/** Label / value rows separated by hairlines. */
export function DetailList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="flex flex-col divide-y border-y text-body-sm">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-6">
          <dt className="text-muted sm:w-36 sm:shrink-0">{item.label}</dt>
          <dd className="min-w-0 break-words">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function formatMemberSince(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

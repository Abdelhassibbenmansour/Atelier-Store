import type { ReactNode } from "react";

/** Colour is used only for meaning (design system): success, warning, error or muted. */
export type StatusTone = "success" | "warning" | "error" | "muted";

const tones: Record<StatusTone, { dot: string; text: string }> = {
  success: { dot: "bg-success", text: "text-ink" },
  warning: { dot: "bg-warning", text: "text-warning" },
  error: { dot: "bg-error", text: "text-error" },
  muted: { dot: "bg-subtle", text: "text-muted" },
};

/**
 * A status with a small colour dot, e.g. "Only 2 left", "Paid". Shared by the product
 * page stock line, admin stock badges and order status badges.
 */
export function StatusLabel({
  tone,
  children,
  as: Tag = "span",
  className = "",
}: {
  tone: StatusTone;
  children: ReactNode;
  as?: "span" | "p";
  className?: string;
}) {
  return (
    <Tag className={`inline-flex items-center gap-2 text-body-sm ${tones[tone].text} ${className}`}>
      <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${tones[tone].dot}`} />
      {children}
    </Tag>
  );
}

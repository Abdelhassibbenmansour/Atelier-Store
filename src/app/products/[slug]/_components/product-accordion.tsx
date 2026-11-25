import type { ReactNode } from "react";

type AccordionItem = {
  title: string;
  content: ReactNode;
  defaultOpen?: boolean;
};

// Native <details>: keyboard and screen-reader support with no client JS.
export function ProductAccordion({ items }: { items: AccordionItem[] }) {
  return (
    <div className="border-t">
      {items.map((item) => (
        <details key={item.title} open={item.defaultOpen} className="group border-b">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 eyebrow [&::-webkit-details-marker]:hidden">
            {item.title}
            <span
              aria-hidden="true"
              className="relative size-3 before:absolute before:inset-x-0 before:top-1/2 before:h-px before:bg-ink after:absolute after:inset-y-0 after:left-1/2 after:w-px after:bg-ink after:transition-transform after:duration-200 group-open:after:scale-y-0"
            />
          </summary>
          <div className="pb-6 text-body-sm text-muted">{item.content}</div>
        </details>
      ))}
    </div>
  );
}

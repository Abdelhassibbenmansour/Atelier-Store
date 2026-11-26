import Link from "next/link";
import { Suspense } from "react";

import { BagIcon } from "@/components/icons";
import { getBagCount } from "@/lib/bag";

/**
 * Header bag icon with an item count. The count reads the bag cookie (request data),
 * so it streams in behind its own <Suspense>; the rest of the header stays static.
 */
export function BagLink() {
  return (
    <Suspense fallback={<BagIconLink count={0} />}>
      <BagLinkWithCount />
    </Suspense>
  );
}

async function BagLinkWithCount() {
  return <BagIconLink count={await getBagCount()} />;
}

function BagIconLink({ count }: { count: number }) {
  const label =
    count > 0 ? `Shopping bag, ${count} ${count === 1 ? "item" : "items"}` : "Shopping bag";

  return (
    <Link href="/bag" aria-label={label} className="btn-icon relative">
      <BagIcon />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1.5 right-0.5 flex h-4 min-w-4 items-center justify-center bg-ink px-1 text-[0.625rem] leading-none font-medium text-paper tabular-nums"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

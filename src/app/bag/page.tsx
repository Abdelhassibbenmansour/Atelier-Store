/**
 * Shopping bag — URL: /bag
 *
 * The heading is prerendered. The bag reads its cookie and current prices/stock
 * (src/lib/bag.ts), so it streams in behind <Suspense>. Quantity and remove buttons
 * post to Server Actions (src/lib/bag-actions.ts), which re-render this page.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { getBag } from "@/lib/bag";
import { getCurrentUser } from "@/lib/session";

import { BagLineItem } from "./_components/bag-line";
import { BagSummary } from "./_components/bag-summary";

export const metadata: Metadata = {
  title: "Shopping bag",
  robots: { index: false, follow: false },
};

export default function BagPage({ searchParams }: PageProps<"/bag">) {
  const canceled = searchParams.then(({ checkout }) => checkout === "canceled");

  return (
    <div className="container-site pb-section lg:pt-8">
      <header className="flex flex-col gap-2 border-b pt-8 pb-6 lg:pt-0 lg:pb-12">
        <p className="eyebrow text-muted">Shopping bag</p>
        <h1 className="heading-display text-display">Your bag</h1>
      </header>

      <Suspense fallback={<BagSkeleton />}>
        <BagContents canceledPromise={canceled} />
      </Suspense>
    </div>
  );
}

async function BagContents({ canceledPromise }: { canceledPromise: Promise<boolean> }) {
  const [bag, user, canceled] = await Promise.all([getBag(), getCurrentUser(), canceledPromise]);

  if (bag.lines.length === 0) {
    return (
      <div className="container-narrow section flex flex-col items-center gap-6 text-center">
        <h2 className="heading-display text-headline">Your bag is empty</h2>
        <p className="max-w-prose text-body text-muted">
          Pieces you add to your bag will appear here.
        </p>
        <Link href="/new-in" className="btn btn-primary mt-2">
          Shop new arrivals
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 pt-2 lg:grid-cols-12 lg:gap-12 lg:pt-4">
      <section aria-labelledby="bag-items-title" className="lg:col-span-8">
        <h2 id="bag-items-title" className="sr-only">
          Items in your bag
        </h2>
        <ul className="divide-y border-b">
          {bag.lines.map((line) => (
            <BagLineItem key={line.key} line={line} />
          ))}
        </ul>
      </section>

      <div className="lg:col-span-4">
        <BagSummary bag={bag} signedIn={user !== null} canceled={canceled} />
      </div>
    </div>
  );
}

function BagSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-10 pt-8 lg:grid-cols-12 lg:gap-12">
      <div className="flex flex-col gap-6 lg:col-span-8">
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-4 sm:gap-6">
            <div className="aspect-product w-24 shrink-0 animate-pulse bg-surface sm:w-32" />
            <div className="flex flex-1 flex-col gap-3">
              <div className="h-4 w-1/2 animate-pulse bg-surface" />
              <div className="h-4 w-1/3 animate-pulse bg-surface" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-48 animate-pulse bg-surface lg:col-span-4" />
    </div>
  );
}

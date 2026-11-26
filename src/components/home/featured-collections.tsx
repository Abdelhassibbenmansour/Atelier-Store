import Image from "next/image";
import Link from "next/link";

import { SectionHeading } from "@/components/ui/section-heading";
import { featuredCollections } from "@/lib/sample-data";

export function FeaturedCollections() {
  return (
    <section aria-labelledby="collections-title" className="section">
      <div className="container-site">
        <SectionHeading id="collections-title" eyebrow="Explore" title="Featured collections" />

        <ul className="grid grid-cols-2 gap-x-1 gap-y-8 lg:gap-x-2">
          {featuredCollections.map((collection) => (
            <li key={collection.slug}>
              <Link href={collection.href} className="group block">
                <div className="relative aspect-portrait overflow-hidden bg-surface">
                  <Image
                    src={collection.image.src}
                    alt={collection.image.alt}
                    fill
                    sizes="50vw"
                    className="object-cover transition-transform duration-500 ease-soft group-hover:scale-[1.03]"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 pt-4 pr-3 pl-1 sm:pl-0">
                  <h3 className="text-title">{collection.name}</h3>
                  <span className="eyebrow underline decoration-transparent underline-offset-[0.5em] transition-colors group-hover:decoration-current">
                    Shop
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

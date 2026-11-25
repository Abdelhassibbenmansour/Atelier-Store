import Image from "next/image";
import Link from "next/link";

import { atelierStory } from "@/lib/sample-data";

export function AtelierStory() {
  return (
    <section aria-labelledby="atelier-story-title" className="section">
      <div className="container-site grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="relative aspect-[4/5] overflow-hidden bg-surface lg:col-span-7 lg:aspect-[5/4]">
          <Image
            src={atelierStory.image.src}
            alt={atelierStory.image.alt}
            fill
            sizes="(min-width: 64rem) 58vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="lg:col-span-4 lg:col-start-9">
          <p className="eyebrow text-muted">{atelierStory.eyebrow}</p>
          <h2 id="atelier-story-title" className="heading-display mt-3 text-headline">
            {atelierStory.title}
          </h2>
          <p className="mt-5 text-lead text-muted">{atelierStory.description}</p>
          <Link href={atelierStory.href} className="btn btn-secondary mt-8">
            {atelierStory.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}

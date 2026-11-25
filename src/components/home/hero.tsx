import Image from "next/image";
import Link from "next/link";

import { hero } from "@/lib/sample-data";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative">
      <div className="relative aspect-[3/5] overflow-hidden bg-surface sm:aspect-[5/6] lg:aspect-auto lg:h-[calc(100svh-var(--spacing-header))] lg:min-h-[36rem]">
        <Image
          src={hero.image.src}
          alt={hero.image.alt}
          fill
          preload
          sizes="100vw"
          className="object-cover object-top lg:object-[center_30%]"
        />
        {/* Scrim keeps white type legible on any image. */}
        <div className="absolute inset-0 bg-linear-to-t from-ink/75 via-ink/25 via-45% to-transparent to-70%" />
      </div>

      <div className="absolute inset-x-0 bottom-0">
        <div className="container-site pb-10 text-paper lg:pb-16">
          <p className="eyebrow">{hero.eyebrow}</p>
          <h1 id="hero-title" className="heading-display mt-3 text-display">
            {hero.title}
          </h1>
          <p className="mt-4 max-w-md text-body text-paper/85">{hero.description}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={hero.primaryCta.href} className="btn btn-paper">
              {hero.primaryCta.label}
            </Link>
            <Link href={hero.secondaryCta.href} className="btn btn-inverse">
              {hero.secondaryCta.label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

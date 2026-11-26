import Image from "next/image";

import { editorialStories } from "@/lib/sample-data";

export function EditorialSplit() {
  return (
    <section aria-label="Editorial stories" className="grid-editorial">
      {editorialStories.map((story) => (
        <article key={story.title} className="relative">
          <div className="relative aspect-portrait overflow-hidden bg-surface md:aspect-product">
            <Image
              src={story.image.src}
              alt={story.image.alt}
              fill
              sizes="(min-width: 48rem) 50vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-ink/55 via-transparent to-transparent" />
          </div>
          <div className="absolute inset-x-0 bottom-0 p-gutter text-paper">
            <p className="eyebrow">{story.eyebrow}</p>
            <h2 className="heading-display mt-2 text-headline">{story.title}</h2>
            <p className="mt-2 max-w-sm text-body-sm text-paper/85">{story.description}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

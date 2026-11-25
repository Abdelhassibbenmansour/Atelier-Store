import Image from "next/image";

import type { ProductImage } from "@/lib/product";

type ProductGalleryProps = {
  images: readonly ProductImage[];
  productName: string;
};

/**
 * Mobile: edge-to-edge, swipeable when there are several images.
 * Desktop: images stacked in a tall column next to the sticky info panel.
 */
export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const multiple = images.length > 1;

  return (
    <div
      role={multiple ? "region" : undefined}
      aria-label={multiple ? `${productName} images` : undefined}
      tabIndex={multiple ? 0 : undefined}
      className={
        multiple
          ? "-mx-gutter flex snap-x snap-mandatory gap-1 overflow-x-auto lg:mx-0 lg:flex-col lg:gap-2 lg:overflow-visible"
          : "-mx-gutter lg:mx-0"
      }
    >
      {images.map((image, index) => (
        <div
          key={image.src}
          className={`media-product ${multiple ? "w-[88%] shrink-0 snap-start lg:w-full" : ""}`}
        >
          <Image
            src={image.src}
            alt={image.alt}
            fill
            preload={index === 0}
            sizes="(min-width: 64rem) 58vw, 100vw"
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}

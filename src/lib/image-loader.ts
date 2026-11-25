"use client";

import type { ImageLoaderProps } from "next/image";

/**
 * Global next/image loader (see `images.loaderFile` in next.config.ts).
 *
 * Unsplash runs an imgix-style CDN that resizes on request, so the browser fetches
 * each srcset width directly from it instead of going through the Next.js optimizer
 * (which has to download the full image first and was timing out).
 *
 * Any other source is returned unchanged. When product images move to your own
 * storage, add a branch here for that CDN.
 */
export default function imageLoader({ src, width, quality }: ImageLoaderProps) {
  if (src.startsWith("https://images.unsplash.com/")) {
    const url = new URL(src);
    url.searchParams.set("auto", "format");
    url.searchParams.set("fit", "max");
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(quality ?? 75));
    return url.toString();
  }

  return src;
}

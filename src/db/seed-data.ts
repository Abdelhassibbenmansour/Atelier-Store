// Initial catalogue loaded by `npm run db:seed` (src/db/seed.ts).
// Images: Unsplash (https://unsplash.com/license).
// Relative imports only: this file runs outside Next.js.

import type { ProductImage, ProductSize } from "./schema/catalog";

export type SeedCategory = {
  slug: string;
  name: string;
  sortOrder: number;
};

export type SeedProduct = {
  slug: string;
  categorySlug: string;
  reference: string;
  name: string;
  color: string;
  description: string;
  priceCents: number;
  isNew?: boolean;
  details: string[];
  sizes?: ProductSize[];
  images: [ProductImage, ...ProductImage[]];
  stock: number;
};

// Width and quality are added per srcset entry by src/lib/image-loader.ts.
const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}`;

const sizes = (labels: string[], unavailable: string[] = []): ProductSize[] =>
  labels.map((label) => ({ label, available: !unavailable.includes(label) }));

export const seedCategories: SeedCategory[] = [
  { slug: "handbags", name: "Handbags", sortOrder: 0 },
  { slug: "ready-to-wear", name: "Ready-to-wear", sortOrder: 1 },
  { slug: "shoes", name: "Shoes", sortOrder: 2 },
  { slug: "accessories", name: "Accessories", sortOrder: 3 },
  { slug: "jewellery", name: "Jewellery", sortOrder: 4 },
];

/** Listed newest first; the seed staggers created_at to keep this order. */
export const seedProducts: SeedProduct[] = [
  {
    slug: "structured-top-handle-bag",
    categorySlug: "handbags",
    reference: "AT-2601-0142",
    name: "Structured top-handle bag",
    priceCents: 245000,
    isNew: true,
    color: "Teal",
    description:
      "A compact top-handle bag in pebbled calf leather, built on a structured base that holds its shape. The push-lock clasp closes with a soft click.",
    details: [
      "Pebbled calf leather",
      "Gold-finish push-lock hardware",
      "Suede lining with one flat pocket",
      "Detachable shoulder strap",
      "W 24 × H 18 × D 10 cm",
      "Made in Italy",
    ],
    stock: 2,
    images: [
      {
        src: unsplash("1594223274512-ad4803739b7c"),
        alt: "Teal pebbled-leather top-handle bag with a gold push-lock clasp",
      },
    ],
  },
  {
    slug: "woven-leather-tote",
    categorySlug: "handbags",
    reference: "AT-2601-0157",
    name: "Woven leather tote",
    priceCents: 198000,
    color: "Cognac",
    description:
      "A soft, roomy tote hand-woven from wide strips of smooth calf leather, finished with a detachable gold-finish chain.",
    details: [
      "Hand-woven calf leather",
      "Detachable gold-finish chain strap",
      "Unlined, with removable zip pouch",
      "W 40 × H 30 × D 12 cm",
      "Made in Italy",
    ],
    stock: 0,
    images: [
      { src: unsplash("1598532163257-ae3c6b2524b6"), alt: "Cognac woven leather tote with a gold chain strap" },
    ],
  },
  {
    slug: "leather-biker-jacket",
    categorySlug: "ready-to-wear",
    reference: "AT-2602-0311",
    name: "Leather biker jacket",
    priceCents: 320000,
    isNew: true,
    color: "Black",
    description:
      "Our take on the classic biker, cut from supple lambskin with an asymmetric zip, notched lapels and a belted hem. Fits true to size.",
    details: [
      "100% lambskin; lining 100% cupro",
      "Asymmetric front zip",
      "Three zip pockets",
      "Regular fit",
      "Specialist leather clean only",
      "Made in Italy",
    ],
    sizes: sizes(["44", "46", "48", "50", "52"], ["52"]),
    stock: 9,
    images: [
      { src: unsplash("1521223890158-f9f7c3d5d504"), alt: "Black leather biker jacket worn over a black T-shirt" },
    ],
  },
  {
    slug: "suede-derby-shoe",
    categorySlug: "shoes",
    reference: "AT-2603-0420",
    name: "Suede derby shoe",
    priceCents: 89000,
    color: "Sage green",
    description:
      "A softly structured derby in brushed suede, set on a lightweight leather sole for all-day comfort.",
    details: [
      "Suede upper, leather lining",
      "Leather sole with rubber insert",
      "Waxed cotton laces",
      "Fits true to size",
      "Made in Italy",
    ],
    sizes: sizes(["39", "40", "41", "42", "43", "44"], ["39", "44"]),
    stock: 7,
    images: [{ src: unsplash("1560343090-f0409e92791a"), alt: "Green suede derby shoe on a pink backdrop" }],
  },
  {
    slug: "round-metal-sunglasses",
    categorySlug: "accessories",
    reference: "AT-2604-0518",
    name: "Round metal sunglasses",
    priceCents: 45000,
    color: "Gold / green",
    description:
      "Fine round frames in gold-finish metal with mineral-glass green lenses and adjustable nose pads.",
    details: [
      "Gold-finish metal frame",
      "Green mineral-glass lenses, 100% UV protection",
      "Lens width 50 mm",
      "Leather case included",
    ],
    stock: 14,
    images: [{ src: unsplash("1511499767150-a48a237f0083"), alt: "Round gold-frame sunglasses with green lenses" }],
  },
  {
    slug: "sapphire-drop-earrings",
    categorySlug: "jewellery",
    reference: "AT-2605-0602",
    name: "Sapphire drop earrings",
    priceCents: 125000,
    isNew: true,
    color: "Silver / sapphire blue",
    description:
      "Statement drop earrings set with crystal pavé around a faceted blue stone, inspired by vintage evening jewellery.",
    details: [
      "Sterling silver with rhodium plating",
      "Crystal pavé and glass stones",
      "Post-back fastening",
      "Drop length 4.5 cm",
      "Presented in a gift box",
    ],
    stock: 1,
    images: [
      { src: unsplash("1535632066927-ab7c9ab60908"), alt: "Pair of crystal and sapphire drop earrings on a leaf" },
    ],
  },
  {
    slug: "fringed-knit-poncho",
    categorySlug: "ready-to-wear",
    reference: "AT-2602-0377",
    name: "Fringed knit poncho",
    priceCents: 115000,
    color: "Ivory",
    description:
      "A relaxed poncho in an open, hand-finished knit with a deep V-neck and long fringed edges. One size.",
    details: [
      "70% wool, 30% cashmere",
      "Hand-finished fringe",
      "Relaxed fit, one size",
      "Hand wash cold or dry clean",
      "Made in Italy",
    ],
    stock: 6,
    images: [{ src: unsplash("1434389677669-e08b4cac3105"), alt: "Cream fringed knit poncho on a wooden hanger" }],
  },
  {
    slug: "pleated-silk-trousers",
    categorySlug: "ready-to-wear",
    reference: "AT-2602-0392",
    name: "Pleated silk trousers",
    priceCents: 98000,
    color: "Blush",
    description:
      "Fluid trousers in heavy silk crêpe with front pleats, a high waist and gathered cuffs that sit at the ankle.",
    details: [
      "100% silk",
      "High waist with concealed hook-and-zip fastening",
      "Elasticated cuffs",
      "Relaxed fit",
      "Dry clean only",
    ],
    sizes: sizes(["36", "38", "40", "42", "44"], ["36"]),
    stock: 5,
    images: [{ src: unsplash("1594633312681-425c7b97ccd1"), alt: "Model wearing loose blush-pink pleated trousers" }],
  },
];

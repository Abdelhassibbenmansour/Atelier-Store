// Static marketing content (navigation, hero, editorial, footer...).
// Products, categories and stock come from the database: see src/lib/catalog.ts.
// Images: Unsplash (https://unsplash.com/license).

export type SampleImage = {
  src: string;
  alt: string;
};

export type Collection = {
  slug: string;
  name: string;
  href: string;
  image: SampleImage;
};

// Width and quality are added per srcset entry by src/lib/image-loader.ts.
const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}`;

export const navigation = [
  { label: "New In", href: "/new-in" },
  { label: "Women", href: "/women" },
  { label: "Men", href: "/men" },
  { label: "Handbags", href: "/handbags" },
  { label: "Shoes", href: "/shoes" },
  { label: "Jewellery", href: "/jewellery" },
] as const;

export const hero = {
  eyebrow: "Autumn – Winter 2026",
  title: "The Quiet Season",
  description: "Soft tailoring, sculpted leather and rich texture, made to be worn for years.",
  image: {
    src: unsplash("1581044777550-4cfa60707c03"),
    alt: "Model in a soft pink ruffled blouse holding sunglasses in a field",
  },
  primaryCta: { label: "Discover the collection", href: "/collections/autumn-winter" },
  secondaryCta: { label: "Shop women", href: "/women" },
};

export const featuredCollections: Collection[] = [
  {
    slug: "women",
    name: "Women",
    href: "/women",
    image: {
      src: unsplash("1485968579580-b6d095142e6e"),
      alt: "Woman walking in a long tartan coat on a city street",
    },
  },
  {
    slug: "men",
    name: "Men",
    href: "/men",
    image: {
      src: unsplash("1487222477894-8943e31ef7b2"),
      alt: "Man in a brown leather jacket and sunglasses",
    },
  },
  {
    slug: "handbags",
    name: "Handbags",
    href: "/handbags",
    image: {
      src: unsplash("1598532163257-ae3c6b2524b6"),
      alt: "Cognac woven leather tote with a gold chain strap",
    },
  },
  {
    slug: "shoes",
    name: "Shoes",
    href: "/shoes",
    image: {
      src: unsplash("1543163521-1bf539c55dd2"),
      alt: "Pair of floral stiletto heels on a white plinth",
    },
  },
];

export const productServices = [
  {
    title: "Shipping & returns",
    body: "Complimentary express shipping on every order, delivered in 2–4 business days. Returns and exchanges are free within 30 days of delivery.",
  },
  {
    title: "Care & repairs",
    body: "Our atelier offers care and repair services for the lifetime of the piece. Contact client services to book an appointment.",
  },
];

export const editorialStories = [
  {
    eyebrow: "Women",
    title: "City layers",
    description: "Long coats and soft knits for cold mornings.",
    href: "/women/coats",
    cta: "Shop coats",
    image: {
      src: unsplash("1539109136881-3be0616acf4b"),
      alt: "Woman in a pale blue coat on a cathedral square",
    },
  },
  {
    eyebrow: "Men",
    title: "Modern tailoring",
    description: "Sharp suiting cut from fine Italian wool.",
    href: "/men/tailoring",
    cta: "Shop tailoring",
    image: {
      src: unsplash("1617137968427-85924c800a22"),
      alt: "Man in a navy suit and white shirt outside a glass building",
    },
  },
];

export const atelierStory = {
  eyebrow: "The Atelier",
  title: "Made slowly, by hand",
  description:
    "Every piece starts in our workshop, where patterns are cut, stitched and finished by artisans who have spent decades on their craft.",
  href: "/about",
  cta: "Our story",
  image: {
    src: unsplash("1445205170230-053b83016050"),
    alt: "Rail of neutral-toned garments seen through a boutique window",
  },
};

export const services = [
  { title: "Complimentary shipping", description: "On every order, delivered in signature packaging." },
  { title: "Free returns", description: "Return or exchange within 30 days." },
  { title: "Gift wrapping", description: "Hand-finished wrapping and a personal note." },
  { title: "Client services", description: "Advisors available seven days a week." },
];

export const footerLinks = [
  {
    title: "Client services",
    links: [
      { label: "Contact us", href: "/contact" },
      { label: "Shipping", href: "/shipping" },
      { label: "Returns", href: "/returns" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "The house",
    links: [
      { label: "Our story", href: "/about" },
      { label: "Craftsmanship", href: "/craftsmanship" },
      { label: "Sustainability", href: "/sustainability" },
      { label: "Careers", href: "/careers" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of sale", href: "/terms" },
      { label: "Cookie settings", href: "/cookies" },
    ],
  },
];

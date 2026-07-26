export const theme = {
  accentHue: 255,
  showOffer: true,
  offerStyle: "split" as "parallax" | "split",
  showMembership: true,
  prepaidDiscount: 10,
  releaseDate: "2026-11-19T00:00:00",
} as const;

/**
 * Which top-level nav entry is highlighted — a CATEGORY SLUG.
 *
 * This was a five-member union, which made the header's highlight a
 * compile-time wall: any category outside those five could not be expressed, so
 * the product page resolved every other category to "preorders" and lit up the
 * wrong menu item. MegaMenu already compares this against `cat.slug`
 * (MegaMenu.tsx), i.e. an arbitrary string, so the union never described the
 * real domain.
 */
export type NavKey = string;

/** The slugs with a hand-written top-level route, in menu order. */
export const LEGACY_NAV_KEYS = [
  "preorders",
  "consoles",
  "games",
  "game-cards",
  "accessories",
] as const;

export const navItems: { href: string; label: string; key: NavKey }[] = [
  { href: "/preorders", label: "Pre-orders", key: "preorders" },
  { href: "/consoles", label: "Consoles", key: "consoles" },
  { href: "/games", label: "Games", key: "games" },
  { href: "/game-cards", label: "Game cards", key: "game-cards" },
  { href: "/accessories", label: "Accessories", key: "accessories" },
];

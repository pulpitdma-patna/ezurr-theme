export const theme = {
  accentHue: 255,
  showOffer: true,
  offerStyle: "split" as "parallax" | "split",
  showMembership: true,
  prepaidDiscount: 10,
  releaseDate: "2026-11-19T00:00:00",
} as const;

export type NavKey =
  | "preorders"
  | "consoles"
  | "games"
  | "game-cards"
  | "accessories";

export const navItems: { href: string; label: string; key: NavKey }[] = [
  { href: "/preorders", label: "Pre-orders", key: "preorders" },
  { href: "/consoles", label: "Consoles", key: "consoles" },
  { href: "/games", label: "Games", key: "games" },
  { href: "/game-cards", label: "Game cards", key: "game-cards" },
  { href: "/accessories", label: "Accessories", key: "accessories" },
];

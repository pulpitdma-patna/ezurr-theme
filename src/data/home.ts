import accessoriesData from "@/data/accessories.json";
import consolesData from "@/data/consoles.json";
import gameCardsData from "@/data/gameCards.json";
import gamesData from "@/data/games.json";
import preordersData from "@/data/preorders.json";
import { resolveProductId, slugifyProductKey } from "@/lib/productKey";
import type { CatalogProduct, GameCardProduct } from "@/lib/types";

function withCatalogIds(products: CatalogProduct[]): CatalogProduct[] {
  return products.map((product, index) => ({
    ...product,
    id: resolveProductId(product, index),
  }));
}

function withGameCardIds(cards: GameCardProduct[]): GameCardProduct[] {
  return cards.map((card, index) => ({
    ...card,
    id:
      card.id?.trim() ||
      slugifyProductKey(card.name || card.title || "") ||
      `card-${index}`,
  }));
}

export const games = withCatalogIds(gamesData as CatalogProduct[]);
export const preorders = withCatalogIds(preordersData as CatalogProduct[]);
export const consoles = withCatalogIds(consolesData as CatalogProduct[]);
export const accessories = withCatalogIds(accessoriesData as CatalogProduct[]);
export const gameCards = withGameCardIds(gameCardsData as GameCardProduct[]);

/** Flat static catalog for PDP fallback when API is off or a key is missing. */
export const staticCatalog: CatalogProduct[] = [
  ...preorders,
  ...games,
  ...consoles,
  ...accessories,
];

export function findStaticCatalogProduct(key: string): CatalogProduct | undefined {
  const needle = key.trim().toLowerCase();
  if (!needle) return undefined;
  return staticCatalog.find((product) => {
    const id = product.id?.toLowerCase();
    if (id && id === needle) return true;
    return slugifyProductKey(product.name) === needle;
  });
}

export const trendingGames = games.filter((product) => !product.brand.includes("Pre-order")).slice(0, 10);
export const featuredPreorders = preorders.slice(0, 10);
export const featuredConsoles = consoles.filter((product) => product.price !== "Sold out").slice(0, 9);
export const featuredAccessories = accessories.slice(0, 10);

export type HomeCategory = {
  title: string;
  eyebrow: string;
  href: string;
  image: string;
  imageAlt: string;
  tone: "dark" | "light";
  className?: string;
};

export const homeCategories: HomeCategory[] = [
  {
    title: "Upcoming worlds",
    eyebrow: "Pre-orders",
    href: "/preorders",
    image: "https://ezurr.com/cdn/shop/files/GTA6_banner.webp?v=1783232356&width=1200",
    imageAlt: "Grand Theft Auto VI",
    tone: "dark",
    className: "md:col-span-2 md:row-span-2",
  },
  {
    title: "Consoles",
    eyebrow: "Play without limits",
    href: "/consoles",
    image: featuredConsoles[0].img,
    imageAlt: featuredConsoles[0].name,
    tone: "light",
  },
  {
    title: "Games",
    eyebrow: "New stories",
    href: "/games",
    image: trendingGames[1].img,
    imageAlt: trendingGames[1].name,
    tone: "light",
  },
  {
    title: "Accessories",
    eyebrow: "Complete the setup",
    href: "/accessories",
    image: featuredAccessories[1].img,
    imageAlt: featuredAccessories[1].name,
    tone: "light",
  },
  {
    title: "Game cards",
    eyebrow: "Delivered instantly",
    href: "/game-cards",
    image: "https://ezurr.com/cdn/shop/files/ACCPLAY224.jpg?v=1772548181&width=800",
    imageAlt: "Digital gaming and PlayStation Portal",
    tone: "dark",
  },
];

const allBrandProducts = [...consoles, ...accessories, ...games];

function matchesBrand(product: CatalogProduct, brand: string) {
  const source = `${product.brand} ${product.name}`.toLowerCase();
  const terms: Record<string, string[]> = {
    PlayStation: ["playstation", "ps5", "ps4"],
    Nintendo: ["nintendo", "switch"],
    Xbox: ["xbox"],
    Logitech: ["logitech"],
    Meta: ["meta"],
    Valve: ["valve", "steam deck"],
  };

  return terms[brand].some((term) => source.includes(term));
}

export const brandNames = ["PlayStation", "Nintendo", "Xbox", "Logitech", "Meta", "Valve"] as const;
export type BrandName = (typeof brandNames)[number];

export const brandCollections = Object.fromEntries(
  brandNames.map((brand) => [brand, allBrandProducts.filter((product) => matchesBrand(product, brand)).slice(0, 10)]),
) as Record<BrandName, CatalogProduct[]>;

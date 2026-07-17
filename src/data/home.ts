import accessoriesData from "@/data/accessories.json";
import consolesData from "@/data/consoles.json";
import gameCardsData from "@/data/gameCards.json";
import gamesData from "@/data/games.json";
import preordersData from "@/data/preorders.json";
import type { CatalogProduct, GameCardProduct } from "@/lib/types";

export const games = gamesData as CatalogProduct[];
export const preorders = preordersData as CatalogProduct[];
export const consoles = consolesData as CatalogProduct[];
export const accessories = accessoriesData as CatalogProduct[];
export const gameCards = gameCardsData as GameCardProduct[];

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

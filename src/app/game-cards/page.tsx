import type { Metadata } from "next";
import { ApiGameCardsPage } from "@/components/catalog/ApiCatalogCategoryPage";
import gameCards from "@/data/gameCards.json";
import { isApiEnabled } from "@/lib/apiClient";
import type { GameCardProduct } from "@/lib/types";

export const metadata: Metadata = {
  title: "Game cards",
  description:
    "PlayStation, Xbox, Nintendo, Steam and Roblox digital gift cards — codes delivered instantly.",
  // Without this the route inherits the root layout's canonical ("/") and tells
  // search engines this category duplicates the homepage.
  alternates: { canonical: "/game-cards" },
};

export default function GameCardsPage() {
  return (
    <ApiGameCardsPage
      fallbackCards={isApiEnabled() ? [] : (gameCards as GameCardProduct[])}
    />
  );
}

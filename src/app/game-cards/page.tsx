import type { Metadata } from "next";
import { ApiGameCardsPage } from "@/components/catalog/ApiCatalogCategoryPage";
import gameCards from "@/data/gameCards.json";
import type { GameCardProduct } from "@/lib/types";

export const metadata: Metadata = {
  title: "Game cards",
};

export default function GameCardsPage() {
  return <ApiGameCardsPage fallbackCards={gameCards as GameCardProduct[]} />;
}

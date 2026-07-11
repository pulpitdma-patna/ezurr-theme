import type { Metadata } from "next";
import { CategoryPage } from "@/components/catalog/CategoryPage";
import games from "@/data/games.json";
import type { CatalogProduct } from "@/lib/types";

export const metadata: Metadata = {
  title: "Games",
};

export default function GamesPage() {
  return (
    <CategoryPage
      active="games"
      breadcrumb="Games"
      title="PS5 Games"
      count={(games as CatalogProduct[]).length}
      description="Physical discs for PlayStation 5 — new releases and pre-orders, region India."
      products={games as CatalogProduct[]}
    />
  );
}

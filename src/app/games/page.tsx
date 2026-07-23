import type { Metadata } from "next";
import { ApiCatalogCategoryPage } from "@/components/catalog/ApiCatalogCategoryPage";
import games from "@/data/games.json";
import type { CatalogProduct } from "@/lib/types";

export const metadata: Metadata = {
  title: "Games",
};

export default function GamesPage() {
  return (
    <ApiCatalogCategoryPage
      active="games"
      breadcrumb="Games"
      title="PS5 Games"
      description="Physical discs for PlayStation 5 — new releases and pre-orders, region India. When NEXT_PUBLIC_API_URL is set, products load from Laravel."
      fallbackProducts={games as CatalogProduct[]}
      categorySlug="games"
    />
  );
}

import type { Metadata } from "next";
import { ApiCatalogCategoryPage } from "@/components/catalog/ApiCatalogCategoryPage";
import games from "@/data/games.json";
import type { CatalogProduct } from "@/lib/types";

export const metadata: Metadata = {
  title: "Games",
  description:
    "Physical game discs for PlayStation, Xbox and Nintendo — new releases, pre-orders and back catalogue, region India.",
  // Without this the route inherits the root layout's canonical ("/") and tells
  // search engines the whole browsable catalogue duplicates the homepage.
  alternates: { canonical: "/games" },
};

export default function GamesPage() {
  return (
    <ApiCatalogCategoryPage
      active="games"
      breadcrumb="Games"
      // Deliberately platform-neutral: this category carries discs for every
      // console we stock, so naming one platform in the heading contradicts the
      // grid below it.
      title="Games"
      description="Physical game discs — new releases, pre-orders and back catalogue, region India."
      fallbackProducts={games as CatalogProduct[]}
      categorySlug="games"
    />
  );
}

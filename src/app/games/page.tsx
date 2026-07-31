import type { Metadata } from "next";
import { ServerCategoryView } from "@/components/catalog/ServerCategoryView";
import games from "@/data/games.json";
import { isApiEnabled } from "@/lib/apiClient";
import type { CatalogProduct } from "@/lib/types";

export const metadata: Metadata = {
  title: "Games",
  description:
    "Physical game discs for PlayStation, Xbox and Nintendo — new releases, pre-orders and back catalogue, region India.",
  // Without this the route inherits the root layout's canonical ("/") and tells
  // search engines the whole browsable catalogue duplicates the homepage.
  alternates: { canonical: "/games" },
};

export default async function GamesPage() {
  return (
    <ServerCategoryView
      slug="games"
      title="Games"
      breadcrumb="Games"
      description="Physical game discs — new releases, pre-orders and back catalogue, region India."
      fallbackProducts={
        isApiEnabled() ? [] : (games as CatalogProduct[])
      }
    />
  );
}

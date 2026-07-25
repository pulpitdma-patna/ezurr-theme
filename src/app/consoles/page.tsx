import type { Metadata } from "next";
import { ApiCatalogCategoryPage } from "@/components/catalog/ApiCatalogCategoryPage";
import consoles from "@/data/consoles.json";
import type { CatalogProduct } from "@/lib/types";

export const metadata: Metadata = {
  title: "Consoles",
  description:
    "PlayStation, Nintendo, Xbox, Meta Quest and Valve Steam Deck consoles — in stock and ready to ship across India.",
  // Without this the route inherits the root layout's canonical ("/") and tells
  // search engines this category duplicates the homepage.
  alternates: { canonical: "/consoles" },
};

export default function ConsolesPage() {
  return (
    <ApiCatalogCategoryPage
      active="consoles"
      breadcrumb="Consoles"
      title="Consoles"
      description="PlayStation, Nintendo, Xbox, Meta Quest, Valve Steam Deck and more — in stock and ready to ship."
      fallbackProducts={consoles as CatalogProduct[]}
      categorySlug="consoles"
    />
  );
}

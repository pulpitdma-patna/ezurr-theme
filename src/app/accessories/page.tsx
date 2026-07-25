import type { Metadata } from "next";
import { ApiCatalogCategoryPage } from "@/components/catalog/ApiCatalogCategoryPage";
import accessories from "@/data/accessories.json";
import type { CatalogProduct } from "@/lib/types";

export const metadata: Metadata = {
  title: "Accessories",
  description:
    "Controllers, headsets, racing wheels and gaming gear — in stock and ships in 24 hours across India.",
  // Without this the route inherits the root layout's canonical ("/") and tells
  // search engines this category duplicates the homepage.
  alternates: { canonical: "/accessories" },
};

export default function AccessoriesPage() {
  return (
    <ApiCatalogCategoryPage
      active="accessories"
      breadcrumb="Accessories"
      title="Accessories"
      description="Controllers, headsets, racing wheels and more — in stock and ships in 24 hours."
      fallbackProducts={accessories as CatalogProduct[]}
      categorySlug="accessories"
    />
  );
}

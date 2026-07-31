import type { Metadata } from "next";
import { ServerCategoryView } from "@/components/catalog/ServerCategoryView";
import accessories from "@/data/accessories.json";
import { isApiEnabled } from "@/lib/apiClient";
import type { CatalogProduct } from "@/lib/types";

export const metadata: Metadata = {
  title: "Accessories",
  description:
    "Controllers, headsets, racing wheels and gaming gear — in stock and ships in 24 hours across India.",
  // Without this the route inherits the root layout's canonical ("/") and tells
  // search engines this category duplicates the homepage.
  alternates: { canonical: "/accessories" },
};

export default async function AccessoriesPage() {
  return (
    <ServerCategoryView
      slug="accessories"
      title="Accessories"
      breadcrumb="Accessories"
      description="Controllers, headsets, racing wheels and more — in stock and ships in 24 hours."
      fallbackProducts={
        isApiEnabled() ? [] : (accessories as CatalogProduct[])
      }
    />
  );
}

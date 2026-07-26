import type { Metadata } from "next";
import { ServerCategoryView } from "@/components/catalog/ServerCategoryView";
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

export default async function AccessoriesPage() {
  // Server-rendered from the API now, sharing one renderer with
  // /categories/[slug]. This used to SSR the checked-in JSON below and
  // report its length as the category size — "12 titles"
  // for a category that has many more, with none of the real ones in the
  // HTML a crawler sees. The JSON stays as the API-unreachable fallback.
  return (
    <ServerCategoryView
      slug="accessories"
      title="Accessories"
      breadcrumb="Accessories"
      description="Controllers, headsets, racing wheels and more — in stock and ships in 24 hours."
      fallbackProducts={accessories as CatalogProduct[]}
    />
  );
}

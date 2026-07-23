import type { Metadata } from "next";
import { ApiCatalogCategoryPage } from "@/components/catalog/ApiCatalogCategoryPage";
import accessories from "@/data/accessories.json";
import type { CatalogProduct } from "@/lib/types";

export const metadata: Metadata = {
  title: "Accessories",
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

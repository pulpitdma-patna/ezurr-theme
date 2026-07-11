import type { Metadata } from "next";
import { CategoryPage } from "@/components/catalog/CategoryPage";
import accessories from "@/data/accessories.json";
import type { CatalogProduct } from "@/lib/types";

export const metadata: Metadata = {
  title: "Accessories",
};

export default function AccessoriesPage() {
  return (
    <CategoryPage
      active="accessories"
      breadcrumb="Accessories"
      title="Accessories"
      count={(accessories as CatalogProduct[]).length}
      description="Controllers, headsets, racing wheels and more — in stock and ships in 24 hours."
      products={accessories as CatalogProduct[]}
    />
  );
}

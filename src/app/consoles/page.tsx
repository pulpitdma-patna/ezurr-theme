import type { Metadata } from "next";
import { CategoryPage } from "@/components/catalog/CategoryPage";
import consoles from "@/data/consoles.json";
import type { CatalogProduct } from "@/lib/types";

export const metadata: Metadata = {
  title: "Consoles",
};

export default function ConsolesPage() {
  return (
    <CategoryPage
      active="consoles"
      breadcrumb="Consoles"
      title="Consoles"
      count={(consoles as CatalogProduct[]).length}
      description="PlayStation, Nintendo, Xbox, Meta Quest, Valve Steam Deck and more — in stock and ready to ship."
      products={consoles as CatalogProduct[]}
    />
  );
}

import type { Metadata } from "next";
import { ApiCatalogCategoryPage } from "@/components/catalog/ApiCatalogCategoryPage";
import consoles from "@/data/consoles.json";
import type { CatalogProduct } from "@/lib/types";

export const metadata: Metadata = {
  title: "Consoles",
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

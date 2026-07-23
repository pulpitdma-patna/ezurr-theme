import type { Metadata } from "next";
import { ApiCatalogCategoryPage } from "@/components/catalog/ApiCatalogCategoryPage";
import preorders from "@/data/preorders.json";
import type { CatalogProduct } from "@/lib/types";

export const metadata: Metadata = {
  title: "Pre-orders",
};

export default function PreordersPage() {
  return (
    <ApiCatalogCategoryPage
      active="preorders"
      breadcrumb="Pre-orders"
      title="Pre-orders"
      description="Upcoming releases at a locked price — pay nothing until they ship, refunded automatically if the price drops."
      fallbackProducts={preorders as CatalogProduct[]}
      categorySlug="preorders"
    />
  );
}

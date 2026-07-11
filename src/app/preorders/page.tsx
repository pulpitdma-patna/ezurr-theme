import type { Metadata } from "next";
import { CategoryPage } from "@/components/catalog/CategoryPage";
import preorders from "@/data/preorders.json";
import type { CatalogProduct } from "@/lib/types";

export const metadata: Metadata = {
  title: "Pre-orders",
};

export default function PreordersPage() {
  return (
    <CategoryPage
      active="preorders"
      breadcrumb="Pre-orders"
      title="Pre-orders"
      count={(preorders as CatalogProduct[]).length}
      description="Upcoming releases at a locked price — pay nothing until they ship, refunded automatically if the price drops."
      products={preorders as CatalogProduct[]}
    />
  );
}

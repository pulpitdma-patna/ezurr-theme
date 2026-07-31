import type { Metadata } from "next";
import { ApiCatalogCategoryPage } from "@/components/catalog/ApiCatalogCategoryPage";
import preorders from "@/data/preorders.json";
import { isApiEnabled } from "@/lib/apiClient";
import type { CatalogProduct } from "@/lib/types";

export const metadata: Metadata = {
  title: "Pre-orders",
  description:
    "Upcoming game and console releases at a locked price — reserve now and pay the balance when they ship.",
  // Without this the route inherits the root layout's canonical ("/") and tells
  // search engines this category duplicates the homepage.
  alternates: { canonical: "/preorders" },
};

export default function PreordersPage() {
  return (
    <ApiCatalogCategoryPage
      active="preorders"
      breadcrumb="Pre-orders"
      title="Pre-orders"
      // Deliberately not "pay nothing until they ship": a title can now carry a
      // reservation deposit, and checkout shows the exact amount due today.
      description="Upcoming releases at a locked price — reserve now, pay the balance when they ship, refunded automatically if the price drops."
      fallbackProducts={
        isApiEnabled() ? [] : (preorders as CatalogProduct[])
      }
      categorySlug="preorders"
    />
  );
}

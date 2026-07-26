import type { Metadata } from "next";
import { ApiCatalogCategoryPage } from "@/components/catalog/ApiCatalogCategoryPage";
import type { CatalogProduct } from "@/lib/types";

export const metadata: Metadata = {
  title: "Minimum price guarantee",
  description:
    "Titles covered by Ezurr's minimum price guarantee — find it cheaper elsewhere and we match it.",
  alternates: { canonical: "/price-guarantee" },
};

/**
 * Landing page for the promotional "lowest-price-guarantee" collection, which
 * the storefront already surfaces per-product as the "Best Price" ribbon. It is
 * a collection rather than a category because a product sits in exactly one
 * category but any number of promotions.
 */
export default function PriceGuaranteePage() {
  return (
    // No `active`: this is a promotional collection, not a category, and claiming
    // "games" highlighted the wrong top-level menu item on every visit.
    <ApiCatalogCategoryPage
      breadcrumb="Price guarantee"
      title="Minimum price guarantee"
      description="Every title here is covered — find it cheaper on another Indian store and we'll match the price."
      fallbackProducts={[] as CatalogProduct[]}
      collection="lowest-price-guarantee"
    />
  );
}

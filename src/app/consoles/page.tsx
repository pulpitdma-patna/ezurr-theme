import type { Metadata } from "next";
import { ServerCategoryView } from "@/components/catalog/ServerCategoryView";
import consoles from "@/data/consoles.json";
import type { CatalogProduct } from "@/lib/types";

export const metadata: Metadata = {
  title: "Consoles",
  description:
    "PlayStation, Nintendo, Xbox, Meta Quest and Valve Steam Deck consoles — in stock and ready to ship across India.",
  // Without this the route inherits the root layout's canonical ("/") and tells
  // search engines this category duplicates the homepage.
  alternates: { canonical: "/consoles" },
};

export default async function ConsolesPage() {
  // Server-rendered from the API now, sharing one renderer with
  // /categories/[slug]. This used to SSR the checked-in JSON below and
  // report its length as the category size — "9 titles"
  // for a category that has many more, with none of the real ones in the
  // HTML a crawler sees. The JSON stays as the API-unreachable fallback.
  return (
    <ServerCategoryView
      slug="consoles"
      title="Consoles"
      breadcrumb="Consoles"
      description="PlayStation, Nintendo, Xbox, Meta Quest, Valve Steam Deck and more — in stock and ready to ship."
      fallbackProducts={consoles as CatalogProduct[]}
    />
  );
}

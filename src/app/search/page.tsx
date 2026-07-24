import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchResults } from "@/components/catalog/SearchResults";

export const metadata: Metadata = {
  title: "Search",
  // Search-results pages carry a query and shouldn't be indexed.
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchResults />
    </Suspense>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MicroBar } from "@/components/layout/MicroBar";
import { Header } from "@/components/layout/Header";
import { FooterFull } from "@/components/layout/Footer";
import { ProductGrid } from "@/components/ui/ProductGrid";
import { api, isApiEnabled } from "@/lib/apiClient";
import { mapApiProductToCatalog } from "@/lib/apiMappers";
import type { CatalogProduct } from "@/lib/types";

export function SearchResults() {
  const q = (useSearchParams().get("q") ?? "").trim();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!q || !isApiEnabled()) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void api
      .products({ q, per_page: 60 })
      .then((res) => {
        if (!cancelled) setProducts((res.data ?? []).map(mapApiProductToCatalog));
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setProducts([]);
          setError(e.message || "Search failed");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q]);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MicroBar />
      <Header showSearch />
      <main className="ez-page w-full flex-1 pt-10 sm:pt-14">
        <div className="flex flex-col gap-2">
          <div className="ez-mono flex gap-2 text-[10px] uppercase tracking-[0.1em] text-[#86868B]">
            <Link href="/" className="hover:text-[#1D1D1F]">
              Home
            </Link>
            <span>/</span>
            <span className="text-[#1D1D1F]">Search</span>
          </div>
          <h1 className="ez-h1 m-0 font-bold">
            {q ? <>Results for &ldquo;{q}&rdquo;</> : "Search"}
          </h1>
          {q && !loading ? (
            <span className="ez-mono text-[11px] uppercase tracking-[0.1em] text-[#86868B]">
              {products.length} {products.length === 1 ? "result" : "results"}
            </span>
          ) : null}
        </div>

        <div className="pt-8 sm:pt-10">
          {!q ? (
            <p className="text-sm text-[#86868B]">Type a product name in the search bar above.</p>
          ) : loading ? (
            <p className="text-sm text-[#86868B]">Searching…</p>
          ) : error ? (
            <p className="text-sm text-[#B42318]" role="alert">
              {error}
            </p>
          ) : products.length === 0 ? (
            <p className="text-sm text-[#6E6E73]">
              No products match &ldquo;{q}&rdquo;. Try a different term.
            </p>
          ) : (
            <ProductGrid products={products} pageSize={24} />
          )}
        </div>
      </main>
      <FooterFull />
    </div>
  );
}

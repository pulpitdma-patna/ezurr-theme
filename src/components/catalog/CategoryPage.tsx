"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { NavKey } from "@/lib/theme";
import { MicroBar } from "@/components/layout/MicroBar";
import { Header } from "@/components/layout/Header";
import { FooterFull } from "@/components/layout/Footer";
import { ProductGrid } from "@/components/ui/ProductGrid";
import { CatalogFilterBar } from "@/components/catalog/CatalogFilterBar";
import {
  DEFAULT_CATALOG_FILTERS,
  deriveBrands,
  filterCatalogProducts,
  sortCatalogProducts,
  type CatalogFilterState,
  type CatalogSortOption,
} from "@/lib/catalogFilters";
import type { CatalogProduct } from "@/lib/types";

type CategoryPageProps = {
  active: NavKey;
  breadcrumb: string;
  title: string;
  count: number;
  description: string;
  products: CatalogProduct[];
};

export function CategoryPage({
  active,
  breadcrumb,
  title,
  count,
  description,
  products,
}: CategoryPageProps) {
  const [filters, setFilters] = useState<CatalogFilterState>(DEFAULT_CATALOG_FILTERS);
  const [sort, setSort] = useState<CatalogSortOption>("featured");

  const brands = useMemo(() => deriveBrands(products), [products]);

  const filteredProducts = useMemo(() => {
    const filtered = filterCatalogProducts(products, filters);
    return sortCatalogProducts(filtered, sort);
  }, [products, filters, sort]);

  const displayCount = filteredProducts.length;
  const totalCount = count || products.length;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MicroBar />
      <Header active={active} />

      {/* One <main id="ez-main"> per page: the landmark screen-reader users jump to, and the
          target of the skip link. Wraps the whole body between header and
          footer so "skip to content" lands on the category, not the filters. */}
      <main id="ez-main" className="flex flex-1 flex-col">

      {/* Header + filters */}
      <section className="ez-page w-full pt-5 pb-3 sm:pt-6 sm:pb-4">
        <div className="grid gap-x-4 gap-y-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="order-1 col-span-full">
            <div className="ez-mono flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.1em] text-[#86868B]">
              <Link href="/" className="hover:text-[#1D1D1F]">
                Home
              </Link>
              <span>/</span>
              <span className="text-[#1D1D1F]">{breadcrumb}</span>
            </div>
          </div>

          <div className="order-2 flex min-w-0 flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-2.5">
            <h1 className="m-0 text-[clamp(1.65rem,3.5vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.04em]">
              {title}
            </h1>
            <span className="ez-mono text-[10px] uppercase tracking-[0.1em] text-[#86868B] sm:text-[11px]">
              {displayCount === totalCount ? (
                <>{totalCount} titles</>
              ) : (
                <>
                  {displayCount} of {totalCount} titles
                </>
              )}
            </span>
          </div>

          <CatalogFilterBar
            embedded
            className="order-3 min-w-0 lg:order-2 lg:col-start-2 lg:row-start-2 lg:self-center"
            chipsClassName="order-5 col-span-full lg:row-start-4"
            products={products}
            filters={filters}
            sort={sort}
            brands={brands}
            filteredCount={displayCount}
            totalCount={totalCount}
            onFiltersChange={setFilters}
            onSortChange={setSort}
            onClearFilters={() => setFilters(DEFAULT_CATALOG_FILTERS)}
          />

          <p className="order-4 col-span-full m-0 max-w-[540px] text-sm leading-snug text-[#6E6E73] sm:text-[15px]">
            {description}
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="ez-page w-full flex-1 pt-6 sm:pt-8">
        {filteredProducts.length === 0 ? (
          <div className="rounded-[20px] border border-black/[0.06] bg-[var(--ez-warm-surface)] px-6 py-12 text-center">
            <p className="m-0 text-[17px] font-semibold tracking-[-0.02em] text-[#1D1D1F]">
              No titles match your filters
            </p>
            <p className="m-0 mt-2 text-sm text-[#6E6E73]">
              Try clearing filters or choosing a different brand.
            </p>
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_CATALOG_FILTERS)}
              className="ez-btn-primary mt-5 inline-flex min-h-[44px] items-center justify-center rounded-full px-6 text-[14px] font-semibold"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <ProductGrid products={filteredProducts} />
        )}
      </section>

      </main>

      <FooterFull />
    </div>
  );
}

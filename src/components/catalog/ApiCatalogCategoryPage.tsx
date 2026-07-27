"use client";

import { useEffect, useState } from "react";
import { CategoryPage } from "@/components/catalog/CategoryPage";
import { GameCardGrid } from "@/components/ui/GameCardGrid";
import { MicroBar } from "@/components/layout/MicroBar";
import { Header } from "@/components/layout/Header";
import { FooterFull } from "@/components/layout/Footer";
import Link from "next/link";
import { api, isApiEnabled, type ApiProduct } from "@/lib/apiClient";
import {
  mapApiProductToCatalog,
  mapApiProductToGameCard,
} from "@/lib/apiMappers";
import type { CatalogProduct, GameCardProduct } from "@/lib/types";
import type { NavKey } from "@/lib/theme";

export function ApiCatalogCategoryPage({
  active,
  breadcrumb,
  title,
  description,
  fallbackProducts,
  eyebrow,
  beforeGrid,
  afterGrid,
  initialProducts,
  initialTotal,
  remainingPages,
  categorySlug,
  brandSlug,
  collection,
}: {
  /**
   * Which top-level nav entry to highlight — a category slug. Optional because a
   * brand page and a promotional collection are not categories; both used to pass
   * `active="games"` and highlight the wrong menu item on every visit.
   */
  active?: NavKey;
  breadcrumb: string;
  title: string;
  description: string;
  fallbackProducts: CatalogProduct[];
  /** Set from the category template's `category_hero` block. */
  eyebrow?: string;
  /** CMS template blocks, rendered inside the page chrome around the grid. */
  beforeGrid?: React.ReactNode;
  afterGrid?: React.ReactNode;
  /**
   * Products already fetched on the server, so the grid is in the HTML.
   *
   * Without this every dynamic catalog route shipped an empty grid to crawlers:
   * /brands/playstation has 151 products and zero `/products/` links in
   * view-source. When present, the mount effect does not refetch page 1.
   */
  initialProducts?: CatalogProduct[];
  /** Paginator total, so the heading says 187 rather than the 24 we rendered. */
  initialTotal?: number;
  /** Pages after the first, loaded client-side so facets end up complete. */
  remainingPages?: number;
  categorySlug?: string;
  /** Brand landing pages (/brands/<slug>) reuse this same catalog shell. */
  brandSlug?: string;
  /** Promotional Shopify collection, e.g. the price-guarantee landing page. */
  collection?: string;
}) {
  const apiOn = isApiEnabled();
  // SSR the static fallback so the page has content on first paint; the effect
  // refreshes from the API on the client.
  const [products, setProducts] = useState<CatalogProduct[]>(
    initialProducts?.length ? initialProducts : fallbackProducts,
  );
  const [total, setTotal] = useState<number>(initialTotal ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Server-rendered first page: keep it, and fetch only what is missing. Refetching
  // page 1 here would replace identical rows and, because `fallbackProducts` is in
  // the effect's dep array, a fresh array literal from a parent would loop.
  const ssrCount = initialProducts?.length ?? 0;
  const morePages = Math.max(0, remainingPages ?? 0);

  useEffect(() => {
    if (!apiOn) {
      setProducts(fallbackProducts);
      setLoading(false);
      return;
    }

    // Everything already arrived from the server and there is no page 2.
    if (ssrCount > 0 && morePages === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const filters = {
      ...(categorySlug ? { category: categorySlug } : {}),
      ...(brandSlug ? { brand: brandSlug } : {}),
      ...(collection ? { collection } : {}),
    };
    // A brand or promotional collection can span most of the catalog
    // (PlayStation is ~190 titles, the price guarantee 164), and the API caps
    // per_page at 100 — so page through rather than silently truncating. The
    // header count is derived from what we hold, so a short read would make the
    // page contradict the menu.
    // `morePages` is added because a CATEGORY can now span the catalogue too:
    // holiday-sale holds 150 and games 187, and reading only the first page made
    // the header say "24 titles" for a category with 187 — and left the brand and
    // price facets derived from a quarter of the products.
    const wide = Boolean(brandSlug || collection) || morePages > 0;

    void (async () => {
      try {
        if (!wide) {
          const res = await api.products(filters);
          if (cancelled) return;
          setProducts((Array.isArray(res.data) ? res.data : []).map(mapApiProductToCatalog));
          if (typeof res.total === "number") setTotal(res.total);
          return;
        }

        const perPage = 100;
        const rows: ApiProduct[] = [];
        // Hard page ceiling so a pathological total can never spin forever.
        for (let page = 1; page <= 5; page += 1) {
          const res = await api.products({ ...filters, page, per_page: perPage });
          if (cancelled) return;
          const batch = Array.isArray(res.data) ? res.data : [];
          rows.push(...batch);
          const lastPage = res.last_page ?? page;
          if (page >= lastPage || batch.length < perPage) break;
        }
        if (!cancelled) {
          setProducts(rows.map(mapApiProductToCatalog));
          // Once the whole set is in hand the count is the set. Leaving `total`
          // at the paginator's figure would keep the header reading "150 of 150".
          setTotal(rows.length);
        }
      } catch (err) {
        if (cancelled) return;
        // A failed refresh must not blank a grid the server already rendered —
        // that turned a working page into an empty one on a flaky connection.
        if (ssrCount === 0) setProducts([]);
        setError(err instanceof Error ? err.message : "Could not load catalog");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiOn, categorySlug, brandSlug, collection, fallbackProducts, ssrCount, morePages]);

  return (
    <>
      {error ? (
        <p className="mx-auto max-w-6xl px-4 pt-2 text-sm text-[#B42318]" role="alert">
          {error}
        </p>
      ) : null}
      {loading && products.length === 0 ? (
        <p className="mx-auto max-w-6xl px-4 py-8 text-sm text-[#86868B]">Loading catalog…</p>
      ) : (
        <CategoryPage
          active={active}
          breadcrumb={breadcrumb}
          title={title}
          eyebrow={eyebrow}
          beforeGrid={beforeGrid}
          afterGrid={afterGrid}
          // The paginator's total, not the array length. The heading claimed
          // "24 titles" for a category holding 187 — a lie the owner could see
          // and not explain.
          count={total || products.length}
          description={description}
          products={products}
        />
      )}
    </>
  );
}

export function ApiGameCardsPage({
  fallbackCards,
}: {
  fallbackCards: GameCardProduct[];
}) {
  const apiOn = isApiEnabled();
  const [cards, setCards] = useState<GameCardProduct[]>(fallbackCards);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiOn) {
      setCards(fallbackCards);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void api
      .products({ category: "game-cards" })
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res.data) ? res.data : [];
        setCards(rows.map((p, i) => mapApiProductToGameCard(p, i)));
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setCards([]);
        setError(err.message || "Could not load game cards");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiOn, fallbackCards]);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MicroBar />
      <Header active="game-cards" />
      {/* Game cards take their own render path rather than CategoryPage, so the
          landmark has to be declared here too. */}
      <main id="ez-main" className="flex flex-1 flex-col">
      <section className="ez-page w-full pt-10 sm:pt-14">
        <div className="flex flex-col gap-3">
          <div className="ez-mono flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.1em] text-[#86868B] sm:text-[10.5px]">
            <Link href="/" className="hover:text-[#1D1D1F]">
              Home
            </Link>
            <span>/</span>
            <span className="text-[#1D1D1F]">Game cards</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-4">
            <h1 className="ez-h1 m-0 font-bold">Game cards</h1>
            <span className="ez-mono text-[11px] uppercase tracking-[0.1em] text-[#86868B] sm:text-xs">
              {cards.length} TITLES
            </span>
          </div>
          <p className="ez-lead m-0 max-w-[520px] text-[#6E6E73]">
            Digital codes delivered to your email in seconds — no expiry, no shipping.
          </p>
          {error ? (
            <p className="text-sm text-[#B42318]" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </section>
      <section className="ez-page w-full flex-1 pt-8 sm:pt-10">
        {loading && cards.length === 0 ? (
          <p className="text-sm text-[#86868B]">Loading game cards…</p>
        ) : (
          <GameCardGrid cards={cards} />
        )}
      </section>
      </main>
      <FooterFull />
    </div>
  );
}

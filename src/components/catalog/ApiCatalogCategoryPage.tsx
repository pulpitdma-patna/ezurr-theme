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
  categorySlug,
  brandSlug,
  collection,
}: {
  active: NavKey;
  breadcrumb: string;
  title: string;
  description: string;
  fallbackProducts: CatalogProduct[];
  categorySlug?: string;
  /** Brand landing pages (/brands/<slug>) reuse this same catalog shell. */
  brandSlug?: string;
  /** Promotional Shopify collection, e.g. the price-guarantee landing page. */
  collection?: string;
}) {
  const apiOn = isApiEnabled();
  // SSR the static fallback so the page has content on first paint; the effect
  // refreshes from the API on the client.
  const [products, setProducts] = useState<CatalogProduct[]>(fallbackProducts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiOn) {
      setProducts(fallbackProducts);
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
    const wide = Boolean(brandSlug || collection);

    void (async () => {
      try {
        if (!wide) {
          const res = await api.products(filters);
          if (cancelled) return;
          setProducts((Array.isArray(res.data) ? res.data : []).map(mapApiProductToCatalog));
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
        if (!cancelled) setProducts(rows.map(mapApiProductToCatalog));
      } catch (err) {
        if (cancelled) return;
        setProducts([]);
        setError(err instanceof Error ? err.message : "Could not load catalog");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiOn, categorySlug, brandSlug, collection, fallbackProducts]);

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
          count={products.length}
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

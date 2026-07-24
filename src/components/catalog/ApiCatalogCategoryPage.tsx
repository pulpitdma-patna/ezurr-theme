"use client";

import { useEffect, useState } from "react";
import { CategoryPage } from "@/components/catalog/CategoryPage";
import { GameCardGrid } from "@/components/ui/GameCardGrid";
import { MicroBar } from "@/components/layout/MicroBar";
import { Header } from "@/components/layout/Header";
import { FooterFull } from "@/components/layout/Footer";
import Link from "next/link";
import { api, isApiEnabled } from "@/lib/apiClient";
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
}: {
  active: NavKey;
  breadcrumb: string;
  title: string;
  description: string;
  fallbackProducts: CatalogProduct[];
  categorySlug?: string;
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

    void api
      .products(categorySlug ? { category: categorySlug } : undefined)
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res.data) ? res.data : [];
        setProducts(rows.map(mapApiProductToCatalog));
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setProducts([]);
        setError(err.message || "Could not load catalog");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiOn, categorySlug, fallbackProducts]);

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
      <FooterFull />
    </div>
  );
}

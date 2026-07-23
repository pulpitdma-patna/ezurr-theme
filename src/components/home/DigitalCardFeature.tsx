"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { gameCards as staticGameCards } from "@/data/home";
import { api, isApiEnabled } from "@/lib/apiClient";
import { mapApiProductToGameCard } from "@/lib/apiMappers";
import { getGameCardProductKey, productDetailHref } from "@/lib/productKey";
import type { GameCardProduct } from "@/lib/types";

type DigitalCardFeatureProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  cta?: string;
  href?: string;
};

export function DigitalCardFeature({
  eyebrow = "Instant delivery",
  title = "More play.\nZero waiting.",
  description = "Wallet top-ups, memberships, and digital codes delivered securely to your mobile.",
  cta = "Explore game cards",
  href = "/game-cards",
}: DigitalCardFeatureProps) {
  const apiOn = isApiEnabled();
  const [cards, setCards] = useState<GameCardProduct[]>(
    staticGameCards.slice(0, 3),
  );

  useEffect(() => {
    if (!apiOn) {
      setCards(staticGameCards.slice(0, 3));
      return;
    }
    let cancelled = false;
    void api
      .products({ category: "game-cards", per_page: 12 })
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res.data) ? res.data : [];
        setCards(
          rows.length
            ? rows.slice(0, 3).map((p, i) => mapApiProductToGameCard(p, i))
            : staticGameCards.slice(0, 3),
        );
      })
      .catch(() => {
        if (!cancelled) setCards(staticGameCards.slice(0, 3));
      });
    return () => {
      cancelled = true;
    };
  }, [apiOn]);

  const titleLines = title.split("\n");
  return (
    <section className="ez-page ez-section" aria-labelledby="digital-cards-title">
      <div className="overflow-hidden rounded-[30px] bg-[#101012] px-6 py-10 sm:rounded-[38px] sm:px-10 sm:py-14 lg:grid lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-12 lg:px-14 lg:py-16">
        <div className="mb-9 lg:mb-0">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="h-px w-6 shrink-0 bg-white/35" />
            <span className="ez-section-kicker !text-white/50">{eyebrow}</span>
          </div>
          <h2
            id="digital-cards-title"
            className="ez-section-title mt-3.5 !text-white"
          >
            {titleLines.map((line, i) => (
              <span key={`title-${i}`}>
                {i > 0 ? <br /> : null}
                {line}
              </span>
            ))}
          </h2>
          <p className="ez-section-copy mt-3 !text-white/55">{description}</p>
          <Link
            href={href}
            className="mt-7 inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-[#1D1D1F] transition hover:bg-white/90 hover:!text-[#1D1D1F]"
          >
            {cta}
            <span aria-hidden="true" className="ml-1.5 text-[13px] opacity-60">
              →
            </span>
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {cards.length === 0 && apiOn ? (
            <p className="col-span-full text-sm text-white/50">
              No digital products from API yet.
            </p>
          ) : null}
          {cards.map((card, index) => (
            <Link
              key={getGameCardProductKey(card, index)}
              href={productDetailHref({ id: card.id, name: card.name || card.title }, index)}
              className="relative flex min-h-[230px] flex-col justify-between overflow-hidden rounded-[24px] border border-white/10 p-5 text-white shadow-2xl transition hover:border-white/25"
              style={{ background: card.bg }}
            >
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <span className="ez-mono text-[8px] font-bold uppercase tracking-[0.16em] text-white/55">
                  {card.tag}
                </span>
                <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em]">
                  {card.title || card.name}
                </h3>
                <p className="mt-1 text-xs text-white/60">{card.sub}</p>
              </div>
              <p className="relative ez-mono text-sm font-bold tracking-wide">
                {card.value}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

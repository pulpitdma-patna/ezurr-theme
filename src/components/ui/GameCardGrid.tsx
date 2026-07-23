"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getGameCardProductKey, productDetailHref } from "@/lib/productKey";
import type { GameCardProduct } from "@/lib/types";

export function GameCardGrid({ cards }: { cards: GameCardProduct[] }) {
  const [shown, setShown] = useState(12);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && shown < cards.length) {
          setShown((s) => Math.min(s + 12, cards.length));
        }
      },
      { rootMargin: "500px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, cards.length]);

  const visible = cards.slice(0, shown);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        {visible.map((c, i) => (
          <Link
            key={getGameCardProductKey(c, i)}
            href={productDetailHref({ id: c.id, name: c.name || c.title }, i)}
            className="flex flex-col gap-3 text-[#1D1D1F] sm:gap-3.5"
          >
            <div
              className="flex aspect-[1.62] flex-col justify-between rounded-2xl p-5 transition-all duration-[180ms] sm:rounded-[18px] sm:p-[22px] md:hover:-translate-y-[3px] md:hover:shadow-[0_14px_34px_rgba(0,0,0,0.10)]"
              style={{ background: c.bg }}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-base font-semibold tracking-[-0.01em] text-white sm:text-lg">
                  {c.title}
                </span>
                <span className="ez-mono shrink-0 text-[8px] uppercase tracking-[0.16em] text-white/55 sm:text-[9px]">
                  {c.tag}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="ez-mono text-[10px] uppercase tracking-[0.1em] text-white/65 sm:text-[11px]">
                  {c.sub}
                </span>
                <span className="text-lg font-bold tracking-[-0.01em] text-white sm:text-xl">
                  {c.value}
                </span>
              </div>
            </div>
            <div className="flex items-start justify-between gap-2 px-0.5 sm:px-1">
              <span className="text-sm font-semibold leading-snug sm:text-[14.5px]">
                {c.name}
              </span>
              <span className="ez-mono shrink-0 text-xs text-[#424245] sm:text-[13px]">
                {c.price}
              </span>
            </div>
          </Link>
        ))}
      </div>
      <div ref={sentinelRef} className="h-px" />
      {shown < cards.length && (
        <div className="flex justify-center py-9 pb-2">
          <span className="ez-mono text-[11px] uppercase tracking-[0.16em] text-[#86868B]">
            Loading more…
          </span>
        </div>
      )}
    </>
  );
}

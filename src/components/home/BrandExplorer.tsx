"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { brandCollections, brandNames, type BrandName } from "@/data/home";
import { getCatalogProductKey } from "@/lib/productKey";
import { api, isApiEnabled } from "@/lib/apiClient";
import { mapApiProductToCatalog } from "@/lib/apiMappers";
import { ConsoleCard, ProductCard } from "@/components/ui/ProductCard";
import type { CatalogProduct } from "@/lib/types";
import { SectionHeading } from "./SectionHeading";

const brandMarks: Record<BrandName, string> = {
  PlayStation: "PS",
  Nintendo: "N",
  Xbox: "X",
  Logitech: "G",
  Meta: "∞",
  Valve: "V",
};

const brandSlugHints: Record<BrandName, string[]> = {
  PlayStation: ["sony", "playstation", "ps", "ezurr", "rockstar"],
  Nintendo: ["nintendo"],
  Xbox: ["xbox", "microsoft"],
  Logitech: ["logitech"],
  Meta: ["meta"],
  Valve: ["valve", "steam"],
};

const brandNotes: Record<BrandName, string> = {
  PlayStation: "Console-defining worlds, DualSense gear, and PS5 essentials.",
  Nintendo: "Playful hardware and games designed to go wherever you do.",
  Xbox: "High-performance consoles and the ecosystem built around Game Pass.",
  Logitech: "Precision controls for racing, competitive play, and simulation.",
  Meta: "Immersive standalone VR with no console or cables required.",
  Valve: "Your PC library, refined for powerful portable play.",
};

const brandStage: Record<
  BrandName,
  { tone: string; accent: string; label: string }
> = {
  PlayStation: {
    tone: "from-[#040E24] via-[#0B1C4A] to-[#174DA8]",
    accent: "#4A90FF",
    label: "Blue universe",
  },
  Nintendo: {
    tone: "from-[#4A0814] via-[#9E1828] to-[#D42E44]",
    accent: "#FF6B7A",
    label: "Play anywhere",
  },
  Xbox: {
    tone: "from-[#061A0D] via-[#0C5C18] to-[#1A9E32]",
    accent: "#52D46A",
    label: "Power house",
  },
  Logitech: {
    tone: "from-[#0C0C0E] via-[#1E1E22] to-[#3A3A42]",
    accent: "#A8A8B0",
    label: "Pro controls",
  },
  Meta: {
    tone: "from-[#0A0A0C] via-[#18181C] to-[#2C2C34]",
    accent: "#8E8E96",
    label: "Step inside",
  },
  Valve: {
    tone: "from-[#120C06] via-[#2E1E0C] to-[#9A6018]",
    accent: "#E8A44A",
    label: "PC on the go",
  },
};

function Arrow({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
      <path
        d={direction === "left" ? "m10 3-5 5 5 5" : "m6 3 5 5-5 5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShelfControls({
  brand,
  onScroll,
}: {
  brand: BrandName;
  onScroll: (direction: -1 | 1) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onScroll(-1)}
        aria-label={`Scroll ${brand} products left`}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/[0.08] bg-white text-[#424245] transition hover:border-black/[0.14] hover:bg-[#F7F7F8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] sm:h-10 sm:w-10"
      >
        <Arrow direction="left" />
      </button>
      <button
        type="button"
        onClick={() => onScroll(1)}
        aria-label={`Scroll ${brand} products right`}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1D1D1F] bg-[#1D1D1F] text-white transition hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] sm:h-10 sm:w-10"
      >
        <Arrow direction="right" />
      </button>
    </div>
  );
}

/**
 * The heading was hardcoded, so this section offered nothing but a visibility
 * checkbox in the builder. The brand shelves themselves stay data-driven — they
 * come from the catalogue, which is the point of the section.
 */
export function BrandExplorer({
  eyebrow = "Brand discovery",
  title = "Shop by brand.",
  description = "One tap switches the entire shelf—hardware, games, and gear curated for each ecosystem.",
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
} = {}) {
  const [activeBrand, setActiveBrand] = useState<BrandName>("PlayStation");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const apiOn = isApiEnabled();
  const [apiPool, setApiPool] = useState<CatalogProduct[] | null>(null);

  useEffect(() => {
    if (!apiOn) {
      setApiPool(null);
      return;
    }
    let cancelled = false;
    void api
      .products({ per_page: 50 })
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res.data) ? res.data : [];
        setApiPool(rows.map(mapApiProductToCatalog));
      })
      .catch(() => {
        if (!cancelled) setApiPool(null);
      });
    return () => {
      cancelled = true;
    };
  }, [apiOn]);

  const products = useMemo(() => {
    if (!apiOn) return brandCollections[activeBrand];
    // Loading or failed: stay empty — never open bundled brand shelves.
    if (apiPool === null) return [];
    const hints = brandSlugHints[activeBrand].map((h) => h.toLowerCase());
    const filtered = apiPool.filter((p) => {
      const brand = (p.brand || "").toLowerCase();
      const name = (p.name || "").toLowerCase();
      return hints.some((h) => brand.includes(h) || name.includes(h));
    });
    return filtered.slice(0, 10);
  }, [apiOn, apiPool, activeBrand]);

  const featured = products[0];
  const stage = brandStage[activeBrand];
  const useSquare =
    activeBrand !== "PlayStation" && activeBrand !== "Nintendo";

  function scroll(direction: -1 | 1) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollBy({
      left: direction * scroller.clientWidth * 0.78,
      behavior: "smooth",
    });
  }

  return (
    <section className="border-t border-black/[0.05] bg-white" aria-label="Shop by brand">
      <div className="ez-page ez-section pb-10 sm:pb-12 lg:pb-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionHeading
            eyebrow={eyebrow}
            title={title}
            description={description}
          />
          {/* The tabs filter this shelf in place; this is the way through to the
              brand's own crawlable landing page. */}
          <Link
            href="/brands"
            /* py-1 not pb-1: items-end keeps the label where it was while the
               extra padding carries the target past 24px. */
            className="shrink-0 py-1 text-[13px] font-semibold text-[#6E6E73] no-underline transition hover:text-[var(--ez-fg)]"
          >
            All brands →
          </Link>
        </div>

        <div
          className="ez-scrollbar-none -mx-4 mb-7 overflow-x-auto border-b border-black/[0.06] px-4 sm:-mx-6 sm:mb-8 sm:px-6 lg:mx-0 lg:px-0"
          role="tablist"
          aria-label="Gaming brands"
        >
          <div className="flex min-w-max gap-0">
            {brandNames.map((brand) => {
              const active = brand === activeBrand;
              const accent = brandStage[brand].accent;
              return (
                <button
                  key={brand}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls="brand-products"
                  onClick={() => setActiveBrand(brand)}
                  className={`group relative flex min-h-11 shrink-0 items-center gap-2.5 px-4 pb-3.5 pt-1 text-sm font-semibold transition sm:min-h-12 sm:px-5 sm:pb-4 ${
                    active
                      ? "text-[#1D1D1F]"
                      : "text-[#86868B] hover:text-[#424245]"
                  } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D1D1F]`}
                >
                  <span
                    aria-hidden="true"
                    className={`ez-mono flex h-7 w-7 items-center justify-center rounded-md text-[9px] font-bold transition ${
                      active
                        ? "bg-[#1D1D1F] text-white"
                        : "bg-[#F0F0F2] text-[#6E6E73] group-hover:bg-[#E8E8ED] group-hover:text-[#424245]"
                    }`}
                  >
                    {brandMarks[brand]}
                  </span>
                  <span className="whitespace-nowrap tracking-[-0.01em]">{brand}</span>
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 bottom-0 h-[2px] rounded-full transition-opacity duration-300 sm:inset-x-4"
                    style={{
                      backgroundColor: accent,
                      opacity: active ? 1 : 0,
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div
          id="brand-products"
          role="tabpanel"
          aria-label={`${activeBrand} products`}
          className="overflow-hidden rounded-[22px] border border-black/[0.07] bg-white shadow-[0_1px_0_rgba(17,17,19,0.04),0_24px_64px_rgba(17,17,19,0.08)] sm:rounded-[28px] lg:rounded-[32px]"
        >
          <div className="grid lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
            <div
              className={`relative isolate min-h-[300px] overflow-hidden bg-gradient-to-br sm:min-h-[360px] lg:min-h-full ${stage.tone}`}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_100%_100%,rgba(255,255,255,0.12),transparent_55%)]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_0%_0%,rgba(0,0,0,0.35),transparent_60%)]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                  backgroundSize: "48px 48px",
                }}
              />

              <div className="relative z-10 flex h-full min-h-[300px] flex-col justify-between gap-6 p-6 sm:min-h-[360px] sm:gap-8 sm:p-8 lg:min-h-[480px] lg:p-10">
                <div>
                  <span
                    className="ez-mono inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/50"
                  >
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: stage.accent }}
                    />
                    {stage.label}
                  </span>

                  <div className="mt-6 sm:mt-8">
                    <p className="ez-mono text-[9px] uppercase tracking-[0.16em] text-white/40">
                      Now browsing
                    </p>
                    <div className="mt-2 flex items-end gap-3.5 sm:gap-4">
                      <span
                        aria-hidden="true"
                        className="ez-mono flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.08] text-base font-bold text-white backdrop-blur-sm sm:h-14 sm:w-14 sm:rounded-2xl sm:text-lg"
                      >
                        {brandMarks[activeBrand]}
                      </span>
                      <h3 className="text-[clamp(1.85rem,4.5vw,3rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-white">
                        {activeBrand}
                      </h3>
                    </div>
                  </div>

                  <p className="mt-4 max-w-[320px] text-sm leading-relaxed text-white/60 sm:mt-5 sm:text-[15px] sm:leading-relaxed">
                    {brandNotes[activeBrand]}
                  </p>
                </div>

                <div className="flex items-end justify-between gap-4">
                  <div className="flex items-end gap-5">
                    <div>
                      <div className="text-[2rem] font-semibold leading-none tracking-[-0.04em] text-white sm:text-[2.25rem]">
                        {String(products.length).padStart(2, "0")}
                      </div>
                      <div className="ez-mono mt-1.5 text-[8px] uppercase tracking-[0.16em] text-white/35">
                        curated picks
                      </div>
                    </div>
                    {featured && (
                      <div className="hidden min-w-0 sm:block">
                        <p className="ez-mono text-[8px] uppercase tracking-[0.14em] text-white/35">
                          Spotlight
                        </p>
                        <p className="mt-1 max-w-[140px] truncate text-xs font-medium text-white/70">
                          {featured.name}
                        </p>
                      </div>
                    )}
                  </div>

                  {featured && (
                    <div className="relative h-24 w-24 shrink-0 sm:h-32 sm:w-32 lg:h-36 lg:w-36">
                      <div
                        aria-hidden="true"
                        className="absolute inset-[12%] rounded-full blur-2xl"
                        style={{ backgroundColor: `${stage.accent}33` }}
                      />
                      <Image
                        src={featured.img}
                        alt={featured.name}
                        fill
                        className="relative z-10 object-contain drop-shadow-[0_20px_48px_rgba(0,0,0,0.5)]"
                        sizes="(max-width: 640px) 96px, 144px"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-col border-t border-black/[0.05] bg-[#FAFAFB] lg:border-l lg:border-t-0">
              <div className="flex items-center justify-between gap-3 border-b border-black/[0.04] px-5 py-4 sm:px-7 sm:py-5 lg:px-8">
                <div className="min-w-0">
                  <p className="ez-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#86868B]">
                    Featured shelf
                  </p>
                  <p className="mt-0.5 truncate text-[15px] font-semibold tracking-[-0.02em] text-[#1D1D1F] sm:text-base">
                    {activeBrand} picks
                  </p>
                </div>
                <ShelfControls brand={activeBrand} onScroll={scroll} />
              </div>

              <div className="relative flex-1 px-5 py-4 sm:px-7 sm:py-5 lg:px-8 lg:py-6">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-4 left-5 top-4 z-10 w-6 bg-gradient-to-r from-[#FAFAFB] to-transparent sm:bottom-5 sm:left-7 sm:top-5 lg:left-8"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-4 right-5 top-4 z-10 w-10 bg-gradient-to-l from-[#FAFAFB] to-transparent sm:bottom-5 sm:right-7 sm:top-5 lg:right-8"
                />

                <div
                  ref={scrollerRef}
                  className="ez-scrollbar-none -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 pb-1 sm:gap-3.5"
                  tabIndex={0}
                  role="region"
                  aria-label={`${activeBrand} products`}
                >
                  {apiOn && products.length === 0 ? (
                    <p className="px-1 py-8 text-sm text-[#86868B]">
                      No {activeBrand} products from the catalog yet.
                    </p>
                  ) : null}
                  {products.map((product, index) => (
                    <div
                      key={getCatalogProductKey(product, index)}
                      className={`min-w-0 shrink-0 snap-start ${
                        useSquare
                          ? "w-[68vw] max-w-[236px] sm:w-[236px]"
                          : "w-[60vw] max-w-[208px] sm:w-[208px] lg:w-[220px]"
                      }`}
                    >
                      {useSquare ? (
                        <ConsoleCard {...product} />
                      ) : (
                        <ProductCard
                          {...product}
                          productKey={getCatalogProductKey(product, index)}
                          variant="grid"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

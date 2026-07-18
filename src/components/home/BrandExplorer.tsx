"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { brandCollections, brandNames, type BrandName } from "@/data/home";
import { getCatalogProductKey } from "@/lib/productKey";
import { ConsoleCard, ProductCard } from "@/components/ui/ProductCard";
import { SectionHeading } from "./SectionHeading";

const brandMarks: Record<BrandName, string> = {
  PlayStation: "PS",
  Nintendo: "N",
  Xbox: "X",
  Logitech: "G",
  Meta: "∞",
  Valve: "V",
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
  { tone: string; glow: string; label: string }
> = {
  PlayStation: {
    tone: "from-[#0B1C4A] via-[#163A7A] to-[#2B6AE0]",
    glow: "bg-[#7EB6FF]/30",
    label: "Blue universe",
  },
  Nintendo: {
    tone: "from-[#7A1020] via-[#C41E3A] to-[#F25C6E]",
    glow: "bg-[#FFB3BE]/35",
    label: "Play anywhere",
  },
  Xbox: {
    tone: "from-[#0D3B1E] via-[#107C10] to-[#3DDB65]",
    glow: "bg-[#9CFFB8]/30",
    label: "Power house",
  },
  Logitech: {
    tone: "from-[#1A1A1C] via-[#2E2E32] to-[#5A5A62]",
    glow: "bg-white/20",
    label: "Pro controls",
  },
  Meta: {
    tone: "from-[#1B1035] via-[#4A2AD9] to-[#8B6CFF]",
    glow: "bg-[#C7B8FF]/30",
    label: "Step inside",
  },
  Valve: {
    tone: "from-[#1C1208] via-[#3D2A12] to-[#C47A28]",
    glow: "bg-[#FFD39A]/28",
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

export function BrandExplorer() {
  const [activeBrand, setActiveBrand] = useState<BrandName>("PlayStation");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const products = brandCollections[activeBrand];
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
    <section aria-label="Shop by brand">
      <div className="relative overflow-hidden bg-[#F5F5F7] py-10 sm:py-12 lg:py-14">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white to-transparent" />

        <div className="ez-page relative">
          <SectionHeading
            eyebrow="Brand discovery"
            title="Shop by brand."
            description="One tap switches the entire shelf—hardware, games, and gear curated for each ecosystem."
          />

          <div
            className="ez-scrollbar-none mb-6 flex gap-2 overflow-x-auto pb-1 sm:mb-8 sm:flex-wrap sm:overflow-visible"
            role="tablist"
            aria-label="Gaming brands"
          >
            {brandNames.map((brand) => {
              const active = brand === activeBrand;
              return (
                <button
                  key={brand}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls="brand-products"
                  onClick={() => setActiveBrand(brand)}
                  className={`flex min-h-11 shrink-0 items-center gap-2.5 rounded-full border px-4 text-sm font-semibold transition ${
                    active
                      ? "border-[#1D1D1F] bg-[#1D1D1F] text-white shadow-[0_10px_28px_rgba(17,17,19,0.16)]"
                      : "border-black/[0.08] bg-white text-[#424245] hover:border-black/20 hover:bg-white hover:text-[#1D1D1F]"
                  } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]`}
                >
                  <span
                    aria-hidden="true"
                    className={`ez-mono flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold ${
                      active ? "bg-white text-black" : "bg-[#F0F0F2] text-[#1D1D1F]"
                    }`}
                  >
                    {brandMarks[brand]}
                  </span>
                  {brand}
                </button>
              );
            })}
          </div>

          <div
            id="brand-products"
            role="tabpanel"
            aria-label={`${activeBrand} products`}
            className="overflow-hidden rounded-[28px] border border-black/[0.06] bg-white shadow-[0_24px_70px_rgba(17,17,19,0.08)] lg:rounded-[34px]"
          >
            <div className="grid lg:grid-cols-[0.92fr_1.08fr]">
              <div
                className={`relative isolate min-h-[320px] overflow-hidden bg-gradient-to-br p-7 text-white sm:min-h-[380px] sm:p-9 lg:min-h-full lg:p-10 ${stage.tone}`}
              >
                <div
                  className={`absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl ${stage.glow}`}
                />
                <div className="relative z-10 flex h-full min-h-[280px] flex-col justify-between gap-8 lg:min-h-[460px]">
                  <div>
                    <span className="ez-mono inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white/75 backdrop-blur">
                      {stage.label}
                    </span>
                    <div className="mt-8 flex items-end gap-4">
                      <span
                        aria-hidden="true"
                        className="ez-mono flex h-14 w-14 items-center justify-center rounded-[18px] bg-white text-lg font-bold text-black sm:h-16 sm:w-16 sm:text-xl"
                      >
                        {brandMarks[activeBrand]}
                      </span>
                      <div>
                        <p className="ez-mono text-[10px] uppercase tracking-[0.16em] text-white/50">
                          Now browsing
                        </p>
                        <h3 className="mt-1 text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-none tracking-[-0.05em]">
                          {activeBrand}
                        </h3>
                      </div>
                    </div>
                    <p className="mt-5 max-w-[340px] text-sm leading-relaxed text-white/70 sm:text-[15px]">
                      {brandNotes[activeBrand]}
                    </p>
                  </div>

                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <div className="text-3xl font-semibold tracking-[-0.04em]">
                        {String(products.length).padStart(2, "0")}
                      </div>
                      <div className="ez-mono mt-1 text-[9px] uppercase tracking-[0.14em] text-white/45">
                        curated picks
                      </div>
                    </div>
                    {featured && (
                      <div className="relative h-28 w-28 shrink-0 sm:h-36 sm:w-36">
                        <Image
                          src={featured.img}
                          alt={featured.name}
                          fill
                          className="object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
                          sizes="144px"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex min-w-0 flex-col bg-[#FAFAFB] p-5 sm:p-7 lg:p-8">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="ez-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#86868B]">
                      Featured shelf
                    </p>
                    <p className="mt-1 text-base font-semibold tracking-[-0.02em] text-[#1D1D1F]">
                      {activeBrand} picks
                    </p>
                  </div>
                  <div className="hidden items-center gap-2 sm:flex">
                    <button
                      type="button"
                      onClick={() => scroll(-1)}
                      aria-label={`Scroll ${activeBrand} products left`}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E8E8ED] text-[#424245] transition hover:bg-[#D2D2D7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
                    >
                      <Arrow direction="left" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scroll(1)}
                      aria-label={`Scroll ${activeBrand} products right`}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1D1D1F] text-white transition hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
                    >
                      <Arrow direction="right" />
                    </button>
                  </div>
                </div>

                <div
                  ref={scrollerRef}
                  className="ez-scrollbar-none -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2"
                  tabIndex={0}
                  role="region"
                  aria-label={`${activeBrand} products`}
                >
                  {products.map((product, index) => (
                    <div
                      key={getCatalogProductKey(product, index)}
                      className={`min-w-0 shrink-0 snap-start ${
                        useSquare
                          ? "w-[70vw] max-w-[240px] sm:w-[240px]"
                          : "w-[62vw] max-w-[210px] sm:w-[210px] lg:w-[224px]"
                      }`}
                    >
                      {useSquare ? (
                        <ConsoleCard {...product} />
                      ) : (
                        <ProductCard {...product} variant="grid" />
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

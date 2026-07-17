"use client";

import { useState } from "react";
import { brandCollections, brandNames, type BrandName } from "@/data/home";
import { ProductRail } from "./ProductRail";

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

export function BrandExplorer() {
  const [activeBrand, setActiveBrand] = useState<BrandName>("PlayStation");

  return (
    <section className="ez-section" aria-label="Shop by brand">
      <div className="relative overflow-hidden bg-[#0D0E11] py-14 text-white sm:py-18 lg:py-20">
        <div className="absolute -right-48 -top-56 h-[560px] w-[560px] rounded-full bg-[var(--ez-accent)]/15 blur-[120px]" />
        <div className="ez-page relative">
          <div className="mb-8 grid gap-4 sm:mb-10 lg:grid-cols-[1fr_0.7fr] lg:items-end">
            <div>
              <span className="ez-section-kicker !text-white/45">Shop your ecosystem</span>
              <h2 className="mt-3 max-w-[720px] text-[clamp(2rem,5vw,4.3rem)] font-semibold leading-[0.96] tracking-[-0.055em] text-white">
                The names shaping play.
              </h2>
            </div>
            <p className="max-w-[520px] text-sm leading-relaxed text-white/50 sm:text-base lg:justify-self-end">
              Choose a platform to instantly surface its strongest hardware, games, and accessories.
            </p>
          </div>

          <div
            className="ez-scrollbar-none -mx-4 flex overflow-x-auto border-y border-white/10 px-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10"
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
                  className={`group relative flex min-h-[68px] shrink-0 items-center gap-3 px-4 text-sm font-semibold transition sm:min-h-[76px] sm:px-6 ${
                    active
                      ? "text-white"
                      : "text-white/40 hover:text-white/75"
                  } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white`}
                >
                  <span
                    aria-hidden="true"
                    className={`ez-mono flex h-8 w-8 items-center justify-center rounded-full text-[9px] font-bold transition ${
                      active
                        ? "bg-white text-black"
                        : "border border-white/10 bg-white/[0.04] text-white/45 group-hover:border-white/20"
                    }`}
                  >
                    {brandMarks[brand]}
                  </span>
                  {brand}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-white transition sm:inset-x-6 ${
                      active ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <div
            id="brand-products"
            role="tabpanel"
            aria-label={`${activeBrand} products`}
            className="mt-9 sm:mt-12"
          >
            <ProductRail
              contained={false}
              inverse
              eyebrow="Selected platform"
              title={`${activeBrand} essentials.`}
              description={brandNotes[activeBrand]}
              products={brandCollections[activeBrand]}
              variant={activeBrand === "PlayStation" || activeBrand === "Nintendo" ? "product" : "square"}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

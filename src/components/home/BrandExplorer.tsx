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

export function BrandExplorer() {
  const [activeBrand, setActiveBrand] = useState<BrandName>("PlayStation");

  return (
    <section className="ez-section" aria-label="Shop by brand">
      <div className="relative overflow-hidden bg-[#F1F3F7] py-14 sm:py-20 lg:py-24">
        <div className="absolute -right-40 -top-48 h-[520px] w-[520px] rounded-full bg-white/80 blur-3xl" />
        <div className="absolute -bottom-64 -left-40 h-[520px] w-[520px] rounded-full bg-[var(--ez-accent)]/10 blur-3xl" />

        <div className="ez-page relative">
          <div className="mb-9 grid gap-5 lg:mb-12 lg:grid-cols-[1fr_0.75fr] lg:items-end">
            <div>
              <span className="ez-section-kicker">Your platform. Your way.</span>
              <h2 className="ez-section-title mt-3">Find your ecosystem.</h2>
            </div>
            <p className="ez-section-copy lg:justify-self-end">
              Switch between the names shaping play and discover a focused edit of their best hardware, games, and gear.
            </p>
          </div>

          <div
            className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6"
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
                  className={`group flex min-h-[92px] flex-col items-start justify-between rounded-[20px] border p-4 text-left transition duration-300 sm:min-h-[108px] sm:p-5 ${
                    active
                      ? "border-[#1D1D1F] bg-[#1D1D1F] text-white shadow-[0_18px_45px_rgba(17,17,19,0.18)]"
                      : "border-white bg-white/75 text-[#1D1D1F] shadow-[0_8px_30px_rgba(17,17,19,0.04)] backdrop-blur hover:-translate-y-1 hover:border-black/10 hover:bg-white hover:shadow-[0_16px_40px_rgba(17,17,19,0.09)]"
                  } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#1D1D1F]`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold transition ${
                      active
                        ? "bg-white text-black"
                        : "bg-[#ECEEF2] text-[#1D1D1F] group-hover:bg-[#1D1D1F] group-hover:text-white"
                    }`}
                  >
                    {brandMarks[brand]}
                  </span>
                  <span className="flex w-full items-center justify-between gap-2 text-[13px] font-semibold sm:text-sm">
                    {brand}
                    <span
                      aria-hidden="true"
                      className={`transition ${active ? "text-white/45" : "text-[#AEAEB2] group-hover:translate-x-0.5"}`}
                    >
                      →
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div
            id="brand-products"
            role="tabpanel"
            aria-label={`${activeBrand} products`}
            className="mt-5 overflow-hidden rounded-[28px] border border-white bg-white/80 p-5 shadow-[0_22px_70px_rgba(17,17,19,0.08)] backdrop-blur-xl sm:mt-7 sm:rounded-[34px] sm:p-8 lg:p-10"
          >
            <ProductRail
              contained={false}
              eyebrow={`${activeBrand} collection`}
              title={`The ${activeBrand} edit.`}
              products={brandCollections[activeBrand]}
              variant={activeBrand === "PlayStation" || activeBrand === "Nintendo" ? "product" : "square"}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

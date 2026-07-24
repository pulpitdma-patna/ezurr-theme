"use client";

import { useState } from "react";
import Image from "next/image";
import type { ProductBadge } from "@/lib/types";
import { ProductRibbons } from "@/components/product/ProductRibbons";

/** Product gallery: compact frame, thumbnail strip, badge ribbons. */
export function ProductGallery({
  images,
  alt,
  badges = [],
}: {
  images: string[];
  alt: string;
  badges?: ProductBadge[];
}) {
  const list = images.length > 0 ? images : [""];
  const [sel, setSel] = useState(0);
  const active = list[Math.min(sel, list.length - 1)];

  return (
    <div className="mx-auto w-full max-w-[440px] sm:max-w-[480px] lg:mx-0 lg:flex lg:h-full lg:max-w-none lg:flex-col">
      <div className="lg:flex lg:h-full lg:min-h-0 lg:flex-1 lg:flex-row lg:gap-3">
        <div className="group relative aspect-[3/4] overflow-hidden rounded-[22px] border border-[#E3E3E8] bg-[linear-gradient(168deg,#ffffff_0%,#f6f7f9_55%,#f0f1f4_100%)] shadow-[0_12px_40px_rgba(17,17,19,0.04)] sm:rounded-[26px] lg:order-2 lg:aspect-auto lg:min-h-0 lg:flex-1">
          <ProductRibbons badges={badges} size="lg" />

          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-10 bottom-4 h-10 rounded-[100%] bg-black/[0.05] blur-2xl transition-opacity duration-300 group-hover:opacity-80"
          />
          {active ? (
            <Image
              src={active}
              alt={alt}
              fill
              className="object-contain p-2 transition-[opacity,transform] duration-300 ease-out group-hover:scale-[1.01] sm:p-3"
              sizes="(min-width: 1280px) 42vw, (min-width: 1024px) 46vw, (min-width: 640px) 50vw, 88vw"
              priority
            />
          ) : null}
        </div>

        {list.length > 1 ? (
          <div
            className="mt-3.5 flex gap-2 overflow-x-auto pb-1 sm:mt-4 lg:order-first lg:mt-0 lg:flex lg:shrink-0 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:pb-0"
            role="tablist"
            aria-label="Product images"
          >
            {list.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                role="tab"
                onClick={() => setSel(i)}
                aria-label={`View image ${i + 1}`}
                aria-selected={i === sel}
                className={`relative aspect-square w-[60px] shrink-0 overflow-hidden rounded-[14px] border bg-white transition-all duration-200 sm:w-[68px] lg:w-[64px] ${
                  i === sel
                    ? "border-[#111113] shadow-[0_4px_14px_rgba(17,17,19,0.1)]"
                    : "border-[#E8E8ED] opacity-80 hover:border-[#C7C7CC] hover:opacity-100"
                }`}
              >
                <Image src={src} alt="" fill className="object-contain p-1.5" sizes="68px" />
                {i === sel ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-2 bottom-1.5 h-[2px] rounded-full bg-[var(--ez-accent)] lg:inset-x-auto lg:bottom-auto lg:left-1.5 lg:inset-y-2 lg:h-auto lg:w-[2px]"
                  />
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import type { ProductBadge } from "@/lib/types";

const RIBBON: Record<string, string> = {
  discount: "bg-[#E5484D] text-white",
  new: "bg-[#0B8A4B] text-white",
  preorder: "bg-[#111113] text-white",
  bestprice: "bg-[#C98A16] text-white",
  soldout: "bg-[#8A8A8E] text-white",
};

/** Premium product gallery: large main image + thumbnail strip, ribbons overlaid. */
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
    <div className="lg:sticky lg:top-[96px]">
      <div className="relative aspect-square overflow-hidden rounded-[28px] border border-[#E8E8ED] bg-[radial-gradient(circle_at_50%_30%,#ffffff_0%,#f7f7fa_58%,#eceef2_100%)] sm:aspect-[4/3.5] sm:rounded-[32px]">
        {badges.length > 0 ? (
          <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-col items-start gap-1.5 sm:left-5 sm:top-5">
            {badges.map((b, i) => (
              <span
                key={`${b.kind}-${i}`}
                className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase leading-none tracking-[0.12em] shadow-[0_6px_16px_rgba(17,17,19,0.16)] ${
                  RIBBON[b.kind] ?? "bg-[#111113] text-white"
                }`}
              >
                {b.label}
              </span>
            ))}
          </div>
        ) : null}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-10 bottom-6 h-12 rounded-[100%] bg-black/[0.07] blur-2xl"
        />
        {active ? (
          <Image
            src={active}
            alt={alt}
            fill
            className="object-contain p-6 transition-opacity duration-300 sm:p-12"
            sizes="(min-width: 1024px) 55vw, 100vw"
            priority
          />
        ) : null}
      </div>

      {list.length > 1 ? (
        <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1 sm:mt-4">
          {list.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setSel(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === sel}
              className={`relative aspect-square w-[62px] shrink-0 overflow-hidden rounded-[14px] border bg-white transition sm:w-[74px] ${
                i === sel
                  ? "border-[#111113] ring-1 ring-[#111113]"
                  : "border-[#E8E8ED] hover:border-[#C7C7CC]"
              }`}
            >
              <Image src={src} alt="" fill className="object-contain p-1.5" sizes="74px" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

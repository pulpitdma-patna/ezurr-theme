"use client";

import { useRef } from "react";
import type { CatalogProduct } from "@/lib/types";
import { getCatalogProductKey } from "@/lib/productKey";
import { ConsoleCard, ProductCard } from "@/components/ui/ProductCard";
import { SectionHeading } from "./SectionHeading";

type ProductRailProps = {
  eyebrow: string;
  title: string;
  description?: string;
  products: CatalogProduct[];
  href?: string;
  linkLabel?: string;
  variant?: "product" | "preorder" | "square";
  contained?: boolean;
  inverse?: boolean;
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

export function ProductRail({
  eyebrow,
  title,
  description,
  products,
  href,
  linkLabel = "View all",
  variant = "product",
  contained = true,
  inverse = false,
}: ProductRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scroll(direction: -1 | 1) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollBy({ left: direction * scroller.clientWidth * 0.82, behavior: "smooth" });
  }

  const controls = (
    <div className="hidden items-center gap-2 sm:flex">
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label={`Scroll ${title} products left`}
        className={`flex h-11 w-11 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
          inverse
            ? "border border-white/10 bg-white/10 text-white hover:bg-white/20 focus-visible:outline-white"
            : "bg-[#E8E8ED] text-[#424245] hover:bg-[#D2D2D7] focus-visible:outline-[#1D1D1F]"
        }`}
      >
        <Arrow direction="left" />
      </button>
      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label={`Scroll ${title} products right`}
        className={`flex h-11 w-11 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
          inverse
            ? "bg-white text-black hover:bg-white/85 focus-visible:outline-white"
            : "bg-[#1D1D1F] text-white hover:bg-black focus-visible:outline-[#1D1D1F]"
        }`}
      >
        <Arrow direction="right" />
      </button>
    </div>
  );

  return (
    <section className={contained ? "ez-page ez-section" : ""} aria-label={title}>
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        description={description}
        href={href}
        linkLabel={href ? linkLabel : undefined}
        controls={controls}
        inverse={inverse}
      />
      <div
        ref={scrollerRef}
        className="ez-scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-4 sm:-mx-6 sm:gap-4 sm:px-6 lg:-mx-10 lg:px-10"
        tabIndex={0}
        role="region"
        aria-label={`${title} products`}
      >
        {products.map((product, index) => (
          <div
            key={getCatalogProductKey(product, index)}
            className={`min-w-0 shrink-0 snap-start ${
              variant === "square"
                ? "w-[76vw] max-w-[310px] sm:w-[310px]"
                : "w-[66vw] max-w-[270px] sm:w-[270px] lg:w-[286px] lg:max-w-[286px]"
            }`}
          >
            {variant === "square" ? (
              <ConsoleCard {...product} />
            ) : (
              <ProductCard
                {...product}
                productKey={getCatalogProductKey(product, index)}
                variant={variant === "preorder" ? "preorder" : "grid"}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

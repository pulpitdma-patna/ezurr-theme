import Image from "next/image";
import Link from "next/link";
import type { CatalogProduct } from "@/lib/types";

type ProductCardProps = CatalogProduct & {
  href?: string;
  variant?: "grid" | "preorder";
};

export function ProductCard({
  img,
  brand,
  name,
  price,
  strike,
  href = "/product",
  variant = "grid",
}: ProductCardProps) {
  if (variant === "preorder") {
    return (
      <Link
        href={href}
        className="ez-product-card group flex h-full flex-col gap-2 rounded-[22px] border border-black/[0.07] bg-white p-2.5 shadow-[var(--ez-card-shadow)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--ez-card-shadow-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D1D1F] sm:gap-3.5 sm:rounded-[26px] sm:p-3.5"
      >
        <div className="relative aspect-[3/4] overflow-hidden rounded-[16px] bg-[#F7F7F8] sm:rounded-[19px]">
          <Image
            src={img}
            alt={name}
            fill
            className="object-contain p-2 transition duration-500 group-hover:scale-[1.025]"
            sizes="(max-width: 640px) 50vw, 25vw"
          />
        </div>
        <div className="flex flex-col gap-1 px-0.5 pb-0.5 pt-0 sm:gap-1.5 sm:px-1.5">
          <div className="flex flex-wrap gap-1 sm:gap-1.5">
            <span className="ez-mono rounded-md bg-[#F5F5F7] px-1.5 py-0.5 text-[8px] uppercase tracking-[0.1em] text-[#6E6E73] sm:px-2 sm:py-1 sm:text-[9px]">
              {brand.split(" · ")[0]}
            </span>
            <span className="ez-mono rounded-md bg-[var(--ez-accent-soft)] px-1.5 py-0.5 text-[8px] uppercase tracking-[0.1em] text-[var(--ez-accent-soft-text)] sm:px-2 sm:py-1 sm:text-[9px]">
              PRE-ORDER
            </span>
          </div>
          <div className="line-clamp-2 min-h-[2.7em] text-sm font-semibold leading-snug tracking-[-0.025em] sm:text-[17px]">
            {name}
          </div>
          <div className="mt-0.5 flex items-center justify-between sm:mt-1">
            <span className="text-sm font-bold sm:text-base">{price}</span>
            <span className="text-xs font-semibold text-[var(--ez-accent-text)] sm:text-[13px]">
              Reserve
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="ez-card-hover group flex h-full flex-col overflow-hidden rounded-[22px] border border-black/[0.07] bg-white shadow-[var(--ez-card-shadow)] transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D1D1F] sm:rounded-[26px]"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-[#F7F7F8]">
        <Image
          src={img}
          alt={name}
          fill
          className="object-contain p-2 transition duration-500 group-hover:scale-[1.025] sm:p-3"
          sizes="(max-width: 640px) 50vw, 25vw"
        />
      </div>
      <div className="flex grow flex-col gap-1.5 border-t border-black/[0.04] px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-center justify-between gap-2">
          <span className="ez-mono truncate text-[8px] uppercase tracking-[0.16em] text-[#86868B] sm:text-[9.5px]">
            {brand}
          </span>
          <span className="shrink-0 text-xs font-semibold text-[var(--ez-accent-text)] sm:text-[13px]">
            View →
          </span>
        </div>
        <span className="line-clamp-2 min-h-[2.6em] text-[15px] font-semibold leading-[1.3] tracking-[-0.02em]">
          {name}
        </span>
        <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
          <span className="ez-mono text-xs text-[#1D1D1F] sm:text-[13px]">{price}</span>
          {strike && (
            <span className="ez-mono text-[10px] text-[#AEAEB2] line-through sm:text-[11px]">
              {strike}
            </span>
          )}
          {strike && (
            <span className="ml-auto rounded-full bg-[#EAF6ED] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#2D6B3C]">
              Sale
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ConsoleCard({
  img,
  brand,
  name,
  price,
  strike,
  href = "/product",
}: CatalogProduct & { href?: string }) {
  return (
    <Link
      href={href}
      className="ez-card-hover group flex h-full flex-col overflow-hidden rounded-[22px] border border-black/[0.07] bg-white shadow-[var(--ez-card-shadow)] transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D1D1F] sm:rounded-[26px]"
    >
      <div className="relative aspect-square bg-[#F7F7F8]">
        <Image
          src={img}
          alt={name}
          fill
          className="object-contain p-5 transition duration-500 group-hover:scale-[1.025]"
          sizes="(max-width: 640px) 50vw, 25vw"
        />
      </div>
      <div className="flex grow flex-col gap-1.5 border-t border-black/[0.04] px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-center justify-between gap-2">
          <span className="ez-mono text-[8px] uppercase tracking-[0.16em] text-[#86868B] sm:text-[9.5px]">
            {brand}
          </span>
          <span className="text-xs font-semibold text-[var(--ez-accent-text)] sm:text-[13px]">
            View →
          </span>
        </div>
        <span className="line-clamp-2 min-h-[2.6em] text-[15px] font-semibold leading-[1.3] tracking-[-0.02em]">
          {name}
        </span>
        <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
          <span className="ez-mono text-xs sm:text-[13px]">{price}</span>
          {strike && (
            <span className="ez-mono text-[10px] text-[#AEAEB2] line-through sm:text-[11px]">
              {strike}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

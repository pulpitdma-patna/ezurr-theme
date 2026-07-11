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
        className="ez-product-card flex flex-col gap-2 rounded-2xl border border-[#E8E8ED] bg-white p-2.5 transition-all duration-[180ms] sm:gap-3.5 sm:rounded-[18px] sm:p-3.5"
      >
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-[#F5F5F7] bg-white sm:rounded-[10px]">
          <Image
            src={img}
            alt={name}
            fill
            className="object-contain"
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
          <div className="text-sm font-semibold leading-snug tracking-[-0.01em] sm:text-[17px]">
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
      className="ez-card-hover flex flex-col overflow-hidden rounded-2xl border border-[#E8E8ED] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all duration-[220ms] sm:rounded-[22px]"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-white">
        <Image
          src={img}
          alt={name}
          fill
          className="object-contain"
          sizes="(max-width: 640px) 50vw, 25vw"
        />
      </div>
      <div className="flex flex-col gap-1 border-t border-[#F5F5F7] px-3 py-3 sm:gap-1.5 sm:px-5 sm:py-4 sm:pb-5">
        <div className="flex items-center justify-between gap-2">
          <span className="ez-mono truncate text-[8px] uppercase tracking-[0.16em] text-[#86868B] sm:text-[9.5px]">
            {brand}
          </span>
          <span className="shrink-0 text-xs font-semibold text-[var(--ez-accent-text)] sm:text-[13px]">
            View →
          </span>
        </div>
        <span className="line-clamp-2 text-sm font-semibold sm:text-[15px]">{name}</span>
        <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
          <span className="ez-mono text-xs text-[#1D1D1F] sm:text-[13px]">{price}</span>
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
      className="ez-card-hover flex flex-col overflow-hidden rounded-2xl border border-[#E8E8ED] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all duration-[220ms] sm:rounded-[22px]"
    >
      <div className="relative aspect-square bg-white">
        <Image
          src={img}
          alt={name}
          fill
          className="object-contain"
          sizes="(max-width: 640px) 50vw, 25vw"
        />
      </div>
      <div className="flex flex-col gap-1 border-t border-[#F5F5F7] px-3 py-3 sm:gap-1.5 sm:px-5 sm:py-4 sm:pb-5">
        <div className="flex items-center justify-between gap-2">
          <span className="ez-mono text-[8px] uppercase tracking-[0.16em] text-[#86868B] sm:text-[9.5px]">
            {brand}
          </span>
          <span className="text-xs font-semibold text-[var(--ez-accent-text)] sm:text-[13px]">
            View →
          </span>
        </div>
        <span className="line-clamp-2 text-sm font-semibold sm:text-[15px]">{name}</span>
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

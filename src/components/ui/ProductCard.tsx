"use client";

import Image from "next/image";
import Link from "next/link";
import type { CatalogProduct } from "@/lib/types";
import { useAccountStore } from "@/hooks/useAccountStore";
import { catalogKeyForProduct, toggleWishlistKey } from "@/lib/accountStore";

type ProductCardProps = CatalogProduct & {
  href?: string;
  variant?: "grid" | "preorder";
  productKey?: string;
  showWishlist?: boolean;
};

function WishlistButton({
  productKey,
  name,
}: {
  productKey: string;
  name: string;
}) {
  const account = useAccountStore();
  const active = account.wishlistKeys.includes(productKey);

  return (
    <button
      type="button"
      aria-label={active ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      aria-pressed={active}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWishlistKey(productKey);
      }}
      className={`absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border transition duration-300 ${
        active
          ? "border-[#1D1D1F] bg-[#1D1D1F] text-white shadow-[0_8px_20px_rgba(17,17,19,0.25)]"
          : "border-black/[0.06] bg-white/80 text-[#86868B] shadow-[0_4px_16px_rgba(17,17,19,0.08)] backdrop-blur-md hover:border-black/[0.12] hover:text-[#1D1D1F]"
      }`}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} aria-hidden>
        <path
          d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function CardMedia({
  img,
  name,
  tall = false,
}: {
  img: string;
  name: string;
  tall?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden ${
        tall ? "aspect-[3/4]" : "aspect-[3/4]"
      } bg-[linear-gradient(165deg,#F4F4F6_0%,#EBEBED_48%,#F8F8FA_100%)]`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 bottom-4 h-8 rounded-[100%] bg-black/[0.06] blur-xl transition duration-500 group-hover:bg-black/[0.1]"
      />
      <Image
        src={img}
        alt={name}
        fill
        className="object-contain p-4 transition duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04] sm:p-5"
        sizes="(max-width: 640px) 66vw, 286px"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,transparent_28%,transparent_72%,rgba(17,17,19,0.03)_100%)]"
      />
    </div>
  );
}

export function ProductCard({
  img,
  brand,
  name,
  price,
  strike,
  href = "/product",
  variant = "grid",
  productKey,
  showWishlist = true,
}: ProductCardProps) {
  const key = productKey ?? catalogKeyForProduct({ img, brand, name, price, strike });
  const platform = brand.split(" · ")[0];

  if (variant === "preorder") {
    return (
      <div className="relative h-full">
        {showWishlist ? <WishlistButton productKey={key} name={name} /> : null}
        <Link
          href={href}
          className="ez-product-card group flex h-full flex-col overflow-hidden rounded-[24px] border border-black/[0.06] bg-white shadow-[0_1px_0_rgba(17,17,19,0.04),0_20px_48px_rgba(17,17,19,0.06)] transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 hover:border-black/[0.1] hover:shadow-[0_1px_0_rgba(17,17,19,0.04),0_32px_64px_rgba(17,17,19,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D1D1F] sm:rounded-[28px]"
        >
          <CardMedia img={img} name={name} tall />

          <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-3.5 sm:gap-3.5 sm:px-5 sm:pb-5 sm:pt-4">
            <div className="flex items-center gap-2">
              <span className="ez-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#86868B]">
                {platform}
              </span>
              <span aria-hidden className="h-0.5 w-0.5 rounded-full bg-[#C7C7CC]" />
              <span className="ez-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#1D1D1F]">
                Pre-order
              </span>
            </div>

            <h3 className="line-clamp-2 min-h-[2.6em] text-[15px] font-semibold leading-[1.25] tracking-[-0.035em] text-[#111113] sm:text-[17px]">
              {name}
            </h3>

            <div className="mt-auto flex items-end justify-between gap-3 border-t border-black/[0.05] pt-3.5">
              <div className="min-w-0">
                <p className="ez-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#A1A1A6]">
                  From
                </p>
                <p className="mt-0.5 text-[17px] font-semibold tracking-[-0.03em] text-[#111113] sm:text-[18px]">
                  {price}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#111113] px-3.5 py-2 text-[11px] font-semibold tracking-[-0.01em] text-white transition duration-300 group-hover:bg-[#2C2C2E]">
                Reserve
                <span
                  aria-hidden
                  className="translate-x-0 transition duration-300 group-hover:translate-x-0.5"
                >
                  →
                </span>
              </span>
            </div>
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {showWishlist ? <WishlistButton productKey={key} name={name} /> : null}
      <Link
        href={href}
        className="ez-product-card group flex h-full flex-col overflow-hidden rounded-[24px] border border-black/[0.06] bg-white shadow-[0_1px_0_rgba(17,17,19,0.04),0_20px_48px_rgba(17,17,19,0.06)] transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 hover:border-black/[0.1] hover:shadow-[0_1px_0_rgba(17,17,19,0.04),0_32px_64px_rgba(17,17,19,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D1D1F] sm:rounded-[28px]"
      >
        <CardMedia img={img} name={name} />

        <div className="flex flex-1 flex-col gap-2.5 px-4 pb-4 pt-3.5 sm:gap-3 sm:px-5 sm:pb-5 sm:pt-4">
          <span className="ez-mono truncate text-[9px] font-bold uppercase tracking-[0.18em] text-[#86868B]">
            {brand}
          </span>

          <h3 className="line-clamp-2 min-h-[2.5em] text-[15px] font-semibold leading-[1.25] tracking-[-0.035em] text-[#111113] sm:text-[16px]">
            {name}
          </h3>

          <div className="mt-auto flex items-end justify-between gap-3 border-t border-black/[0.05] pt-3.5">
            <div className="flex min-w-0 flex-wrap items-baseline gap-2">
              <span className="text-[16px] font-semibold tracking-[-0.03em] text-[#111113]">
                {price}
              </span>
              {strike ? (
                <span className="ez-mono text-[11px] text-[#AEAEB2] line-through">
                  {strike}
                </span>
              ) : null}
            </div>
            {strike ? (
              <span className="ez-mono rounded-full bg-[#111113] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-white">
                Sale
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold tracking-[-0.01em] text-[#111113] transition group-hover:gap-1.5">
                View
                <span aria-hidden>→</span>
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
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
      className="ez-product-card group flex h-full flex-col overflow-hidden rounded-[24px] border border-black/[0.06] bg-white shadow-[0_1px_0_rgba(17,17,19,0.04),0_20px_48px_rgba(17,17,19,0.06)] transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 hover:border-black/[0.1] hover:shadow-[0_1px_0_rgba(17,17,19,0.04),0_32px_64px_rgba(17,17,19,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D1D1F] sm:rounded-[28px]"
    >
      <div className="relative aspect-square overflow-hidden bg-[linear-gradient(165deg,#F4F4F6_0%,#EBEBED_48%,#F8F8FA_100%)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-8 bottom-5 h-10 rounded-[100%] bg-black/[0.06] blur-xl transition duration-500 group-hover:bg-black/[0.1]"
        />
        <Image
          src={img}
          alt={name}
          fill
          className="object-contain p-6 transition duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04] sm:p-7"
          sizes="(max-width: 640px) 50vw, 25vw"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2.5 px-4 pb-4 pt-3.5 sm:gap-3 sm:px-5 sm:pb-5 sm:pt-4">
        <span className="ez-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#86868B]">
          {brand}
        </span>
        <h3 className="line-clamp-2 min-h-[2.5em] text-[15px] font-semibold leading-[1.25] tracking-[-0.035em] text-[#111113] sm:text-[16px]">
          {name}
        </h3>
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-black/[0.05] pt-3.5">
          <div className="flex items-baseline gap-2">
            <span className="text-[16px] font-semibold tracking-[-0.03em] text-[#111113]">
              {price}
            </span>
            {strike ? (
              <span className="ez-mono text-[11px] text-[#AEAEB2] line-through">
                {strike}
              </span>
            ) : null}
          </div>
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold tracking-[-0.01em] text-[#111113] transition group-hover:gap-1.5">
            View
            <span aria-hidden>→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

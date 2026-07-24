"use client";

import Image from "next/image";
import Link from "next/link";
import type { CatalogProduct } from "@/lib/types";
import { ProductRibbons } from "@/components/product/ProductRibbons";
import { useAccountStore } from "@/hooks/useAccountStore";
import { catalogKeyForProduct, toggleWishlistKey } from "@/lib/accountStore";
import { productDetailHref } from "@/lib/productKey";
import { api, isApiEnabled } from "@/lib/apiClient";
import { getSession } from "@/lib/auth";

type ProductCardProps = CatalogProduct & {
  href?: string;
  variant?: "grid" | "preorder";
  productKey?: string;
  showWishlist?: boolean;
};

const CARD_SHELL =
  "ez-product-card group flex h-full flex-col overflow-hidden rounded-[20px] border border-black/[0.07] bg-white shadow-[0_1px_0_rgba(17,17,19,0.05),0_12px_32px_rgba(17,17,19,0.05)] transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-black/[0.11] hover:shadow-[0_1px_0_rgba(17,17,19,0.05),0_24px_48px_rgba(17,17,19,0.1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D1D1F] sm:rounded-[24px]";

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
        const nowActive = toggleWishlistKey(productKey);
        // Best-effort server sync for signed-in shoppers; no-ops (404) for
        // catalog-only keys, so it never blocks the local UX.
        if (isApiEnabled() && getSession()) {
          const call = nowActive
            ? api.addWishlist(productKey)
            : api.removeWishlist(productKey);
          void call.catch(() => {});
        }
      }}
      className={`absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border transition duration-300 ${
        active
          ? "border-[#1D1D1F] bg-[#1D1D1F] text-white shadow-[0_8px_20px_rgba(17,17,19,0.25)]"
          : "border-black/[0.08] bg-white/90 text-[#86868B] shadow-[0_4px_16px_rgba(17,17,19,0.1)] backdrop-blur-md hover:border-black/[0.14] hover:text-[#1D1D1F]"
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
      } bg-[linear-gradient(168deg,#F6F6F8_0%,#EBEBEE_52%,#F4F4F7_100%)]`}
      style={{ position: "relative" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-7 bottom-4 h-7 rounded-[100%] bg-black/[0.05] blur-xl transition duration-500 group-hover:bg-black/[0.08]"
      />
      <Image
        src={img}
        alt={name}
        fill
        className="object-contain p-4 transition duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03] sm:p-5"
        sizes="(max-width: 640px) 66vw, 286px"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.22)_0%,transparent_24%,transparent_76%,rgba(17,17,19,0.04)_100%)]"
      />
    </div>
  );
}

export function ProductCard({
  id,
  img,
  brand,
  name,
  price,
  strike,
  badges,
  href,
  variant = "grid",
  productKey,
  showWishlist = true,
}: ProductCardProps) {
  const key =
    productKey ??
    catalogKeyForProduct({ id, img, brand, name, price, strike });
  const resolvedHref = href ?? productDetailHref({ id, name });
  const platform = brand.split(" · ")[0];

  if (variant === "preorder") {
    return (
      <div className="relative h-full">
        {showWishlist ? <WishlistButton productKey={key} name={name} /> : null}
        <ProductRibbons badges={badges} size="sm" />
        <Link href={resolvedHref} className={CARD_SHELL}>
          <CardMedia img={img} name={name} tall />

          <div className="flex flex-1 flex-col gap-2.5 px-4 pb-4 pt-3 sm:gap-3 sm:px-5 sm:pb-5 sm:pt-3.5">
            <div className="flex items-center gap-2">
              <span className="ez-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#6E6E73]">
                {platform}
              </span>
              <span aria-hidden className="h-0.5 w-0.5 rounded-full bg-[#C7C7CC]" />
              <span className="ez-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#1D1D1F]">
                Pre-order
              </span>
            </div>

            <h3 className="line-clamp-2 min-h-[2.55em] text-[15px] font-semibold leading-[1.28] tracking-[-0.03em] text-[#111113] sm:text-[16px]">
              {name}
            </h3>

            <div className="mt-auto flex items-end justify-between gap-3 border-t border-black/[0.06] pt-3">
              <div className="min-w-0">
                <p className="ez-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#A1A1A6]">
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
      <ProductRibbons badges={badges} size="sm" />
      <Link href={resolvedHref} className={CARD_SHELL}>
        <CardMedia img={img} name={name} />

        <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-3 sm:gap-2.5 sm:px-5 sm:pb-5 sm:pt-3.5">
          <span className="ez-mono truncate text-[10px] font-bold uppercase tracking-[0.16em] text-[#6E6E73]">
            {brand}
          </span>

          <h3 className="line-clamp-2 min-h-[2.55em] text-[15px] font-semibold leading-[1.28] tracking-[-0.03em] text-[#111113] sm:text-[16px]">
            {name}
          </h3>

          <div className="mt-auto flex items-end justify-between gap-3 border-t border-black/[0.06] pt-3">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-[17px] font-semibold tracking-[-0.03em] text-[#111113] sm:text-[18px]">
                {price}
              </span>
              {strike ? (
                <span className="ez-mono text-[12px] text-[#AEAEB2] line-through">
                  {strike}
                </span>
              ) : null}
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold tracking-[-0.01em] text-[#48484A] transition group-hover:gap-1.5 group-hover:text-[#111113]">
              View
              <span aria-hidden>→</span>
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}

export function ConsoleCard({
  id,
  img,
  brand,
  name,
  price,
  strike,
  href,
}: CatalogProduct & { href?: string }) {
  const resolvedHref = href ?? productDetailHref({ id, name });
  return (
    <Link href={resolvedHref} className={CARD_SHELL}>
      <div
        className="relative aspect-square overflow-hidden bg-[linear-gradient(168deg,#F6F6F8_0%,#EBEBEE_52%,#F4F4F7_100%)]"
        style={{ position: "relative" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-8 bottom-5 h-10 rounded-[100%] bg-black/[0.05] blur-xl transition duration-500 group-hover:bg-black/[0.08]"
        />
        <Image
          src={img}
          alt={name}
          fill
          className="object-contain p-6 transition duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03] sm:p-7"
          sizes="(max-width: 640px) 50vw, 25vw"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-3 sm:gap-2.5 sm:px-5 sm:pb-5 sm:pt-3.5">
        <span className="ez-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#6E6E73]">
          {brand}
        </span>
        <h3 className="line-clamp-2 min-h-[2.55em] text-[15px] font-semibold leading-[1.28] tracking-[-0.03em] text-[#111113] sm:text-[16px]">
          {name}
        </h3>
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-black/[0.06] pt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[17px] font-semibold tracking-[-0.03em] text-[#111113] sm:text-[18px]">
              {price}
            </span>
            {strike ? (
              <span className="ez-mono text-[12px] text-[#AEAEB2] line-through">
                {strike}
              </span>
            ) : null}
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold tracking-[-0.01em] text-[#48484A] transition group-hover:gap-1.5 group-hover:text-[#111113]">
            View
            <span aria-hidden>→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

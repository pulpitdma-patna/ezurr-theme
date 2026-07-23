"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MicroBar } from "@/components/layout/MicroBar";
import { Header } from "@/components/layout/Header";
import { FooterFull } from "@/components/layout/Footer";
import { CountdownInline } from "@/components/ui/Countdown";
import { RelatedProductsSection } from "@/components/product/RelatedProductsSection";
import { findStaticCatalogProduct } from "@/data/home";
import { formatInr } from "@/data/admin";
import { formatReleaseLabel, useLiveThemeSettings } from "@/hooks/useLiveThemeSettings";
import { api, isApiEnabled, type ApiProduct } from "@/lib/apiClient";
import type { CatalogProduct } from "@/lib/types";

const DEFAULT_IMG =
  "https://ezurr.com/cdn/shop/files/GAMPLAY540.jpg?v=1782735956&width=533";
const DEFAULT_KEY = "gta-vi-preorder";

type ResolvedProduct = {
  key: string;
  title: string;
  brand: string;
  price: string;
  description: string;
  imageSrc: string;
  categorySlug?: string;
  fulfillmentType?: string;
  source: "api" | "static";
};

function fromApi(product: ApiProduct): ResolvedProduct {
  return {
    key: product.key || product.slug || String(product.id),
    title: product.title,
    brand: product.brand_slug || product.category_slug || "Ezurr",
    price: formatInr(product.price),
    description: product.description || "Available on Ezurr.",
    imageSrc: product.image_url || DEFAULT_IMG,
    categorySlug: product.category_slug ?? undefined,
    fulfillmentType: product.fulfillment_type,
    source: "api",
  };
}

function fromStatic(product: CatalogProduct, key: string): ResolvedProduct {
  return {
    key: product.id || key,
    title: product.name,
    brand: product.brand || "Ezurr",
    price: product.price,
    description: "Available on Ezurr.",
    imageSrc: product.img || DEFAULT_IMG,
    categorySlug: undefined,
    fulfillmentType: product.brand.toLowerCase().includes("pre-order")
      ? "preorder"
      : undefined,
    source: "static",
  };
}

export default function ProductPage() {
  const searchParams = useSearchParams();
  const productKey = searchParams.get("key")?.trim() || DEFAULT_KEY;
  const apiOn = isApiEnabled();
  const settings = useLiveThemeSettings();
  const releaseLabel = formatReleaseLabel(settings.releaseDate);
  const pct = settings.prepaidDiscount;

  const [resolved, setResolved] = useState<ResolvedProduct | null>(() => {
    if (apiOn) return null;
    const staticHit = findStaticCatalogProduct(productKey);
    return staticHit ? fromStatic(staticHit, productKey) : null;
  });
  const [loading, setLoading] = useState(apiOn);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSelectedImage(0);
    setError(null);

    if (!apiOn) {
      const staticHit = findStaticCatalogProduct(productKey);
      setResolved(staticHit ? fromStatic(staticHit, productKey) : null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setResolved(null);

    void api
      .product(productKey)
      .then((p) => {
        if (!cancelled) setResolved(fromApi(p));
      })
      .catch((err: Error) => {
        if (cancelled) return;
        const staticHit = findStaticCatalogProduct(productKey);
        if (staticHit) {
          setResolved(fromStatic(staticHit, productKey));
          setError(null);
        } else {
          setResolved(null);
          setError(err.message || "Product not found");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiOn, productKey]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <MicroBar />
        <Header active="preorders" />
        <p className="ez-page py-20 text-sm text-[#86868B]">Loading product…</p>
      </div>
    );
  }

  if (error || !resolved) {
    return (
      <div className="min-h-screen bg-white">
        <MicroBar />
        <Header active="preorders" />
        <div className="ez-page py-20">
          <p className="text-sm text-[#B42318]" role="alert">
            {error || "Product not found"}
          </p>
          <Link href="/preorders" className="mt-4 inline-block text-sm font-semibold">
            ← Back to pre-orders
          </Link>
        </div>
      </div>
    );
  }

  const {
    title,
    brand,
    price,
    description,
    imageSrc,
    categorySlug = "preorders",
    fulfillmentType,
  } = resolved;

  const navActive =
    categorySlug === "games"
      ? "games"
      : categorySlug === "consoles"
        ? "consoles"
        : categorySlug === "accessories"
          ? "accessories"
          : categorySlug === "game-cards"
            ? "game-cards"
            : "preorders";

  const productImages = [{ src: imageSrc, alt: title }];

  return (
    <div className="min-h-screen bg-white">
      <MicroBar />
      <Header active={navActive} />

      <div className="ez-page ez-mono flex w-full flex-wrap gap-2 pt-4 text-[9px] uppercase tracking-[0.14em] text-[#86868B] sm:gap-2.5 sm:pt-6 sm:text-[10px]">
        <Link href="/" className="hover:text-[#1D1D1F]">
          Home
        </Link>
        <span>/</span>
        <Link href={`/${categorySlug || "preorders"}`} className="hover:text-[#1D1D1F]">
          {categorySlug || "Pre-orders"}
        </Link>
        <span>/</span>
        <span className="text-[#1D1D1F]">{title}</span>
      </div>

      <section className="ez-page grid w-full grid-cols-1 items-start gap-8 pb-4 pt-5 sm:gap-10 sm:pt-7 lg:grid-cols-[minmax(0,1.3fr)_minmax(390px,0.7fr)] lg:gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(430px,0.55fr)] xl:gap-12">
        <div className="min-w-0">
          <div className="relative aspect-[4/3.35] min-h-[340px] overflow-hidden rounded-[24px] border border-[#E8E8ED] bg-[radial-gradient(circle_at_50%_35%,#ffffff_0%,#f8f8fa_62%,#f0f0f3_100%)] sm:min-h-[520px] sm:rounded-[32px] lg:sticky lg:top-[96px] xl:min-h-[620px]">
            <Image
              src={productImages[selectedImage].src}
              alt={productImages[selectedImage].alt}
              fill
              className="object-contain p-5 sm:p-10 xl:p-14"
              sizes="(min-width: 1024px) 58vw, 100vw"
              priority
            />
          </div>
        </div>

        <aside className="overflow-hidden rounded-[28px] border border-[#E3E3E8] bg-white shadow-[0_24px_70px_rgba(17,17,19,0.09)] lg:sticky lg:top-[96px]">
          <div className="flex flex-col gap-5 p-5 sm:p-7 xl:p-8">
            <div className="ez-mono flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--ez-accent-text)] sm:text-[10px]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--ez-accent)] opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--ez-accent)]" />
              </span>
              {fulfillmentType === "preorder" ? "Pre-order open" : "In stock"}
              <span className="text-[#AEAEB2]">·</span>
              <span className="text-[#6E6E73]">Releases {releaseLabel}</span>
            </div>

            <div>
              <p className="ez-mono mb-2 text-[9px] uppercase tracking-[0.18em] text-[#86868B]">
                {brand}
              </p>
              <h1 className="m-0 text-[clamp(2.25rem,4vw,4.25rem)] font-bold leading-[0.94] tracking-[-0.055em] text-[#111113]">
                {title}
              </h1>
              <p className="mt-4 text-[15px] leading-relaxed text-[#6E6E73] sm:text-base">
                {description}
              </p>
            </div>

            <div className="flex items-end justify-between gap-4 border-y border-[#E8E8ED] py-5">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[30px] font-bold leading-none tracking-[-0.04em] sm:text-[36px]">
                    {price}
                  </span>
                  <span className="ez-mono rounded-full bg-[var(--ez-accent-soft)] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.13em] text-[var(--ez-accent-soft-text)]">
                    Price locked
                  </span>
                </div>
                <p className="mt-2 text-xs text-[#86868B]">Inclusive of all taxes</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1D1D1F] px-5 py-5 text-white sm:px-7 sm:py-6 xl:px-8">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <span className="ez-mono text-[9px] uppercase tracking-[0.15em] text-[#A1A1A6]">
                Release countdown
              </span>
              <CountdownInline />
            </div>
            <Link
              href={`/checkout?key=${encodeURIComponent(productKey)}`}
              className="ez-btn-primary flex min-h-14 w-full items-center justify-center rounded-full px-5 text-center text-[15px] font-semibold shadow-[0_10px_30px_oklch(0.4_0.16_var(--ez-h)/0.35)]"
            >
              Pre-order now · ₹0 today
            </Link>
            <div className="mt-4 grid gap-2 text-[11.5px] text-[#C7C7CC]">
              {[
                "Charged only when your order ships",
                `${pct}% off prepaid orders · Cancel before dispatch`,
              ].map((line) => (
                <div key={line} className="flex items-start gap-2">
                  <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-[var(--ez-accent)]" />
                  {line}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <RelatedProductsSection categorySlug={categorySlug} excludeKey={productKey} />

      <FooterFull />
    </div>
  );
}

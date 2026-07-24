"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { viewItem, addToCart } from "@/lib/analytics";
import { MicroBar } from "@/components/layout/MicroBar";
import { Header } from "@/components/layout/Header";
import { FooterFull } from "@/components/layout/Footer";
import { CountdownInline } from "@/components/ui/Countdown";
import { RelatedProductsSection } from "@/components/product/RelatedProductsSection";
import { ProductDetails } from "@/components/product/ProductDetails";
import { ProductGallery } from "@/components/product/ProductGallery";
import { formatReleaseLabel, useLiveThemeSettings } from "@/hooks/useLiveThemeSettings";
import type { ResolvedProduct } from "@/lib/productResolve";
import { useCart } from "@/lib/cart";
import { api } from "@/lib/apiClient";

export function ProductView({
  productKey,
  initialProduct,
}: {
  productKey: string;
  initialProduct: ResolvedProduct | null;
}) {
  const settings = useLiveThemeSettings();
  const releaseLabel = formatReleaseLabel(settings.releaseDate);
  const pct = settings.prepaidDiscount;
  const [added, setAdded] = useState(false);
  const cart = useCart();
  const resolved = initialProduct;

  if (!resolved) {
    return (
      <div className="min-h-screen bg-white">
        <MicroBar />
        <Header active="preorders" />
        <div className="ez-page py-20">
          <p className="text-sm text-[#B42318]" role="alert">
            Product not found
          </p>
          <Link href="/preorders" className="mt-4 inline-block text-sm font-semibold">
            ← Back to pre-orders
          </Link>
        </div>
        <FooterFull />
      </div>
    );
  }

  const {
    title,
    brand,
    price,
    priceValue,
    stock,
    description,
    imageSrc,
    images,
    strike,
    badges,
    categorySlug = "preorders",
    fulfillmentType,
  } = resolved;
  const discountPct =
    strike && priceValue
      ? Math.round((1 - priceValue / (Number(strike.replace(/[^\d]/g, "")) || priceValue)) * 100)
      : 0;

  const isPreorder = fulfillmentType === "preorder";
  const isDigital = fulfillmentType === "digital";
  // Digital never runs out; physical is out of stock when stock is 0 or less.
  const isOutOfStock = !isPreorder && !isDigital && typeof stock === "number" && stock <= 0;

  const [notifyMobile, setNotifyMobile] = useState("");
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);
  const [notifySent, setNotifySent] = useState(false);

  async function notifyMe() {
    const mobile = notifyMobile.replace(/\D/g, "").slice(0, 10);
    if (mobile.length !== 10) {
      setNotifyMsg("Enter a valid 10-digit mobile number.");
      return;
    }
    try {
      const res = await api.subscribeWaitlist(productKey, mobile);
      setNotifySent(true);
      setNotifyMsg(res.in_stock ? "Good news — it's back in stock!" : "We'll text you when it's back.");
    } catch (e) {
      setNotifyMsg(e instanceof Error ? e.message : "Could not subscribe. Try again.");
    }
  }

  useEffect(() => {
    viewItem({ id: productKey, name: title, price: priceValue });
  }, [productKey, title, priceValue]);

  function handleAddToCart() {
    cart.addItem({
      productKey,
      title,
      price: priceValue ?? 0,
      image: imageSrc,
      fulfillmentType,
    });
    addToCart({ id: productKey, name: title, price: priceValue, qty: 1 });
    setAdded(true);
    cart.openDrawer();
    window.setTimeout(() => setAdded(false), 1800);
  }

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
          <ProductGallery images={images} alt={title} badges={badges} />
        </div>

        <aside className="overflow-hidden rounded-[28px] border border-[#E3E3E8] bg-white shadow-[0_24px_70px_rgba(17,17,19,0.09)] lg:sticky lg:top-[96px]">
          <div className="flex flex-col gap-5 p-5 sm:p-7 xl:p-8">
            <div className="ez-mono flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--ez-accent-text)] sm:text-[10px]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--ez-accent)] opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--ez-accent)]" />
              </span>
              {isPreorder ? "Pre-order open" : isOutOfStock ? "Sold out" : "In stock"}
              <span className="text-[#AEAEB2]">·</span>
              <span className="text-[#6E6E73]">
                {isPreorder
                  ? `Releases ${releaseLabel}`
                  : isOutOfStock
                    ? "Get notified"
                    : isDigital
                      ? "Instant delivery"
                      : "Ready to ship"}
              </span>
            </div>

            <div>
              <p className="ez-mono mb-2 text-[9px] uppercase tracking-[0.18em] text-[#86868B]">
                {brand}
              </p>
              <h1 className="m-0 text-[clamp(2.25rem,4vw,4.25rem)] font-bold leading-[0.94] tracking-[-0.055em] text-[#111113]">
                {title}
              </h1>
              <p className="mt-4 line-clamp-3 text-[15px] leading-relaxed text-[#6E6E73] sm:text-base">
                {description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}
              </p>
            </div>

            <div className="flex items-end justify-between gap-4 border-y border-[#E8E8ED] py-5">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[30px] font-bold leading-none tracking-[-0.04em] sm:text-[36px]">
                    {price}
                  </span>
                  {strike ? (
                    <span className="ez-mono text-[15px] text-[#AEAEB2] line-through">{strike}</span>
                  ) : null}
                  {discountPct > 0 ? (
                    <span className="rounded-full bg-[#E5484D] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white">
                      {discountPct}% off
                    </span>
                  ) : (
                    <span className="ez-mono rounded-full bg-[var(--ez-accent-soft)] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.13em] text-[var(--ez-accent-soft-text)]">
                      Price locked
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-[#86868B]">Inclusive of all taxes</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1D1D1F] px-5 py-5 text-white sm:px-7 sm:py-6 xl:px-8">
            {isPreorder ? (
              <>
                <div className="mb-4 flex items-baseline justify-between gap-3">
                  <span className="ez-mono text-[9px] uppercase tracking-[0.15em] text-[#A1A1A6]">
                    Release countdown
                  </span>
                  <CountdownInline />
                </div>
                <Link
                  href={`/checkout/${encodeURIComponent(productKey)}`}
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
              </>
            ) : isOutOfStock ? (
              <>
                <div className="mb-3 text-[15px] font-semibold text-white">Sold out</div>
                {notifySent ? (
                  <p className="text-[13px] text-[#8FD9A8]">{notifyMsg}</p>
                ) : (
                  <>
                    <p className="mb-3 text-[12px] text-[#C7C7CC]">
                      Get a WhatsApp alert the moment it&apos;s back in stock.
                    </p>
                    <div className="flex gap-2">
                      <input
                        value={notifyMobile}
                        onChange={(e) => setNotifyMobile(e.target.value)}
                        inputMode="numeric"
                        placeholder="Mobile number"
                        aria-label="Mobile number for back-in-stock alert"
                        className="h-12 flex-1 rounded-full border border-white/25 bg-white/[0.06] px-4 text-[15px] text-white placeholder:text-[#8E8E93] outline-none focus:border-white/50"
                      />
                      <button
                        type="button"
                        onClick={() => void notifyMe()}
                        className="ez-btn-primary flex min-h-12 shrink-0 items-center justify-center rounded-full px-5 text-[14px] font-semibold"
                      >
                        Notify me
                      </button>
                    </div>
                    {notifyMsg ? (
                      <p className="mt-2 text-[12px] font-medium text-[#F5C2C0]">{notifyMsg}</p>
                    ) : null}
                  </>
                )}
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    aria-label="Add to cart"
                    className="flex min-h-14 items-center justify-center rounded-full border border-white/25 px-4 text-center text-[15px] font-semibold text-white transition hover:bg-white/10"
                  >
                    {added ? "Added ✓" : "Add to cart"}
                  </button>
                  <Link
                    href={`/checkout/${encodeURIComponent(productKey)}`}
                    className="ez-btn-primary flex min-h-14 items-center justify-center rounded-full px-4 text-center text-[15px] font-semibold shadow-[0_10px_30px_oklch(0.4_0.16_var(--ez-h)/0.35)]"
                  >
                    Buy now
                  </Link>
                </div>
                <div className="mt-4 grid gap-2 text-[11.5px] text-[#C7C7CC]">
                  {[
                    isDigital
                      ? "Instant digital delivery after payment"
                      : "Ships in 24–48h · Free delivery",
                    `${pct}% off on prepaid orders`,
                  ].map((line) => (
                    <div key={line} className="flex items-start gap-2">
                      <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-[var(--ez-accent)]" />
                      {line}
                    </div>
                  ))}
                </div>
                {added ? (
                  <button
                    type="button"
                    onClick={() => cart.openDrawer()}
                    className="mt-3 block w-full text-center text-[12px] font-semibold text-[var(--ez-accent)] underline underline-offset-2"
                  >
                    View cart →
                  </button>
                ) : null}
              </>
            )}
          </div>
        </aside>
      </section>

      <section className="ez-page w-full pt-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-[22px] border border-[#E8E8ED] bg-[#FAFAFB] px-5 py-4 sm:grid-cols-4 sm:px-7 sm:py-5">
          {[
            { t: "100% Genuine", s: "Sealed & authentic" },
            { t: "Secure checkout", s: "UPI · Cards · COD" },
            { t: "Fast delivery", s: "Ships in 24–48h" },
            { t: "Easy returns", s: "Hassle-free" },
          ].map((x) => (
            <div key={x.t} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#111113] text-white">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M5 12.5l4 4 10-10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-[13px] font-semibold text-[#111113]">{x.t}</span>
                <span className="text-[11px] text-[#86868B]">{x.s}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <ProductDetails descriptionHtml={description} />

      <RelatedProductsSection categorySlug={categorySlug} excludeKey={productKey} />

      <FooterFull />
    </div>
  );
}

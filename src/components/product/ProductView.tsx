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
import { useApiSettings } from "@/hooks/useApiSettings";
import type { ResolvedProduct } from "@/lib/productResolve";
import { useCart } from "@/lib/cart";
import { api } from "@/lib/apiClient";
import { categoryLabel } from "@/lib/categoryRoutes";

/** Wider than default storefront rails; keeps ez-page horizontal padding. */
const PDP_PAGE =
  "ez-page mx-auto w-full max-w-none xl:max-w-[1520px] 2xl:max-w-[1680px]";

const TRUST_ITEMS = [
  { t: "100% Genuine", s: "Sealed & authentic" },
  { t: "Secure checkout", s: "UPI · Cards · COD" },
  { t: "Fast delivery", s: "Ships in 24–48h" },
  { t: "Easy returns", s: "Hassle-free" },
] as const;

function TrustStrip({ compact = false }: { compact?: boolean }) {
  return (
    <ul
      className={
        compact
          ? "grid grid-cols-2 gap-px overflow-hidden rounded-[14px] bg-[#E8E8ED] sm:grid-cols-4"
          : "grid grid-cols-2 gap-px overflow-hidden rounded-[16px] bg-[#E8E8ED] sm:grid-cols-4"
      }
    >
      {TRUST_ITEMS.map((x) => (
        <li
          key={x.t}
          className={`flex items-start gap-2.5 bg-[#FAFAFB] ${compact ? "px-3 py-3 sm:px-3.5" : "px-4 py-3.5 sm:px-4"}`}
        >
          <span className="mt-0.5 flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full bg-[#111113] text-white">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 12.5l4 4 10-10"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className={`font-semibold text-[#111113] ${compact ? "text-[11px]" : "text-[12px]"}`}>
              {x.t}
            </span>
            <span className={`text-[#86868B] ${compact ? "text-[10px]" : "text-[10.5px]"}`}>{x.s}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function formatSavings(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function ProductView({
  productKey,
  initialProduct,
}: {
  productKey: string;
  initialProduct: ResolvedProduct | null;
}) {
  const settings = useLiveThemeSettings();
  // Tax copy must follow the store's actual setting, never a hardcoded claim.
  const { settings: storeSettings } = useApiSettings();
  const taxInclusive = storeSettings.taxInclusive;
  const releaseLabel = formatReleaseLabel(settings.releaseDate);
  const [added, setAdded] = useState(false);
  const cart = useCart();
  const resolved = initialProduct;

  /*
   * Every hook lives ABOVE the not-found guard below.
   *
   * These three and the analytics effect used to sit further down, after the
   * `if (!resolved) return` — so the number of hooks this component ran depended
   * on whether the product had resolved. React requires the same hooks in the
   * same order on every render, and the moment a product goes from unresolved to
   * resolved (or back, when a navigation swaps `initialProduct`) it throws
   * "Rendered fewer hooks than expected" and takes the page down.
   */
  const [notifyMobile, setNotifyMobile] = useState("");
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);
  const [notifySent, setNotifySent] = useState(false);

  // Read off `initialProduct` rather than the destructured values, which are only
  // available past the guard. Primitives in the dep array, not the object, so a
  // new object identity for the same product does not re-fire the event.
  const viewTitle = initialProduct?.title;
  const viewPrice = initialProduct?.priceValue;
  useEffect(() => {
    if (viewTitle === undefined || viewPrice === undefined) return;
    viewItem({ id: productKey, name: viewTitle, price: viewPrice });
  }, [productKey, viewTitle, viewPrice]);

  if (!resolved) {
    return (
      <div className="min-h-screen bg-white">
        <MicroBar />
        <Header active="preorders" />
        <main id="ez-main" className="ez-page py-20">
          <p className="text-sm text-[#B42318]" role="alert">
            Product not found
          </p>
          <Link href="/preorders" className="mt-4 inline-block text-sm font-semibold">
            ← Back to pre-orders
          </Link>
        </main>
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
    categoryHref,
    fulfillmentType,
  } = resolved;
  const discountPct =
    strike && priceValue
      ? Math.round((1 - priceValue / (Number(strike.replace(/[^\d]/g, "")) || priceValue)) * 100)
      : 0;
  const strikeValue = strike ? Number(strike.replace(/[^\d]/g, "")) : 0;
  const savingsAmount =
    strikeValue > 0 && priceValue != null && strikeValue > priceValue ? strikeValue - priceValue : 0;
  const showPercentBadge = discountPct >= 5;
  const showSubtleSavings = discountPct > 0 && discountPct < 5 && savingsAmount > 0;

  const isPreorder = fulfillmentType === "preorder";
  const isDigital = fulfillmentType === "digital";
  const isOutOfStock = !isPreorder && !isDigital && typeof stock === "number" && stock <= 0;

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

  // The five-branch ladder this replaces fell through to "preorders", so a
  // product in any other category lit up Pre-orders in the header. The mega menu
  // compares this against a category slug, so the slug IS the key.
  const navActive = categorySlug || "preorders";

  const statusLabel = isPreorder
    ? "Pre-order open"
    : isOutOfStock
      ? "Sold out"
      : "In stock";
  const statusDetail = isPreorder
    ? `Releases ${releaseLabel}`
    : isOutOfStock
      ? "Get notified"
      : isDigital
        ? "Instant delivery"
        : "Ready to ship";

  return (
    <div className="min-h-screen bg-[#FAFAFB]">
      <MicroBar />
      <Header active={navActive} />

      {/* The PDP rendered no <main> at all, so it had no landmark to skip to. */}
      <main id="ez-main">

      <div className="border-b border-[#E8E8ED]/80 bg-white">
        <div className={`${PDP_PAGE} flex w-full flex-wrap items-center gap-x-2 gap-y-1 py-3 sm:py-3.5`}>
          <nav
            aria-label="Breadcrumb"
            className="ez-mono flex min-w-0 flex-wrap items-center gap-x-2 text-[9px] uppercase tracking-[0.14em] text-[#86868B] sm:text-[10px]"
          >
            <Link href="/" className="transition-colors hover:text-[#1D1D1F]">
              Home
            </Link>
            <span aria-hidden className="text-[#D1D1D6]">
              /
            </span>
            {/* Three bugs here. `/${categorySlug}` sent every category outside
                the five hand-written routes to a 404 (/holiday-sale); the label
                printed the raw slug ("game-cards", not "Game cards"); and a
                category with no page still got a link. The server decides
                whether there is a page — same `listable` column the route reads —
                so this is plain text when there is not. */}
            {categoryHref ? (
              <Link
                href={categoryHref}
                className="transition-colors hover:text-[#1D1D1F]"
              >
                {categoryLabel(categorySlug)}
              </Link>
            ) : (
              <span>{categoryLabel(categorySlug)}</span>
            )}
            <span aria-hidden className="text-[#D1D1D6]">
              /
            </span>
            <span className="truncate text-[#1D1D1F]">{title}</span>
          </nav>
        </div>
      </div>

      <section
        className={`${PDP_PAGE} grid w-full grid-cols-1 items-stretch gap-5 pb-6 pt-5 sm:gap-6 sm:pb-8 sm:pt-7 lg:grid-cols-[minmax(0,0.85fr)_minmax(400px,1.15fr)] lg:gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(440px,1.2fr)] xl:gap-5`}
      >
        <div className="flex min-w-0 h-full flex-col justify-center lg:justify-start">
          <ProductGallery images={images} alt={title} badges={badges} />
        </div>

        <aside className="flex min-w-0 h-full flex-col">
          <div className="flex h-full flex-col overflow-hidden rounded-[22px] border border-[#E3E3E8] bg-white shadow-[0_14px_44px_rgba(17,17,19,0.05)] sm:rounded-[24px]">
            <div className="border-b border-[var(--ez-accent-panel-border)] bg-[var(--ez-accent-panel)] px-5 py-3 sm:px-6 sm:py-3.5">
              <div className="ez-mono flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[9px] font-bold uppercase tracking-[0.16em] sm:text-[10px]">
                <span className="inline-flex items-center gap-2 text-[var(--ez-accent-text)]">
                  <span className="relative flex h-2 w-2">
                    {!isOutOfStock ? (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--ez-accent)] opacity-35" />
                    ) : null}
                    <span
                      className={`relative inline-flex h-2 w-2 rounded-full ${
                        isOutOfStock ? "bg-[#AEAEB2]" : "bg-[var(--ez-accent)]"
                      }`}
                    />
                  </span>
                  {statusLabel}
                </span>
                <span className="text-[#C7C7CC]">·</span>
                <span className="font-medium text-[#6E6E73]">{statusDetail}</span>
              </div>
            </div>

            <div className="flex flex-col gap-0 px-5 py-5 sm:px-6 sm:py-6">
              <div className="space-y-2.5 sm:space-y-3">
                <p className="ez-mono text-[9px] uppercase tracking-[0.18em] text-[#86868B]">{brand}</p>
                <h1 className="m-0 text-[clamp(1.65rem,3vw,2.5rem)] font-bold leading-[1.04] tracking-[-0.042em] text-[#111113]">
                  {title}
                </h1>
                <p className="mt-3 mb-4 line-clamp-3 text-[14px] leading-[1.55] text-[#6E6E73] sm:mt-3.5 sm:mb-5 sm:text-[15px]">
                  {description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}
                </p>
              </div>

              <div className="mt-5 border-t border-[#E8E8ED] pt-5 sm:mt-6 sm:pt-6">
                <div className="flex flex-wrap items-end gap-x-3 gap-y-1.5">
                  <span className="text-[clamp(1.65rem,2.8vw,2.125rem)] font-bold leading-none tracking-[-0.04em] text-[#111113]">
                    {price}
                  </span>
                  {strike ? (
                    <span className="ez-mono pb-0.5 text-[13px] text-[#AEAEB2] line-through sm:text-[14px]">
                      {strike}
                    </span>
                  ) : null}
                  {showPercentBadge ? (
                    <span className="mb-0.5 rounded-full bg-[#E5484D] px-2 py-[3px] text-[9px] font-bold uppercase tracking-[0.12em] text-white">
                      {discountPct}% off
                    </span>
                  ) : showSubtleSavings ? (
                    <span className="ez-mono mb-0.5 text-[11px] font-semibold text-[var(--ez-in-stock)] sm:text-[12px]">
                      Save {formatSavings(savingsAmount)}
                    </span>
                  ) : !strike ? (
                    <span className="ez-mono mb-0.5 rounded-full bg-[var(--ez-accent-soft)] px-2 py-[3px] text-[8px] font-bold uppercase tracking-[0.13em] text-[var(--ez-accent-soft-text)]">
                      Price locked
                    </span>
                  ) : null}
                </div>
                {/* Driven by the store's tax setting, not hardcoded. This read
                    "Inclusive of all taxes" while checkout added 18% GST on
                    top — two screens in one funnel making opposite tax claims,
                    which in India is a Legal Metrology exposure, not just a UX
                    slip. Prices are inclusive by default now, so the claim is
                    true; if the setting is ever flipped, the copy follows. */}
                <p className="mt-1.5 text-[11px] text-[#86868B]">
                  {taxInclusive ? "Inclusive of all taxes" : "Excludes GST · added at checkout"}
                </p>
              </div>
            </div>

            <div className="mt-auto">
              <div className="bg-[#1D1D1F] px-5 py-5 text-white sm:px-6 sm:py-5">
              {isPreorder ? (
                <>
                  <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-white/10 pb-4">
                    <span className="ez-mono text-[9px] uppercase tracking-[0.15em] text-[#A1A1A6]">
                      Release countdown
                    </span>
                    <CountdownInline />
                  </div>
                  <Link
                    href={`/checkout/${encodeURIComponent(productKey)}`}
                    className="ez-btn-primary flex min-h-[52px] w-full items-center justify-center rounded-full px-5 text-center text-[15px] font-semibold shadow-[0_8px_28px_oklch(0.4_0.16_var(--ez-h)/0.38)] transition hover:brightness-105 active:scale-[0.98]"
                  >
                    Pre-order now · ₹0 today
                  </Link>
                  <div className="mt-3.5 text-[11px] leading-snug text-[#C7C7CC] sm:text-[11.5px]">
                    <div className="flex items-start gap-2">
                      <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-[var(--ez-accent)]" />
                      Charged only when your order ships
                    </div>
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
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      aria-label="Add to cart"
                      className="flex min-h-[52px] items-center justify-center rounded-full border border-white/30 px-4 text-center text-[15px] font-semibold text-white transition hover:border-white/50 hover:bg-white/10 active:scale-[0.98]"
                    >
                      {added ? "Added ✓" : "Add to cart"}
                    </button>
                    <Link
                      href={`/checkout/${encodeURIComponent(productKey)}`}
                      className="ez-btn-primary flex min-h-[52px] items-center justify-center rounded-full px-4 text-center text-[15px] font-semibold shadow-[0_8px_28px_oklch(0.4_0.16_var(--ez-h)/0.38)] transition hover:brightness-105 active:scale-[0.98]"
                    >
                      Buy now
                    </Link>
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

              <div className="border-t border-[#E8E8ED] bg-[#FAFAFB] px-4 py-4 sm:px-5 sm:py-4">
                <TrustStrip compact />
              </div>
            </div>
          </div>
        </aside>
      </section>

      <ProductDetails descriptionHtml={description} />

      <RelatedProductsSection categorySlug={categorySlug} excludeKey={productKey} />

      </main>

      <FooterFull />
    </div>
  );
}

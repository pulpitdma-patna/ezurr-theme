"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { MicroBar } from "@/components/layout/MicroBar";
import { Header } from "@/components/layout/Header";
import { FooterFull } from "@/components/layout/Footer";
import { CountdownInline } from "@/components/ui/Countdown";
import { RelatedProductsSection } from "@/components/product/RelatedProductsSection";

const productImages = [
  {
    src: "https://ezurr.com/cdn/shop/files/GAMPLAY540.jpg?v=1782735956&width=533",
    alt: "Grand Theft Auto VI PlayStation 5 box art",
  },
  {
    src: "https://ezurr.com/cdn/shop/files/GAMPLAY540_1.jpg?v=1782735942&width=533",
    alt: "Grand Theft Auto VI game artwork",
  },
  {
    src: "https://ezurr.com/cdn/shop/files/GTA6_banner.webp?v=1783232356&width=800",
    alt: "Grand Theft Auto VI promotional banner",
  },
];

export default function ProductPage() {
  const [selectedDisc, setSelectedDisc] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  return (
    <div className="min-h-screen bg-white">
      <MicroBar />
      <Header active="preorders" />

      <div className="ez-page ez-mono flex w-full flex-wrap gap-2 pt-4 text-[9px] uppercase tracking-[0.14em] text-[#86868B] sm:gap-2.5 sm:pt-6 sm:text-[10px]">
        <Link href="/" className="hover:text-[#1D1D1F]">
          Home
        </Link>
        <span>/</span>
        <Link href="/games" className="hover:text-[#1D1D1F]">
          PS5 Games
        </Link>
        <span>/</span>
        <span className="text-[#1D1D1F]">Grand Theft Auto VI</span>
      </div>

      <section className="ez-page grid w-full grid-cols-1 items-start gap-8 pb-4 pt-5 sm:gap-10 sm:pt-7 lg:grid-cols-[minmax(0,1.3fr)_minmax(390px,0.7fr)] lg:gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(430px,0.55fr)] xl:gap-12">
        <div className="min-w-0">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[76px_minmax(0,1fr)] sm:gap-4 xl:grid-cols-[88px_minmax(0,1fr)] xl:gap-5">
            <div className="order-2 flex gap-2.5 overflow-x-auto pb-1 sm:order-1 sm:flex-col sm:overflow-visible sm:pb-0">
              {productImages.map((image, index) => (
                <button
                  type="button"
                  key={image.src}
                  onClick={() => setSelectedImage(index)}
                  aria-label={`View product image ${index + 1}`}
                  aria-pressed={selectedImage === index}
                  className={`relative aspect-square w-[72px] shrink-0 cursor-pointer overflow-hidden rounded-2xl border bg-white transition-all sm:w-full ${
                    selectedImage === index
                      ? "border-[var(--ez-accent)] shadow-[0_0_0_2px_var(--ez-accent-soft)]"
                      : "border-[#E3E3E8] opacity-70 hover:border-[#AEAEB2] hover:opacity-100"
                  }`}
                >
                  <Image
                    src={image.src}
                    alt=""
                    fill
                    className="object-contain p-1.5"
                    sizes="88px"
                  />
                </button>
              ))}
            </div>

            <div className="relative order-1 aspect-[4/3.35] min-h-[340px] overflow-hidden rounded-[24px] border border-[#E8E8ED] bg-[radial-gradient(circle_at_50%_35%,#ffffff_0%,#f8f8fa_62%,#f0f0f3_100%)] sm:order-2 sm:min-h-[520px] sm:rounded-[32px] lg:sticky lg:top-[96px] xl:min-h-[620px]">
              <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-3 py-2 shadow-sm backdrop-blur-md sm:left-6 sm:top-6">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--ez-accent)]" />
                <span className="ez-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#424245]">
                  Official India edition
                </span>
              </div>
              <Image
                src={productImages[selectedImage].src}
                alt={productImages[selectedImage].alt}
                fill
                className="object-contain p-5 transition-opacity duration-300 sm:p-10 xl:p-14"
                sizes="(min-width: 1024px) 58vw, 100vw"
                priority
              />
              <div className="absolute bottom-4 right-4 rounded-full border border-white/80 bg-white/85 px-3 py-2 shadow-sm backdrop-blur-md sm:bottom-6 sm:right-6">
                <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#6E6E73]">
                  Image {selectedImage + 1} / {productImages.length}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 divide-x divide-[#E3E3E8] rounded-2xl border border-[#E8E8ED] bg-white px-2 py-4 sm:mt-6 sm:px-4">
            {[
              ["Free delivery", "Across India"],
              ["Secure preorder", "Pay ₹0 today"],
              ["Easy cancellation", "Until dispatch"],
            ].map(([title, text]) => (
              <div key={title} className="min-w-0 px-2 text-center sm:px-4">
                <div className="text-[11px] font-semibold text-[#1D1D1F] sm:text-[13px]">
                  {title}
                </div>
                <div className="ez-mono mt-1 text-[8px] uppercase tracking-[0.1em] text-[#86868B] sm:text-[9px]">
                  {text}
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="overflow-hidden rounded-[28px] border border-[#E3E3E8] bg-white shadow-[0_24px_70px_rgba(17,17,19,0.09)] lg:sticky lg:top-[96px]">
          <div className="flex flex-col gap-5 p-5 sm:p-7 xl:p-8">
            <div className="ez-mono flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--ez-accent-text)] sm:text-[10px]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--ez-accent)] opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--ez-accent)]" />
              </span>
              Pre-order open
              <span className="text-[#AEAEB2]">·</span>
              <span className="text-[#6E6E73]">Releases Nov 19, 2026</span>
            </div>

            <div>
              <p className="ez-mono mb-2 text-[9px] uppercase tracking-[0.18em] text-[#86868B]">
                Rockstar Games
              </p>
              <h1 className="m-0 text-[clamp(2.25rem,4vw,4.25rem)] font-bold leading-[0.94] tracking-[-0.055em] text-[#111113]">
                Grand Theft Auto VI
              </h1>
              <p className="mt-4 text-[15px] leading-relaxed text-[#6E6E73] sm:text-base">
                Standard Edition for PlayStation 5. Physical disc, region India.
              </p>
            </div>

            <div className="flex items-end justify-between gap-4 border-y border-[#E8E8ED] py-5">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[30px] font-bold leading-none tracking-[-0.04em] sm:text-[36px]">
                    ₹5,999
                  </span>
                  <span className="ez-mono rounded-full bg-[var(--ez-accent-soft)] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.13em] text-[var(--ez-accent-soft-text)]">
                    Price locked
                  </span>
                </div>
                <p className="mt-2 text-xs text-[#86868B]">Inclusive of all taxes</p>
              </div>
              <span className="ez-mono shrink-0 text-[9px] uppercase tracking-[0.12em] text-[#6E6E73]">
                COD eligible
              </span>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">Choose platform</span>
                <span className="ez-mono text-[9px] uppercase tracking-[0.12em] text-[#86868B]">
                  1 option
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSelectedDisc(true)}
                  aria-pressed={selectedDisc}
                  className={`relative flex cursor-pointer flex-col gap-1 rounded-2xl border-[1.5px] p-4 text-left transition-all ${
                    selectedDisc
                      ? "border-[var(--ez-accent)] bg-[var(--ez-accent-panel)] shadow-[0_0_0_2px_var(--ez-accent-soft)]"
                      : "border-[#D2D2D7] bg-white"
                  }`}
                >
                  <span className="text-[14px] font-semibold">PS5 · Disc</span>
                  <span className="ez-mono text-[10px] text-[#6E6E73]">Standard edition</span>
                  <span className="absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--ez-accent)] text-[10px] text-white">
                    ✓
                  </span>
                </button>
                <div
                  aria-disabled="true"
                  className="flex cursor-not-allowed flex-col gap-1 rounded-2xl border-[1.5px] border-dashed border-[#D2D2D7] bg-[#FAFAFB] p-4 opacity-65"
                >
                  <span className="text-[14px] font-semibold text-[#86868B]">
                    Switch 2 · Disc
                  </span>
                  <span className="ez-mono text-[10px] text-[#AEAEB2]">Coming soon</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--ez-accent-panel-border)] bg-[var(--ez-accent-panel)] p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--ez-accent-soft)] text-xs font-bold text-[var(--ez-accent-soft-text)]">
                  ↓
                </span>
                <span className="ez-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--ez-accent-soft-text)]">
                  Minimum price guarantee
                </span>
              </div>
              <p className="m-0 text-[12.5px] leading-relaxed text-[#424245]">
                If our price drops before release, you automatically get the lower
                price. No forms, no asking.
              </p>
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
              href="/checkout"
              className="ez-btn-primary flex min-h-14 w-full items-center justify-center rounded-full px-5 text-center text-[15px] font-semibold shadow-[0_10px_30px_oklch(0.4_0.16_var(--ez-h)/0.35)]"
            >
              Pre-order now · ₹0 today
            </Link>
            <Link
              href="#alert"
              className="mt-2.5 flex min-h-12 w-full items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-5 text-center text-[13px] font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
            >
              Set a price-drop alert
            </Link>
            <div className="mt-4 grid gap-2 text-[11.5px] text-[#C7C7CC]">
              {[
                "Charged only when your order ships",
                "10% off prepaid orders · Cancel before dispatch",
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

      <RelatedProductsSection />

      <section className="ez-page ez-section mx-auto pb-8">
        <div className="flex flex-col gap-8 rounded-2xl bg-[#1D1D1F] px-5 py-8 sm:gap-10 sm:rounded-[28px] sm:px-10 sm:py-12 lg:px-16 lg:py-14">
          <div className="flex flex-col gap-2 sm:gap-2.5">
            <div className="ez-mono text-[10px] uppercase tracking-[0.16em] text-[oklch(0.78_0.1_var(--ez-h))] sm:text-[11px]">
              How the guarantee works
            </div>
            <h2 className="ez-h2 m-0 max-w-[520px] font-bold text-[#F5F5F7]">
              You&apos;ll never overpay for a pre-order. Ever.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            {[
              [
                "01",
                "Lock your price",
                "Reserve at today's price. Nothing is charged until dispatch.",
              ],
              [
                "02",
                "We watch the price",
                "Our tracker checks your item daily until release day.",
              ],
              [
                "03",
                "Difference refunded",
                "If it drops, you're charged the lower price. Automatically.",
              ],
            ].map(([num, title, text]) => (
              <div
                key={num}
                className="flex flex-col gap-2.5 border-t border-[#38383D] pt-[18px]"
              >
                <span className="ez-mono text-xs text-[oklch(0.78_0.1_var(--ez-h))]">
                  {num}
                </span>
                <span className="text-base font-semibold text-[#F5F5F7]">{title}</span>
                <p className="m-0 text-[13.5px] leading-relaxed text-[#A1A1A6]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FooterFull />
    </div>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { MicroBar } from "@/components/layout/MicroBar";
import { Header } from "@/components/layout/Header";
import { FooterFull } from "@/components/layout/Footer";
import { CountdownInline } from "@/components/ui/Countdown";
import { RelatedProductsSection } from "@/components/product/RelatedProductsSection";

export default function ProductPage() {
  const [selectedDisc, setSelectedDisc] = useState(true);

  return (
    <div className="min-h-screen bg-white">
      <MicroBar />
      <Header active="preorders" />

      <div className="ez-page w-full pt-4 ez-mono flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.1em] text-[#86868B] sm:gap-2.5 sm:pt-6 sm:text-[10.5px]">
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

      <section className="ez-page w-full grid grid-cols-1 items-start gap-8 pt-5 sm:gap-12 sm:pt-7 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <div className="flex flex-col gap-3.5">
          <div className="relative aspect-[4/3.2] overflow-hidden rounded-3xl border border-[#E8E8ED] bg-white">
            <Image
              src="https://ezurr.com/cdn/shop/files/GAMPLAY540.jpg?v=1782735956&width=533"
              alt="Grand Theft Auto VI box art"
              fill
              className="object-contain"
              sizes="50vw"
              priority
            />
          </div>
          <div className="grid grid-cols-3 gap-3.5">
            {[
              "https://ezurr.com/cdn/shop/files/GAMPLAY540_1.jpg?v=1782735942&width=533",
              "https://ezurr.com/cdn/shop/files/GTA6_banner.webp?v=1783232356&width=800",
            ].map((src) => (
              <div
                key={src}
                className="relative aspect-[4/3] overflow-hidden rounded-[14px] border border-[#E8E8ED] bg-white"
              >
                <Image src={src} alt="" fill className="object-contain" sizes="15vw" />
              </div>
            ))}
            <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-[#F5F5F7]" />
          </div>
        </div>

        <div className="flex flex-col gap-[18px] lg:sticky lg:top-[100px] lg:gap-[22px]">
          <div className="ez-mono flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[var(--ez-accent-text)] sm:gap-2.5 sm:text-[11px]">
            <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--ez-accent)]" />
            Pre-order · Releases Nov 19, 2026
          </div>

          <div className="flex flex-col gap-2.5">
            <h1 className="ez-h1 m-0 font-bold">Grand Theft Auto VI</h1>
            <p className="ez-lead m-0 text-[#6E6E73]">
              Standard Edition for PlayStation 5. Physical disc, region India.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3.5">
            <span className="text-2xl font-bold tracking-[-0.02em] sm:text-[32px]">₹5,999</span>
            <span className="ez-mono rounded-full bg-[var(--ez-accent-soft)] px-[11px] py-1.5 text-[10px] uppercase tracking-[0.12em] text-[var(--ez-accent-soft-text)]">
              Price locked
            </span>
            <span className="ez-mono text-[10px] uppercase tracking-[0.12em] text-[#86868B]">
              COD eligible
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setSelectedDisc(true)}
              className="flex cursor-pointer flex-col gap-1 rounded-[14px] border-[1.5px] p-4 text-left transition-colors"
              style={{
                borderColor: selectedDisc ? "var(--ez-accent)" : "#D2D2D7",
                background: selectedDisc ? "var(--ez-accent-panel)" : "#FFFFFF",
              }}
            >
              <span className="text-[15px] font-semibold">PS5 · Disc</span>
              <span className="ez-mono text-xs text-[#6E6E73]">Standard Edition</span>
            </button>
            <div className="flex cursor-not-allowed flex-col gap-1 rounded-[14px] border-[1.5px] border-dashed border-[#D2D2D7] bg-white p-4 opacity-70">
              <span className="text-[15px] font-semibold text-[#86868B]">
                Switch 2 · Disc
              </span>
              <span className="ez-mono text-xs text-[#AEAEB2]">Notify me</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 rounded-2xl border border-[var(--ez-accent-panel-border)] bg-[var(--ez-accent-panel)] px-5 py-[18px]">
            <div className="ez-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ez-accent-soft-text)]">
              Minimum price guarantee
            </div>
            <p className="m-0 text-[13.5px] leading-relaxed text-[#424245]">
              Your price is locked at ₹5,999. If our price drops before release
              day, we automatically refund you the difference — no forms, no asking.
            </p>
          </div>

          <div className="flex items-baseline gap-2.5 ez-mono">
            <span className="text-[10.5px] uppercase tracking-[0.14em] text-[#86868B]">
              Releases in
            </span>
            <CountdownInline />
          </div>

          <div className="flex flex-col gap-2.5">
            <Link
              href="/checkout"
              className="ez-btn-primary rounded-full py-[17px] text-center text-[15.5px] font-semibold"
            >
              Pre-order now — ₹5,999
            </Link>
            <Link
              href="#alert"
              className="ez-btn-outline rounded-full border border-[#D2D2D7] py-[15px] text-center text-[14.5px] font-semibold transition-colors"
            >
              Set a price-drop alert
            </Link>
          </div>

          <div className="flex flex-col gap-2 pt-1 text-[13px] text-[#6E6E73]">
            {[
              "Pay ₹0 today — charged when it ships",
              "10% off on prepaid orders · COD under ₹10,000",
              "Cancel anytime before dispatch",
            ].map((line) => (
              <div key={line} className="flex items-center gap-2">
                <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-[#AEAEB2]" />
                {line}
              </div>
            ))}
          </div>
        </div>
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

"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CountdownBoxes } from "@/components/ui/Countdown";

const slides = [
  {
    id: "gta",
    badge: "Pre-order · PS5 · Releases Nov 19",
    badgeColor: "accent" as const,
    title: "Grand Theft Auto VI.",
    subtitle: "Reserved, price locked.",
    price: "₹5,999",
    tags: ["Price locked", "COD available"],
    primaryCta: { label: "Pre-order now", href: "/checkout" },
    secondaryCta: { label: "View details", href: "/product" },
    showCountdown: true,
    image: "https://ezurr.com/cdn/shop/files/GTA6_banner.webp?v=1783232356&width=1200",
    imageFit: "cover" as const,
    imageBg: "#F5F5F7",
    bordered: false,
  },
  {
    id: "wolverine",
    badge: "Pre-order · PS5 exclusive",
    badgeColor: "accent" as const,
    title: "Marvel's Wolverine.",
    subtitle: "The claws come out.",
    price: "₹5,499",
    tags: ["Price locked", "COD available"],
    primaryCta: { label: "Pre-order now", href: "/checkout" },
    secondaryCta: { label: "View details", href: "/product" },
    showCountdown: false,
    image: "https://ezurr.com/cdn/shop/files/PREPLAY346.jpg?v=1773153102&width=533",
    imageFit: "contain" as const,
    imageBg: "#FFFFFF",
    bordered: true,
  },
  {
    id: "switch2",
    badge: "In stock · Ships in 24 hrs",
    badgeColor: "green" as const,
    title: "Nintendo Switch 2.",
    subtitle: "Play has no home.",
    price: "₹65,000",
    strike: "₹74,490",
    saveTag: "Save ₹9,490",
    primaryCta: { label: "Add to bag", href: "/checkout" },
    secondaryCta: { label: "View details", href: "/product" },
    showCountdown: false,
    image: "https://ezurr.com/cdn/shop/files/CONSNIN130_1.jpg?v=1772613150&width=533",
    imageFit: "contain" as const,
    imageBg: "#FFFFFF",
    bordered: true,
  },
];

export function HeroSlider() {
  const [slide, setSlide] = useState(0);
  const total = slides.length;

  const go = useCallback(
    (i: number) => setSlide(((i % total) + total) % total),
    [total],
  );

  useEffect(() => {
    const id = setInterval(() => go(slide + 1), 6000);
    return () => clearInterval(id);
  }, [slide, go]);

  return (
    <section className="relative overflow-hidden border-b border-[#E8E8ED] bg-[#F5F5F7] pb-12 md:pb-0">
      <div
        className="flex transition-transform duration-[650ms] ease-[cubic-bezier(0.3,0.8,0.3,1)]"
        style={{ transform: `translateX(-${slide * 100}%)` }}
      >
        {slides.map((s) => (
          <div key={s.id} className="min-w-0 shrink-0 grow-0 basis-full">
            <div className="mx-auto grid grid-cols-1 items-center gap-8 px-4 py-10 sm:gap-10 sm:px-6 sm:py-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:px-12 lg:pb-[84px] lg:pt-[60px] xl:px-24">
              {/* Image first on mobile for visual impact */}
              <div
                className={`relative order-1 aspect-[4/3.1] overflow-hidden rounded-2xl sm:rounded-[28px] lg:order-2 ${
                  s.bordered ? "border border-[#E8E8ED]" : ""
                }`}
                style={{ background: s.imageBg }}
              >
                <Image
                  src={s.image}
                  alt={s.title}
                  fill
                  className={s.imageFit === "contain" ? "object-contain" : "object-cover"}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority={s.id === "gta"}
                />
              </div>

              <div className="order-2 flex flex-col gap-4 sm:gap-6 lg:order-1">
                <div
                  className={`ez-mono flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] sm:text-[11px] ${
                    s.badgeColor === "green"
                      ? "text-[#3D7A4E]"
                      : "text-[var(--ez-accent-text)]"
                  }`}
                >
                  <span
                    className={`h-[7px] w-[7px] shrink-0 rounded-full ${
                      s.badgeColor === "green"
                        ? "bg-[#3D7A4E]"
                        : "bg-[var(--ez-accent)]"
                    }`}
                  />
                  {s.badge}
                </div>
                <h1 className="ez-display m-0 font-bold">
                  {s.title}
                  <br />
                  <span className="font-medium text-[#86868B]">{s.subtitle}</span>
                </h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3.5">
                  <span className="text-2xl font-bold tracking-[-0.02em] sm:text-[30px]">
                    {s.price}
                  </span>
                  {"strike" in s && s.strike && (
                    <span className="ez-mono text-sm text-[#AEAEB2] line-through sm:text-[15px]">
                      {s.strike}
                    </span>
                  )}
                  {"saveTag" in s && s.saveTag && (
                    <span className="ez-mono rounded-full bg-[var(--ez-accent-soft)] px-[11px] py-1.5 text-[10px] uppercase tracking-[0.12em] text-[var(--ez-accent-soft-text)]">
                      {s.saveTag}
                    </span>
                  )}
                  {"tags" in s &&
                    s.tags?.map((tag) => (
                      <span
                        key={tag}
                        className={`ez-mono text-[10px] uppercase tracking-[0.12em] ${
                          tag === "Price locked"
                            ? "rounded-full bg-[var(--ez-accent-soft)] px-[11px] py-1.5 text-[var(--ez-accent-soft-text)]"
                            : "text-[#86868B]"
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                </div>
                <div className="ez-cta-row">
                  <Link
                    href={s.primaryCta.href}
                    className="ez-btn-primary inline-flex rounded-full px-6 py-3.5 text-[15px] font-semibold sm:px-[30px] sm:py-[15px]"
                  >
                    {s.primaryCta.label}
                  </Link>
                  <Link
                    href={s.secondaryCta.href}
                    className="ez-btn-outline inline-flex rounded-full border border-[#D2D2D7] px-6 py-3.5 text-[15px] font-semibold transition-colors sm:px-[26px] sm:py-[15px]"
                  >
                    {s.secondaryCta.label}
                  </Link>
                </div>
                {s.showCountdown && (
                  <div className="mt-1">
                    <CountdownBoxes />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="Previous slide"
        onClick={() => go(slide - 1)}
        className="absolute left-2 top-[38%] hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#D2D2D7] bg-white/90 text-lg text-[#424245] transition-colors hover:border-[#1D1D1F] hover:text-[#1D1D1F] md:flex md:h-11 md:w-11 lg:left-5 lg:top-1/2"
      >
        ←
      </button>
      <button
        type="button"
        aria-label="Next slide"
        onClick={() => go(slide + 1)}
        className="absolute right-2 top-[38%] hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#D2D2D7] bg-white/90 text-lg text-[#424245] transition-colors hover:border-[#1D1D1F] hover:text-[#1D1D1F] md:flex md:h-11 md:w-11 lg:right-5 lg:top-1/2"
      >
        →
      </button>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 md:bottom-[26px]">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => go(i)}
            className="h-[7px] rounded-full transition-all duration-300"
            style={{
              width: slide === i ? 22 : 7,
              background: slide === i ? "var(--ez-accent)" : "#D2D2D7",
            }}
          />
        ))}
      </div>
    </section>
  );
}

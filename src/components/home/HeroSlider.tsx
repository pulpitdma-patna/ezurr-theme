"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CountdownSummaryPanel } from "@/components/ui/Countdown";

const slides = [
  {
    id: "gta",
    title: "Grand Theft Auto VI.",
    subtitle: "Reserved, price locked.",
    price: "₹5,999",
    tags: ["Price locked", "COD available"],
    primaryCta: { label: "Pre-order now", href: "/checkout" },
    secondaryCta: { label: "View details", href: "/product" },
    showCountdown: true,
    image: "/images/hero-neon-coast.png",
    imagePosition: "68% 22%",
    backdrop: "#11151b",
  },
  {
    id: "wolverine",
    title: "Marvel's Wolverine.",
    subtitle: "The claws come out.",
    price: "₹5,499",
    tags: ["Price locked", "COD available"],
    primaryCta: { label: "Pre-order now", href: "/checkout" },
    secondaryCta: { label: "View details", href: "/product" },
    showCountdown: false,
    image: "/images/hero-wild-crimson.png",
    imagePosition: "78% 30%",
    backdrop: "#120e12",
  },
  {
    id: "switch2",
    title: "Nintendo Switch 2.",
    subtitle: "Play has no home.",
    price: "₹65,000",
    strike: "₹74,490",
    saveTag: "Save ₹9,490",
    primaryCta: { label: "Add to bag", href: "/checkout" },
    secondaryCta: { label: "View details", href: "/product" },
    showCountdown: false,
    image: "/images/hero-handheld-cyan.png",
    imagePosition: "72% 35%",
    backdrop: "#07161b",
  },
];

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={direction === "left" ? "rotate-180" : ""}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function HeroSlider() {
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = slides.length;

  const go = useCallback(
    (i: number) => setSlide(((i % total) + total) % total),
    [total],
  );

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setSlide((current) => (current + 1) % total), 6500);
    return () => clearInterval(id);
  }, [paused, total]);

  return (
    <section
      className="relative overflow-hidden bg-[#08090b]"
      aria-roledescription="carousel"
      aria-label="Featured products"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <p className="sr-only" aria-live="polite">
        Slide {slide + 1} of {total}: {slides[slide].title}
      </p>
      <div
        className="flex transition-transform duration-700 ease-[cubic-bezier(0.3,0.8,0.3,1)] motion-reduce:transition-none"
        style={{ transform: `translateX(-${slide * 100}%)` }}
      >
        {slides.map((s, index) => (
          <article
            key={s.id}
            className="relative h-[580px] min-w-0 shrink-0 grow-0 basis-full overflow-hidden sm:h-[620px] lg:h-[680px] xl:h-[720px] 2xl:h-[760px]"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${total}`}
            aria-hidden={slide !== index}
            style={{ backgroundColor: s.backdrop }}
          >
            <Image
              src={s.image}
              alt=""
              fill
              className="object-cover"
              style={{ objectPosition: s.imagePosition }}
              sizes="100vw"
              priority={index === 0}
            />

            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,4,7,0.94)_0%,rgba(3,4,7,0.78)_39%,rgba(3,4,7,0.18)_76%,rgba(3,4,7,0.32)_100%)] sm:bg-[linear-gradient(90deg,rgba(3,4,7,0.95)_0%,rgba(3,4,7,0.74)_42%,rgba(3,4,7,0.08)_78%,rgba(3,4,7,0.22)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(3,4,7,0.78)_0%,transparent_42%,rgba(3,4,7,0.06)_100%)]" />
            <div className="absolute inset-x-0 top-0 h-px bg-white/15" />

            <div className="ez-page relative z-10 flex h-full w-full items-start pb-24 pt-10 sm:items-center sm:pb-20 sm:pt-6">
              <div className="flex w-full max-w-[720px] flex-col gap-3.5 text-white sm:gap-4">
                <h1 className="m-0 max-w-[720px] text-[clamp(2.4rem,6vw,4.8rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-white">
                  {s.title}
                  <br />
                  <span className="text-[0.72em] font-medium leading-[1.05] tracking-[-0.045em] text-white/58">
                    {s.subtitle}
                  </span>
                </h1>
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5">
                  <span className="text-2xl font-bold tracking-[-0.03em] text-white sm:text-[30px]">
                    {s.price}
                  </span>
                  {"strike" in s && s.strike && (
                    <span className="ez-mono text-xs text-white/45 line-through sm:text-sm">
                      {s.strike}
                    </span>
                  )}
                  {"saveTag" in s && s.saveTag && (
                    <span className="ez-mono rounded-full border border-[#73e798]/25 bg-[#73e798]/15 px-3 py-1.5 text-[9px] uppercase tracking-[0.12em] text-[#9df2b8]">
                      {s.saveTag}
                    </span>
                  )}
                  {"tags" in s &&
                    s.tags?.map((tag) => (
                      <span
                        key={tag}
                        className={`ez-mono text-[9px] uppercase tracking-[0.12em] sm:text-[10px] ${
                          tag === "Price locked"
                            ? "rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-white/80"
                            : "text-white/55"
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                </div>
                <div className="mt-1 flex w-full flex-col gap-3 min-[480px]:w-auto min-[480px]:flex-row min-[480px]:flex-wrap">
                  <Link
                    href={s.primaryCta.href}
                    tabIndex={slide === index ? 0 : -1}
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 py-3 text-[14px] font-semibold text-[#0b0c0f] shadow-[0_12px_32px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 hover:bg-white hover:!text-[#0b0c0f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    {s.primaryCta.label}
                  </Link>
                  <Link
                    href={s.secondaryCta.href}
                    tabIndex={slide === index ? 0 : -1}
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 bg-white/10 px-7 py-3 text-[14px] font-semibold text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:border-white/45 hover:bg-white/15 hover:!text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    {s.secondaryCta.label}
                  </Link>
                </div>
                {s.showCountdown && (
                  <div className="mt-1 max-w-[370px]">
                    <CountdownSummaryPanel />
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-6 z-20 sm:bottom-8">
        <div className="ez-page flex w-full items-center justify-between">
          <div className="flex items-center gap-2" role="tablist" aria-label="Choose featured product">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={slide === i}
              aria-label={`Show slide ${i + 1}: ${s.title}`}
              onClick={() => go(i)}
              className="group flex h-11 items-center justify-center px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span
                className={`block h-1 rounded-full transition-all duration-300 ${
                  slide === i ? "w-8 bg-white" : "w-3 bg-white/35 group-hover:bg-white/65"
                }`}
              />
            </button>
          ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => go(slide - 1)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/25 text-white backdrop-blur-md transition hover:border-white/40 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <ArrowIcon direction="left" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => go(slide + 1)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/25 text-white backdrop-blur-md transition hover:border-white/40 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <ArrowIcon direction="right" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

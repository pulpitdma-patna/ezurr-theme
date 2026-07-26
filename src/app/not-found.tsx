import type { Metadata } from "next";
import Link from "next/link";
import { MicroBar } from "@/components/layout/MicroBar";
import { Header } from "@/components/layout/Header";
import { FooterFull } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Page not found",
  description:
    "This page doesn't exist. Browse games, consoles, accessories and game cards at Ezurr.",
  // A 404 is served at whatever URL was mistyped or de-listed, so the page must
  // never invite indexing of the dead URL it happens to be sitting on.
  robots: { index: false, follow: true },
};

const ROUTES_OUT = [
  { href: "/games", label: "Games" },
  { href: "/consoles", label: "Consoles" },
  { href: "/accessories", label: "Accessories" },
  { href: "/game-cards", label: "Game cards" },
];

/**
 * Rendered for any unmatched route and for notFound() — most often an unknown
 * /products/<handle>. Carries the full store chrome deliberately: a bare
 * apology page dead-ends the visit, whereas the header nav and the links below
 * give a shopper who followed a stale link somewhere to go.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MicroBar />
      <Header active="games" />

      <main id="ez-main" className="ez-page flex w-full flex-1 flex-col items-center justify-center gap-4 py-20 text-center sm:py-28">
        <span className="ez-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#86868B]">
          Error 404
        </span>
        <h1 className="m-0 text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold tracking-[-0.04em] text-[#111113]">
          We couldn&apos;t find that page
        </h1>
        <p className="m-0 max-w-md text-sm leading-snug text-[#6E6E73] sm:text-[15px]">
          The link may be broken, or the product may no longer be part of our catalogue.
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5">
          <Link
            href="/"
            className="ez-btn-primary inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold"
          >
            Back to store
          </Link>
          <Link
            href="/track"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/[0.12] px-6 text-sm font-semibold text-[#1D1D1F] hover:border-black/[0.2]"
          >
            Track an order
          </Link>
        </div>

        <nav aria-label="Popular categories" className="mt-6">
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {ROUTES_OUT.map((route) => (
              <li key={route.href}>
                <Link
                  href={route.href}
                  className="text-[13px] font-semibold text-[#1D1D1F] underline-offset-4 hover:underline"
                >
                  {route.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>

      <FooterFull />
    </div>
  );
}

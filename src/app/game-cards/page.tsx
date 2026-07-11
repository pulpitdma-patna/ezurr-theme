import type { Metadata } from "next";
import Link from "next/link";
import { MicroBar } from "@/components/layout/MicroBar";
import { Header } from "@/components/layout/Header";
import { GameCardGrid } from "@/components/ui/GameCardGrid";
import gameCards from "@/data/gameCards.json";
import type { GameCardProduct } from "@/lib/types";

export const metadata: Metadata = {
  title: "Game cards",
};

export default function GameCardsPage() {
  const cards = gameCards as GameCardProduct[];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MicroBar />
      <Header active="game-cards" />
      <section className="ez-page w-full pt-10 sm:pt-14">
        <div className="flex flex-col gap-3">
          <div className="ez-mono flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.1em] text-[#86868B] sm:text-[10.5px]">
            <Link href="/" className="hover:text-[#1D1D1F]">
              Home
            </Link>
            <span>/</span>
            <span className="text-[#1D1D1F]">Game cards</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-4">
            <h1 className="ez-h1 m-0 font-bold">Game cards</h1>
            <span className="ez-mono text-[11px] uppercase tracking-[0.1em] text-[#86868B] sm:text-xs">
              {cards.length} TITLES
            </span>
          </div>
          <p className="ez-lead m-0 max-w-[520px] text-[#6E6E73]">
            Digital codes delivered to your email in seconds — no expiry, no
            shipping.
          </p>
        </div>
      </section>
      <section className="ez-page w-full flex-1 pt-8 sm:pt-10">
        <GameCardGrid cards={cards} />
      </section>
      <footer className="mt-16 border-t border-[#E8E8ED] bg-white sm:mt-24">
        <div className="ez-page flex flex-col items-start justify-between gap-4 py-5 md:flex-row md:items-center">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-base font-bold tracking-[-0.03em]">Ezurr</span>
            <span className="ez-mono text-[9px] uppercase tracking-[0.18em] text-[#86868B]">
              Play HQ
            </span>
          </Link>
          <span className="text-xs text-[#86868B]">
            Digital codes are non-refundable once delivered.
          </span>
          <span className="ez-mono text-[10.5px] tracking-[0.08em] text-[#86868B]">
            © 2026 EZURR
          </span>
        </div>
      </footer>
    </div>
  );
}

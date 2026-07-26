import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MicroBar } from "@/components/layout/MicroBar";
import { Header } from "@/components/layout/Header";
import { FooterFull } from "@/components/layout/Footer";
import { fetchCategories } from "@/lib/catalog/categoryProducts";

/**
 * The shop-by-category hub.
 *
 * Server-fetched for the same reason /brands is: a client-side grid is invisible
 * to search engines. And without a hub, every category beyond the eight the mega
 * menu can hold is reachable only from the sitemap — an orphan with no internal
 * link, which is a page Google will discover and then decline to rank.
 */

export const metadata: Metadata = {
  title: "Shop by category",
  description:
    "Every collection at Ezurr — games, consoles, accessories, game cards and seasonal edits, all genuine stock with the lowest price guaranteed.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesHubPage() {
  const categories = (await fetchCategories())
    // Same gate as the route itself: a category is here when the owner gave it a
    // page. Empty ones are excluded — a tile promising a collection and landing on
    // "nothing here yet" is worse than no tile.
    .filter((c) => c.listable && c.active && c.productCount > 0)
    .sort((a, b) => b.productCount - a.productCount);

  return (
    <div className="min-h-screen bg-[var(--ez-bg)]">
      <MicroBar />
      <Header showSearch />
      <main id="ez-main" className="mx-auto w-full max-w-[1200px] px-5 py-10 sm:px-8 sm:py-14">
        <nav className="ez-mono mb-5 text-[10px] uppercase tracking-[0.16em] text-[#86868B]">
          <Link href="/" className="hover:text-[#1D1D1F]">
            Home
          </Link>
          <span aria-hidden className="px-2 text-[#D1D1D6]">
            /
          </span>
          <span className="text-[#1D1D1F]">Categories</span>
        </nav>

        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#1D1D1F] sm:text-4xl">
          Shop by category
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6E6E73]">
          {categories.length > 0
            ? `${categories.length} collections, all genuine stock shipped from India.`
            : "Collections are on their way."}
        </p>

        {categories.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-black/[0.07] bg-white p-8 text-center text-sm text-[#6E6E73]">
            No collections are published yet.{" "}
            <Link href="/games" className="font-semibold text-[#1D1D1F] underline">
              Browse all games
            </Link>
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {categories.map((c) => (
              <Link
                key={c.key}
                href={c.href}
                className="group relative aspect-[4/3] overflow-hidden rounded-[22px] border border-black/[0.06] bg-[#F3F4F6] transition duration-500 hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(17,17,19,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D1D1F]"
              >
                {c.image ? (
                  <Image
                    src={c.image}
                    alt=""
                    fill
                    className="object-cover transition duration-700 group-hover:scale-[1.04]"
                    sizes="(max-width: 640px) 50vw, 33vw"
                  />
                ) : null}
                <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(3,4,7,0.82)_0%,rgba(3,4,7,0.18)_58%,transparent_100%)]" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="ez-mono text-[9px] uppercase tracking-[0.16em] text-white/70">
                    {c.productCount} {c.productCount === 1 ? "product" : "products"}
                  </p>
                  <p className="mt-1 text-lg font-semibold tracking-[-0.02em] text-white">
                    {c.label}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <FooterFull />
    </div>
  );
}

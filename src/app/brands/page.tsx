import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { MicroBar } from "@/components/layout/MicroBar";
import { Header } from "@/components/layout/Header";
import { FooterFull } from "@/components/layout/Footer";
import { getApiBaseUrl } from "@/lib/apiClient";

export const metadata: Metadata = {
  title: "Brands",
  description:
    "Shop PlayStation, Xbox, Nintendo, Logitech and more at Ezurr — India's gaming store.",
  alternates: { canonical: "/brands" },
};

type Brand = {
  slug: string;
  name: string;
  image?: string | null;
  active?: boolean;
};

/**
 * Server-fetched so the brand grid is crawlable — these are the store's main
 * SEO landing pages ("buy PlayStation games India"), which a client-side fetch
 * would hide from search engines entirely.
 */
async function fetchBrands(): Promise<Brand[]> {
  const base = getApiBaseUrl();
  if (!base) return [];
  try {
    const res = await fetch(`${base}/api/brands`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const body = (await res.json()) as { data?: Brand[] } | Brand[];
    const rows = Array.isArray(body) ? body : (body.data ?? []);
    return rows.filter((b) => b.active !== false);
  } catch {
    return [];
  }
}

export default async function BrandsPage() {
  const brands = await fetchBrands();

  return (
    <div className="min-h-screen bg-[var(--ez-bg)]">
      <MicroBar />
      <Header active="games" />
      <main className="mx-auto w-full max-w-[1200px] px-5 py-10 sm:px-8 sm:py-14">
        <nav className="ez-mono mb-5 text-[10px] uppercase tracking-[0.16em] text-[#86868B]">
          <Link href="/" className="no-underline text-inherit hover:text-[var(--ez-fg)]">
            Home
          </Link>{" "}
          / Brands
        </nav>

        <h1 className="ez-display m-0 font-bold tracking-[-0.04em]">Brands</h1>
        <p className="mt-3 max-w-[560px] text-[15px] leading-relaxed text-[#6E6E73]">
          Every platform and maker we stock — jump straight to a brand&apos;s full lineup.
        </p>

        {brands.length === 0 ? (
          <p className="mt-10 text-[14px] text-[#6E6E73]">
            Brands are being set up. Check back shortly.
          </p>
        ) : (
          <ul className="mt-9 grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 lg:grid-cols-4">
            {brands.map((brand) => (
              <li key={brand.slug}>
                <Link
                  href={`/brands/${brand.slug}`}
                  className="group flex h-full flex-col items-center justify-center gap-3 rounded-[18px] border border-black/[0.07] bg-white px-5 py-8 text-center no-underline transition hover:border-black/20 hover:shadow-[0_6px_24px_rgba(0,0,0,0.06)]"
                >
                  {brand.image ? (
                    <Image
                      src={brand.image}
                      alt=""
                      width={64}
                      height={64}
                      className="h-14 w-14 object-contain"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="ez-display grid h-14 w-14 place-items-center rounded-full bg-[#F2F2F4] text-[20px] font-bold text-[#1D1D1F]"
                    >
                      {brand.name.charAt(0)}
                    </span>
                  )}
                  <span className="text-[14px] font-semibold text-[var(--ez-fg)]">
                    {brand.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <FooterFull />
    </div>
  );
}

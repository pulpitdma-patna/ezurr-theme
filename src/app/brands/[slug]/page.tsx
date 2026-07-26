import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiCatalogCategoryPage } from "@/components/catalog/ApiCatalogCategoryPage";
import { getApiBaseUrl } from "@/lib/apiClient";
import { SSR_CARD_COUNT, fetchBrandProducts } from "@/lib/catalog/categoryProducts";
import type { CatalogProduct } from "@/lib/types";

type Brand = { slug: string; name: string; active?: boolean };

async function fetchBrand(slug: string): Promise<Brand | null> {
  const base = getApiBaseUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/brands`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: Brand[] } | Brand[];
    const rows = Array.isArray(body) ? body : (body.data ?? []);
    return rows.find((b) => b.slug === slug && b.active !== false) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const brand = await fetchBrand(slug);
  if (!brand) return { title: "Brand" };

  return {
    title: brand.name,
    description: `Shop ${brand.name} games, consoles and accessories at Ezurr — lowest price guaranteed, fast delivery across India.`,
    alternates: { canonical: `/brands/${brand.slug}` },
  };
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brand = await fetchBrand(slug);

  // An unknown or deactivated brand is a genuine 404, not an empty grid —
  // otherwise every typo'd slug becomes a thin, indexable page.
  if (!brand) notFound();

  /*
   * Products fetched on the SERVER.
   *
   * This passed `fallbackProducts={[]}` into a client component that fetches in an
   * effect, so /brands/playstation shipped 151 products' worth of nothing: zero
   * `/products/` links in view-source and a heading reading "0 titles". The comment
   * on the brands index calls these "the store's main SEO landing pages ('buy
   * PlayStation games India')" — and they were the pages least visible to a
   * crawler in the whole store.
   *
   * Same fetch the category pages use, so the two cannot drift into rendering the
   * catalogue two different ways.
   */
  const { products, total, lastPage } = await fetchBrandProducts(
    brand.slug,
    SSR_CARD_COUNT,
  );

  return (
    <ApiCatalogCategoryPage
      // No `active`: this is a brand, and claiming "games" lit up the wrong
      // top-level menu item on every brand page.
      breadcrumb={brand.name}
      title={brand.name}
      description={`Everything ${brand.name} we stock — games, consoles and accessories.`}
      fallbackProducts={[] as CatalogProduct[]}
      initialProducts={products}
      initialTotal={total}
      remainingPages={Math.max(0, lastPage - 1)}
      brandSlug={brand.slug}
    />
  );
}

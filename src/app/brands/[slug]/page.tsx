import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiCatalogCategoryPage } from "@/components/catalog/ApiCatalogCategoryPage";
import { getApiBaseUrl } from "@/lib/apiClient";
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

  return (
    <ApiCatalogCategoryPage
      active="games"
      breadcrumb={brand.name}
      title={brand.name}
      description={`Everything ${brand.name} we stock — games, consoles and accessories.`}
      fallbackProducts={[] as CatalogProduct[]}
      brandSlug={brand.slug}
    />
  );
}

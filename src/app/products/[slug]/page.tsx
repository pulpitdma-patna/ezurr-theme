import { cache } from "react";
import type { Metadata } from "next";
import { ProductView } from "@/components/product/ProductView";
import { findStaticCatalogProduct } from "@/data/home";
import { api } from "@/lib/apiClient";
import { fromApi, fromStatic, type ResolvedProduct } from "@/lib/productResolve";

// Cached per-request so generateMetadata and the page share one resolve.
// The URL segment is the product's business handle (its `key`, e.g.
// "gta-vi-preorder"); the API resolves it by key OR slug.
const resolveProduct = cache(async (handle: string): Promise<ResolvedProduct | null> => {
  // Server-side resolve: prefer the live API, fall back to the static catalog.
  try {
    return fromApi(await api.product(handle));
  } catch {
    const staticHit = findStaticCatalogProduct(handle);
    return staticHit ? fromStatic(staticHit, handle) : null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const handle = decodeURIComponent((await params).slug).trim();
  const product = await resolveProduct(handle);
  // Canonicalize to the product's real key so key/slug aliases collapse to one
  // indexable URL. metadataBase (root layout) makes this absolute.
  const canonical = `/products/${encodeURIComponent(product?.key ?? handle)}`;
  return {
    // Root layout applies the "%s · Ezurr" template, so return the bare title.
    title: product ? product.title : "Product",
    description: product?.description,
    alternates: { canonical },
    // Don't let search engines index an unresolved product URL.
    ...(product ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const handle = decodeURIComponent((await params).slug).trim();
  const product = await resolveProduct(handle);
  // Hand ProductView the canonical `key` (never the raw URL slug): cart,
  // checkout and OrderService look products up by key only.
  return <ProductView productKey={product?.key ?? handle} initialProduct={product} />;
}

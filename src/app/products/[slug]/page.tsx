import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductView } from "@/components/product/ProductView";
import { findStaticCatalogProduct } from "@/data/home";
import { ApiError, api, isApiEnabled } from "@/lib/apiClient";
import { toPlainSnippet } from "@/lib/apiMappers";
import { fromApi, fromStatic, type ResolvedProduct } from "@/lib/productResolve";

// Structured data needs absolute URLs; Next's metadataBase only rewrites
// metadata, not JSON-LD we emit ourselves.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://ezurr.com";

type Resolution = {
  product: ResolvedProduct | null;
  /**
   * Set only when the store has *proved* the handle is bad, which is what
   * separates a real 404 from a temporary miss. See resolveProduct.
   */
  gone: boolean;
};

// Cached per-request so generateMetadata and the page share one resolve.
// The URL segment is the product's business handle (its `key`, e.g.
// "gta-vi-preorder"); the API resolves it by key OR slug.
const resolveProduct = cache(async (handle: string): Promise<Resolution> => {
  // Server-side resolve: prefer the live API. Bundled JSON is offline-only —
  // serving it when the API is configured made missing SKUs look like real PDPs.
  try {
    return { product: fromApi(await api.product(handle)), gone: false };
  } catch (err) {
    if (!isApiEnabled()) {
      const staticHit = findStaticCatalogProduct(handle);
      if (staticHit) return { product: fromStatic(staticHit, handle), gone: false };
    }
    // Only a 404/410 from the API proves the URL is junk. A 5xx or unreachable
    // host means we simply don't know — answering 404 then would hand search
    // engines a deindex signal for the entire live catalogue on a blip.
    const gone = err instanceof ApiError && (err.status === 404 || err.status === 410);
    return { product: null, gone };
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const handle = decodeURIComponent((await params).slug).trim();
  const { product } = await resolveProduct(handle);
  // Canonicalize to the product's real key so key/slug aliases collapse to one
  // indexable URL. metadataBase (root layout) makes this absolute.
  const canonical = `/products/${encodeURIComponent(product?.key ?? handle)}`;
  const title = product ? product.title : "Product";
  const description = toPlainSnippet(product?.description, 155) || undefined;
  return {
    // Root layout applies the "%s · Ezurr" template, so return the bare title.
    title,
    // Descriptions are raw HTML from the API; emitting them verbatim shipped
    // escaped <p><span data-sheets-root="1"> markup into the search snippet.
    description,
    alternates: { canonical },
    // A shared product link should show the product, not the generic store
    // card it inherited from the root layout.
    openGraph: {
      type: "website",
      // Next replaces the parent openGraph wholesale rather than merging, so
      // the site-level siteName and locale have to be restated here.
      siteName: "Ezurr",
      locale: "en_IN",
      url: canonical,
      title,
      description,
      ...(product?.imageSrc ? { images: [{ url: product.imageSrc, alt: title }] } : {}),
    },
    ...(product?.imageSrc ? { twitter: { card: "summary_large_image", images: [product.imageSrc] } } : {}),
    // Don't let search engines index an unresolved product URL.
    ...(product ? {} : { robots: { index: false, follow: true } }),
  };
}

/**
 * Product structured data.
 *
 * Emitted only when we have a real numeric price from the API — the static
 * fallback catalogue carries a pre-formatted display string, and a wrong or
 * missing price in an Offer is worse than no Offer at all.
 */
function productJsonLd(product: ResolvedProduct, canonical: string) {
  if (typeof product.priceValue !== "number") return null;

  const availability =
    product.fulfillmentType === "preorder"
      ? "https://schema.org/PreOrder"
      : (product.stock ?? 0) > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: product.images.slice(0, 5),
    description: toPlainSnippet(product.description, 500) || undefined,
    sku: product.key,
    brand: { "@type": "Brand", name: product.brand },
    offers: {
      "@type": "Offer",
      url: canonical,
      priceCurrency: "INR",
      // The advertised, GST-inclusive figure — the same number the PDP shows
      // and checkout charges.
      price: product.priceValue,
      availability,
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const handle = decodeURIComponent((await params).slug).trim();
  const { product, gone } = await resolveProduct(handle);
  // A URL that resolves to nothing must answer 404, not 200 with "Product not
  // found" in the body — a soft 404 keeps the dead URL in the index and eats
  // crawl budget.
  if (gone) notFound();

  const jsonLd = product
    ? productJsonLd(product, `${siteUrl}/products/${encodeURIComponent(product.key)}`)
    : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          // Data, not executable script. JSON.stringify output is escaped for
          // the one sequence that could break out of a script element.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}
      {/* Hand ProductView the canonical `key` (never the raw URL slug): cart,
          checkout and OrderService look products up by key only. */}
      <ProductView productKey={product?.key ?? handle} initialProduct={product} />
    </>
  );
}

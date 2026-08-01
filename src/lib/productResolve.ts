import { formatInr } from "@/data/admin";
import { toDateOnly } from "@/lib/apiMappers";
import { payableMrp, payablePrice, type ApiProduct } from "@/lib/apiClient";
import type { CatalogProduct, ProductBadge } from "@/lib/types";

export const DEFAULT_IMG =
  "https://ezurr.com/cdn/shop/files/GAMPLAY540.jpg?v=1782735956&width=533";
export const DEFAULT_KEY = "gta-vi-preorder";

export type ResolvedProduct = {
  key: string;
  title: string;
  brand: string;
  price: string;
  /** Numeric rupee price (for cart line items); undefined for static catalog. */
  priceValue?: number;
  /** Stock level (API only) — drives the out-of-stock "notify me" flow. */
  stock?: number;
  description: string;
  imageSrc: string;
  /** All product images (primary first) for the gallery. */
  images: string[];
  /** Formatted strike-through MRP when discounted. */
  strike?: string;
  badges: ProductBadge[];
  categorySlug?: string;
  /**
   * Where the category's page is, or undefined when it has none.
   *
   * Resolved server-side against the same `listable` column the route checks, so
   * the breadcrumb cannot link to a 404. It linked to `/{category_slug}`, which
   * 404s for every category outside the five hand-written paths.
   */
  categoryHref?: string;
  fulfillmentType?: string;
  /**
   * When THIS product is due, as YYYY-MM-DD.
   *
   * Carried per product because that is what it is. The storefront printed one
   * shop-wide date on every pre-order — so seven games with seven different
   * release dates all told the customer the same day, and taking a deposit
   * against a date the shop had not promised.
   *
   * Undefined means the shop has not committed to a date, which the screen says
   * rather than borrowing another product's.
   */
  releaseAt?: string;
  source: "api" | "static";
};

export function fromApi(product: ApiProduct): ResolvedProduct {
  const images =
    product.gallery && product.gallery.length > 0
      ? product.gallery
      : [product.image_url || DEFAULT_IMG];
  return {
    key: product.key || product.slug || String(product.id),
    title: product.title,
    brand: product.brand_slug || product.category_slug || "Ezurr",
    price: formatInr(payablePrice(product)),
    priceValue: payablePrice(product),
    stock: typeof product.stock === "number" ? product.stock : undefined,
    description: product.description || "Available on Ezurr.",
    imageSrc: images[0],
    images,
    strike:
      (payableMrp(product) ?? 0) > payablePrice(product)
        ? formatInr(payableMrp(product)!)
        : undefined,
    badges: product.badges ?? [],
    categorySlug: product.category_slug ?? undefined,
    categoryHref: product.category_href ?? undefined,
    fulfillmentType: product.fulfillment_type,
    // `release_at` is a date cast, so it arrives with a time part on it.
    releaseAt: toDateOnly((product as { release_at?: unknown }).release_at),
    source: "api",
  };
}

export function fromStatic(product: CatalogProduct, key: string): ResolvedProduct {
  const img = product.img || DEFAULT_IMG;
  return {
    key: product.id || key,
    title: product.name,
    brand: product.brand || "Ezurr",
    // Static fallback catalogue — already a formatted display string, and never
    // carries a tax basis, so it is used as-is.
    price: product.price,
    description: "Available on Ezurr.",
    imageSrc: img,
    images: [img],
    strike: product.strike || undefined,
    badges: product.badges ?? [],
    categorySlug: undefined,
    fulfillmentType: product.brand.toLowerCase().includes("pre-order")
      ? "preorder"
      : undefined,
    source: "static",
  };
}

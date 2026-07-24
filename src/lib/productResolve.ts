import { formatInr } from "@/data/admin";
import type { ApiProduct } from "@/lib/apiClient";
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
  fulfillmentType?: string;
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
    price: formatInr(product.price),
    priceValue: product.price,
    stock: typeof product.stock === "number" ? product.stock : undefined,
    description: product.description || "Available on Ezurr.",
    imageSrc: images[0],
    images,
    strike: product.mrp && product.mrp > product.price ? formatInr(product.mrp) : undefined,
    badges: product.badges ?? [],
    categorySlug: product.category_slug ?? undefined,
    fulfillmentType: product.fulfillment_type,
    source: "api",
  };
}

export function fromStatic(product: CatalogProduct, key: string): ResolvedProduct {
  const img = product.img || DEFAULT_IMG;
  return {
    key: product.id || key,
    title: product.name,
    brand: product.brand || "Ezurr",
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

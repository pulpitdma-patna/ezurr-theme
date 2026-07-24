import type { CatalogProduct, GameCardProduct } from "@/lib/types";

/** URL-safe key from a display name (static catalog / fallbacks). */
export function slugifyProductKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Prefer API id/key; otherwise a stable slug from the product name. */
export function resolveProductId(
  product: Pick<CatalogProduct, "id" | "name">,
  index = 0,
): string {
  const fromId = product.id?.trim();
  if (fromId) return fromId;
  const fromName = slugifyProductKey(product.name || "");
  if (fromName) return fromName;
  return `item-${index}`;
}

/** SEO-friendly PDP URL for a catalog product: `/products/<handle>`. */
export function productDetailHref(
  product: Pick<CatalogProduct, "id" | "name">,
  index = 0,
): string {
  return `/products/${encodeURIComponent(resolveProductId(product, index))}`;
}

/**
 * Stable unique key for catalog products.
 * Prefer API id/key; never use img alone (many products share a placeholder CDN URL).
 * Always suffix index so sibling collisions are impossible.
 */
export function getCatalogProductKey(product: CatalogProduct, index = 0): string {
  const base = resolveProductId(product, index);
  return `${base}#${index}`;
}

/** Stable unique key for game card products. */
export function getGameCardProductKey(card: GameCardProduct, index = 0): string {
  const base = card.id?.trim() || slugifyProductKey(card.name || card.title || "");
  return `${base || "card"}-${card.value}-${index}`;
}

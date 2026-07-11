import type { CatalogProduct, GameCardProduct } from "@/lib/types";

/** Stable unique key for catalog products (img is unique per variant). */
export function getCatalogProductKey(product: CatalogProduct, index = 0): string {
  if (product.img) return product.img;
  return `${product.name}-${product.brand}-${product.price}-${index}`;
}

/** Stable unique key for game card products. */
export function getGameCardProductKey(card: GameCardProduct, index = 0): string {
  return `${card.name}-${card.value}-${index}`;
}

import type { CatalogProduct } from "@/lib/types";

export type CatalogSortOption =
  | "featured"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "newest";

export type ProductCondition = "new" | "preorder" | "preowned";

export type CatalogAvailability = "all" | "in-stock" | "out-of-stock";

export type CatalogFilterState = {
  brands: string[];
  conditions: ProductCondition[];
  availability: CatalogAvailability;
  priceMin: number | null;
  priceMax: number | null;
};

export const DEFAULT_CATALOG_FILTERS: CatalogFilterState = {
  brands: [],
  conditions: [],
  availability: "all",
  priceMin: null,
  priceMax: null,
};

export const CATALOG_SORT_OPTIONS: { value: CatalogSortOption; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price · Low to high" },
  { value: "price-desc", label: "Price · High to low" },
  { value: "name-asc", label: "Name · A–Z" },
  { value: "newest", label: "Newest" },
];

export const CONDITION_LABELS: Record<ProductCondition, string> = {
  new: "New",
  preorder: "Pre-order",
  preowned: "Pre-owned",
};

export function parseCatalogPrice(price: string): number | null {
  if (!price || /sold\s*out/i.test(price)) return null;
  const digits = price.replace(/[^\d]/g, "");
  if (!digits) return null;
  return Number(digits);
}

export function getProductPriceNum(p: CatalogProduct): number | null {
  if (p.priceNum != null) return p.priceNum;
  return parseCatalogPrice(p.price);
}

/** First segment of brand (e.g. "PS5 · Pre-order" → "PS5"). */
export function extractProductBrand(p: CatalogProduct): string {
  const raw = p.brand.trim();
  if (!raw) return "Other";
  return raw.split(" · ")[0].trim();
}

export function isProductSoldOut(p: CatalogProduct): boolean {
  if (/sold\s*out/i.test(p.price)) return true;
  if (p.stock != null && p.stock <= 0) return true;
  return p.badges?.some((b) => b.kind === "soldout") ?? false;
}

export function isProductInStock(p: CatalogProduct): boolean {
  return !isProductSoldOut(p);
}

export function getProductConditions(p: CatalogProduct): ProductCondition[] {
  const conditions: ProductCondition[] = [];
  const badgeKinds = new Set(p.badges?.map((b) => b.kind) ?? []);

  if (badgeKinds.has("new")) conditions.push("new");
  if (badgeKinds.has("preorder")) conditions.push("preorder");
  if (badgeKinds.has("preowned") || badgeKinds.has("pre-owned")) {
    conditions.push("preowned");
  }

  const brandLower = p.brand.toLowerCase();
  if (brandLower.includes("pre-order") && !conditions.includes("preorder")) {
    conditions.push("preorder");
  }
  if (brandLower.includes("pre-owned") && !conditions.includes("preowned")) {
    conditions.push("preowned");
  }

  return conditions;
}

export function deriveBrands(products: CatalogProduct[]): string[] {
  const brands = new Set<string>();
  for (const p of products) {
    brands.add(extractProductBrand(p));
  }
  return [...brands].sort((a, b) => a.localeCompare(b));
}

export function deriveConditions(products: CatalogProduct[]): ProductCondition[] {
  const set = new Set<ProductCondition>();
  for (const p of products) {
    for (const c of getProductConditions(p)) {
      set.add(c);
    }
  }
  const order: ProductCondition[] = ["new", "preorder", "preowned"];
  return order.filter((c) => set.has(c));
}

export function derivePriceBounds(
  products: CatalogProduct[],
): { min: number; max: number } | null {
  const prices = products.map(getProductPriceNum).filter((n): n is number => n != null);
  if (prices.length === 0) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function hasNewestSortData(products: CatalogProduct[]): boolean {
  return products.some((p) => p.createdAt || p.badges?.some((b) => b.kind === "new"));
}

export function countActiveFilters(filters: CatalogFilterState): number {
  let n = 0;
  n += filters.brands.length;
  n += filters.conditions.length;
  if (filters.availability !== "all") n += 1;
  if (filters.priceMin != null || filters.priceMax != null) n += 1;
  return n;
}

export function filterCatalogProducts(
  products: CatalogProduct[],
  filters: CatalogFilterState,
): CatalogProduct[] {
  return products.filter((p) => {
    if (filters.brands.length && !filters.brands.includes(extractProductBrand(p))) {
      return false;
    }

    if (filters.conditions.length) {
      const productConditions = getProductConditions(p);
      if (!filters.conditions.some((c) => productConditions.includes(c))) {
        return false;
      }
    }

    if (filters.availability === "in-stock" && !isProductInStock(p)) return false;
    if (filters.availability === "out-of-stock" && isProductInStock(p)) return false;

    const price = getProductPriceNum(p);
    if (filters.priceMin != null && (price == null || price < filters.priceMin)) {
      return false;
    }
    if (filters.priceMax != null && (price == null || price > filters.priceMax)) {
      return false;
    }

    return true;
  });
}

export function sortCatalogProducts(
  products: CatalogProduct[],
  sort: CatalogSortOption,
): CatalogProduct[] {
  const items = [...products];

  switch (sort) {
    case "price-asc":
      return items.sort((a, b) => {
        const pa = getProductPriceNum(a) ?? Infinity;
        const pb = getProductPriceNum(b) ?? Infinity;
        return pa - pb;
      });
    case "price-desc":
      return items.sort((a, b) => {
        const pa = getProductPriceNum(a) ?? -1;
        const pb = getProductPriceNum(b) ?? -1;
        return pb - pa;
      });
    case "name-asc":
      return items.sort((a, b) => a.name.localeCompare(b.name));
    case "newest":
      return items.sort((a, b) => {
        const da = a.createdAt ? Date.parse(a.createdAt) : 0;
        const db = b.createdAt ? Date.parse(b.createdAt) : 0;
        if (da !== db) return db - da;
        const aNew = a.badges?.some((badge) => badge.kind === "new") ? 1 : 0;
        const bNew = b.badges?.some((badge) => badge.kind === "new") ? 1 : 0;
        return bNew - aNew;
      });
    case "featured":
    default:
      return items;
  }
}

export function formatPriceBound(value: number): string {
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(value % 100000 === 0 ? 0 : 1)}L`;
  }
  if (value >= 1000) {
    return `₹${Math.round(value / 1000)}k`;
  }
  return `₹${value}`;
}

/** Suggested price-range chips based on catalog spread. */
export function derivePriceRanges(
  products: CatalogProduct[],
): { label: string; min: number | null; max: number | null }[] {
  const bounds = derivePriceBounds(products);
  if (!bounds || bounds.max <= 0) return [];

  const { min, max } = bounds;
  if (max <= 10000) {
    return [
      { label: `Under ${formatPriceBound(max / 2)}`, min: null, max: Math.floor(max / 2) },
      { label: `${formatPriceBound(max / 2)}+`, min: Math.ceil(max / 2), max: null },
    ];
  }

  const step = max <= 50000 ? 10000 : 25000;
  const ranges: { label: string; min: number | null; max: number | null }[] = [];
  let cursor = Math.floor(min / step) * step;

  while (cursor < max) {
    const next = cursor + step;
    ranges.push({
      label:
        cursor <= min
          ? `Under ${formatPriceBound(next)}`
          : `${formatPriceBound(cursor)} – ${formatPriceBound(next)}`,
      min: cursor <= min ? null : cursor,
      max: next,
    });
    cursor = next;
  }

  ranges.push({
    label: `${formatPriceBound(cursor)}+`,
    min: cursor,
    max: null,
  });

  return ranges.slice(0, 4);
}

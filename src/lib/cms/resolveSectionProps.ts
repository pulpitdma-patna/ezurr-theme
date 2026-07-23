import {
  featuredAccessories,
  featuredConsoles,
  featuredPreorders,
  trendingGames,
} from "@/data/home";
import type { CatalogProduct } from "@/lib/types";
import type { CmsBlock, ProductRailSource } from "./types";
import { DEFAULT_ASSURANCES, DEFAULT_HERO_SLIDES } from "./defaultHomePage";

const SOURCE_MAP: Record<Exclude<ProductRailSource, "manual">, CatalogProduct[]> = {
  preorders: featuredPreorders,
  games: trendingGames,
  consoles: featuredConsoles,
  accessories: featuredAccessories,
};

function catalogFromAdmin(): CatalogProduct[] {
  if (typeof window === "undefined") return [];
  try {
    // Lazy import path via dynamic require of store would cycle; use localStorage snapshot
    const raw = window.localStorage.getItem("ezurr_admin_store");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as {
      products?: Array<{ name: string; image: string; price: string; brand?: string }>;
    };
    if (!Array.isArray(parsed.products)) return [];
    return parsed.products.map((p) => {
      const row = p as {
        name: string;
        image: string;
        price: string;
        brand?: string;
        key?: string;
        sku?: string;
      };
      return {
        id: row.key || row.sku || undefined,
        name: row.name,
        img: row.image,
        price: row.price,
        brand: row.brand ?? "",
        strike: "",
      } as CatalogProduct;
    });
  } catch {
    return [];
  }
}

export function resolveProductRailProducts(props: Record<string, unknown>): CatalogProduct[] {
  const source = (props.source as ProductRailSource) || "games";
  const limit = Math.max(1, Number(props.limit) || 10);
  if (source === "manual") {
    const keys = Array.isArray(props.productKeys)
      ? (props.productKeys as string[])
      : [];
    const pool = [
      ...catalogFromAdmin(),
      ...featuredPreorders,
      ...trendingGames,
      ...featuredConsoles,
      ...featuredAccessories,
    ];
    const byName = new Map(pool.map((p) => [p.name, p]));
    const picked = keys.map((k) => byName.get(k)).filter(Boolean) as CatalogProduct[];
    return (picked.length ? picked : trendingGames).slice(0, limit);
  }
  return (SOURCE_MAP[source] ?? trendingGames).slice(0, limit);
}

export function resolveHeroSlides(props: Record<string, unknown>) {
  const slides = props.slides;
  if (Array.isArray(slides) && slides.length > 0) return slides as typeof DEFAULT_HERO_SLIDES;
  return DEFAULT_HERO_SLIDES;
}

export function resolveAssuranceItems(props: Record<string, unknown>) {
  if (Array.isArray(props.items) && props.items.length > 0) {
    return props.items as typeof DEFAULT_ASSURANCES;
  }
  if (typeof props.itemsJson === "string" && props.itemsJson.trim()) {
    try {
      const parsed = JSON.parse(props.itemsJson) as typeof DEFAULT_ASSURANCES;
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      /* ignore */
    }
  }
  return DEFAULT_ASSURANCES;
}

export function interpolateTemplate(
  template: string,
  props: Record<string, unknown>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = props[key];
    if (value == null) return "";
    return String(value);
  });
}

export function scopeBlockCss(blockId: string, css: string): string {
  const trimmed = css.trim();
  if (!trimmed) return "";
  // Prefix simple selectors with block attribute — demo-grade scoping
  return trimmed
    .split("}")
    .map((chunk) => {
      const part = chunk.trim();
      if (!part) return "";
      const [selector, ...rest] = part.split("{");
      if (!rest.length) return part;
      const body = rest.join("{");
      const scoped = selector
        .split(",")
        .map((s) => `[data-cms-block="${blockId}"] ${s.trim()}`)
        .join(", ");
      return `${scoped}{${body}}`;
    })
    .filter(Boolean)
    .join("\n");
}

export function flattenEnabledBlocks(blocks: CmsBlock[]): CmsBlock[] {
  return blocks.filter((b) => b.enabled);
}

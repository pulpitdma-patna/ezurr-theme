import { api, isApiEnabled } from "@/lib/apiClient";
import { navItems } from "@/lib/theme";

export type NavBrand = {
  slug: string;
  name: string;
  count: number;
  href: string;
  image?: string | null;
};

export type NavHighlight = { label: string; href: string; count?: number };

export type NavCategory = {
  slug: string;
  label: string;
  href: string;
  count: number;
  brands: NavBrand[];
  highlights: NavHighlight[];
};

export type Navigation = {
  categories: NavCategory[];
  brands: NavBrand[];
  preorderCount: number;
  totalProducts: number;
};

/**
 * Static shape used when the API is unreachable — during a Vercel build, or if
 * the backend hiccups. A storefront whose navigation disappears on a transient
 * error is worse than one that never had counts, so this always renders
 * something usable. No counts, no panels: just the links that always exist.
 */
export const FALLBACK_NAV: Navigation = {
  // Pre-orders stays in the fallback: it is a top-level destination, not just a
  // panel link, so it must survive the API being unreachable.
  categories: navItems.map((item) => ({
    slug: item.key,
    label: item.label,
    href: item.href,
    count: 0,
    brands: [],
    highlights: [],
  })),
  brands: [],
  preorderCount: 0,
  totalProducts: 0,
};

// Module-scope cache: the header mounts on every page, and the menu does not
// change between client-side navigations. One in-flight promise is shared so a
// burst of mounts cannot fan out into a burst of requests.
let cached: Navigation | null = null;
let inflight: Promise<Navigation> | null = null;

function normalise(raw: unknown): Navigation {
  const d = (raw ?? {}) as Partial<Navigation>;
  const categories = Array.isArray(d.categories) ? d.categories : [];
  // An API that answers but returns nothing usable is treated as a failure —
  // an empty menu bar is a broken-looking storefront.
  if (categories.length === 0) return FALLBACK_NAV;

  return {
    categories,
    brands: Array.isArray(d.brands) ? d.brands : [],
    preorderCount: Number(d.preorderCount ?? 0),
    totalProducts: Number(d.totalProducts ?? 0),
  };
}

export async function loadNavigation(): Promise<Navigation> {
  if (cached) return cached;
  if (!isApiEnabled()) return FALLBACK_NAV;
  if (inflight) return inflight;

  inflight = api
    .navigation()
    .then((raw) => {
      cached = normalise(raw);
      return cached;
    })
    .catch(() => FALLBACK_NAV)
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/** Test/dev helper — drops the module cache so the next load refetches. */
export function resetNavigationCache() {
  cached = null;
  inflight = null;
}

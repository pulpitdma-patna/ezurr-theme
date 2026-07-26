import { getApiBaseUrl } from "@/lib/apiClient";
import { mapApiProductToCatalog } from "@/lib/apiMappers";
import type { ApiProduct } from "@/lib/apiClient";
import type { CmsBlock, PageRevisionSnapshot } from "@/lib/cms/types";
import type { CatalogProduct } from "@/lib/types";

/**
 * Server-side reads for a category page.
 *
 * The catalog shell is a client component that fetches in an effect, so today no
 * dynamic catalog route ships products in its HTML: /brands/playstation has 151
 * products and zero `/products/` links in view-source, and /games ships 22 from a
 * checked-in JSON file rather than the 187 it actually has. Google sees a page
 * with no products on it.
 *
 * These helpers use raw `fetch` with `next.revalidate` rather than `apiClient`,
 * which reads a bearer token from localStorage and sets no cache hints — it is not
 * a server-cacheable path. Same approach as `publicPages.ts` and
 * `/brands/[slug]`.
 */

/** Matches publicPages.ts — CMS and catalogue pages share a cache horizon. */
const REVALIDATE_SECONDS = 300;

/**
 * How many cards to server-render.
 *
 * Enough that a crawler and the first paint see a real grid, few enough that the
 * RSC payload does not carry 200 product objects. The rest arrive client-side, so
 * filters and price facets are complete for a real visitor.
 */
export const SSR_CARD_COUNT = 24;

export type CategorySummary = {
  id: string;
  key: string;
  label: string;
  description: string;
  image?: string | null;
  active: boolean;
  listable: boolean;
  href: string;
  productCount: number;
  metaTitle: string | null;
  metaDescription: string | null;
};

async function getJson<T>(path: string): Promise<T | null> {
  const base = getApiBaseUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // API unreachable at request or build time → caller falls back or 404s.
    return null;
  }
}

/** One category. Null when it does not exist or is deactivated. */
export async function fetchCategory(slug: string): Promise<CategorySummary | null> {
  const body = await getJson<CategorySummary>(
    `/categories/${encodeURIComponent(slug)}`,
  );
  return body && typeof body.key === "string" ? body : null;
}

/** Every category, for the hub and the sitemap. */
export async function fetchCategories(): Promise<CategorySummary[]> {
  const body = await getJson<{ data?: CategorySummary[] }>("/categories");
  return Array.isArray(body?.data) ? body.data : [];
}

/**
 * The one CMS page every category page renders.
 *
 * A category page is mostly a data-driven grid, so this is a template rather than
 * a page per category: 29 rows would bury the six real pages in a flat,
 * unpaginated Pages list. `category_grid` marks where the grid goes; anything the
 * owner puts above or below it appears above or below the grid on every category.
 *
 * Null when unreachable or unpublished — the route then renders the grid alone,
 * which is what it did before the template existed.
 */
export async function fetchCategoryTemplate(): Promise<{
  before: CmsBlock[];
  after: CmsBlock[];
  eyebrow: string;
  customCss: string;
} | null> {
  const body = await getJson<{ snapshot?: PageRevisionSnapshot }>(
    `/cms/page?path=${encodeURIComponent("/categories/*")}`,
  );
  const variant = body?.snapshot?.variants?.[0];
  if (!variant || !Array.isArray(variant.sections)) return null;

  const sections = variant.sections.filter((s) => s?.enabled);
  const gridAt = sections.findIndex((s) => s.type === "category_grid");
  const hero = sections.find((s) => s.type === "category_hero");
  const isMarker = (s: CmsBlock) =>
    s.type === "category_grid" || s.type === "category_hero";

  return {
    // No grid block means the owner deleted it; treat everything as "before" so
    // their content still renders rather than vanishing, and the grid follows.
    before: (gridAt === -1 ? sections : sections.slice(0, gridAt)).filter(
      (s) => !isMarker(s),
    ),
    after: (gridAt === -1 ? [] : sections.slice(gridAt + 1)).filter(
      (s) => !isMarker(s),
    ),
    eyebrow: typeof hero?.props?.eyebrow === "string" ? hero.props.eyebrow : "",
    customCss:
      typeof body?.snapshot?.customCss === "string" ? body.snapshot.customCss : "",
  };
}

export type CategoryProductPage = {
  products: CatalogProduct[];
  /** From the paginator, not the array length — the heading claims this number. */
  total: number;
  lastPage: number;
};

/**
 * The first page of a category's products, server-side.
 *
 * `total` comes from the paginator rather than `products.length`, because the
 * heading says "187 titles" and saying "24" would be a lie the owner cannot fix.
 */
export async function fetchCategoryProducts(
  slug: string,
  perPage = SSR_CARD_COUNT,
): Promise<CategoryProductPage> {
  return fetchCatalogPage({ category: slug }, perPage);
}

/** The first page of a brand's products, server-side. Same reasoning. */
export async function fetchBrandProducts(
  slug: string,
  perPage = SSR_CARD_COUNT,
): Promise<CategoryProductPage> {
  return fetchCatalogPage({ brand: slug }, perPage);
}

/**
 * One page of the catalogue for any single filter the products endpoint accepts.
 *
 * Shared so a brand page and a category page cannot drift into rendering the
 * catalogue two different ways — which is how /games ended up server-rendering a
 * checked-in JSON file while /brands rendered nothing at all.
 */
async function fetchCatalogPage(
  filters: Record<string, string>,
  perPage: number,
): Promise<CategoryProductPage> {
  const qs = new URLSearchParams({
    ...filters,
    page: "1",
    per_page: String(perPage),
  });
  const body = await getJson<{
    data?: ApiProduct[];
    total?: number;
    last_page?: number;
  }>(`/products?${qs}`);

  const rows = Array.isArray(body?.data) ? body.data : [];
  return {
    products: rows.map(mapApiProductToCatalog),
    total: typeof body?.total === "number" ? body.total : rows.length,
    lastPage: typeof body?.last_page === "number" ? body.last_page : 1,
  };
}

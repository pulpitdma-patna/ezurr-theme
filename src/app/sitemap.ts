import type { MetadataRoute } from "next";
import { api } from "@/lib/apiClient";
import { fetchPublishedCmsPages } from "@/lib/cms/publicPages";
import { categoryPath } from "@/lib/categoryRoutes";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://ezurr.com";

// Re-generate at most hourly so newly published products appear without a rebuild.
export const revalidate = 3600;

/** Storefront category/landing pages that are always crawlable. */
const STATIC_PATHS = [
  "/",
  "/games",
  "/consoles",
  "/accessories",
  "/game-cards",
  "/preorders",
  "/price-guarantee",
  "/brands",
];

/** Brand landing pages — primary SEO targets ("buy PlayStation games India"). */
async function brandPaths(): Promise<string[]> {
  try {
    const res = await api.brands();
    return (res.data ?? [])
      .filter((b) => b.active !== false)
      .map((b) => `/brands/${encodeURIComponent(b.slug)}`);
  } catch {
    return [];
  }
}

/**
 * Category pages the owner has published.
 *
 * Gated on all three of active, listable and a non-zero product count: an empty
 * category renders (the owner needs to see their own work) but emits noindex, and
 * submitting a URL that says noindex is a Search Console error. Mapped through
 * `categoryPath` so this can never list one of the five URLs that 308s.
 *
 * The four static entries below are deliberately NOT removed in favour of this —
 * every fetch helper here swallows errors to [], so one failed /api/categories
 * call would drop the store's biggest landing pages for a whole hourly window.
 */
async function categoryPaths(): Promise<string[]> {
  try {
    const { fetchCategories } = await import("@/lib/catalog/categoryProducts");
    return (await fetchCategories())
      .filter((c) => c.active && c.listable && c.productCount > 0)
      .map((c) => categoryPath(c.key));
  } catch {
    return [];
  }
}

/** Every active product handle, paged through the public API (best-effort). */
async function productPaths(): Promise<string[]> {
  const paths: string[] = [];
  try {
    const perPage = 250;
    for (let page = 1; page <= 40; page += 1) {
      const res = await api.products({ page, per_page: perPage });
      for (const p of res.data ?? []) {
        const handle = p.key || p.slug || String(p.id);
        if (handle) paths.push(`/products/${encodeURIComponent(handle)}`);
      }
      const lastPage = res.last_page ?? page;
      if (page >= lastPage || (res.data?.length ?? 0) < perPage) break;
    }
  } catch {
    // API unreachable at build/request time → ship the static map only.
  }
  return paths;
}

/** Published CMS pages (policies, contact, about) — path is already absolute. */
async function cmsPaths(): Promise<string[]> {
  const pages = await fetchPublishedCmsPages();
  return pages
    .map((page) => page.path)
    .filter((path) => typeof path === "string" && path.startsWith("/"));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [cms, products, brands, categories] = await Promise.all([
    cmsPaths(),
    productPaths(),
    brandPaths(),
    categoryPaths(),
  ]);
  const paths = [...STATIC_PATHS, "/categories", ...categories, ...brands, ...cms, ...products];
  // De-dupe in case a product handle ever collides with a static path.
  const unique = Array.from(new Set(paths));
  return unique.map((path) => {
    // Policy/company pages change rarely and shouldn't outrank the catalogue.
    const isCms = path.startsWith("/pages/");
    return {
      url: new URL(path, SITE_URL).toString(),
      lastModified: now,
      changeFrequency: path === "/" ? "daily" : isCms ? "monthly" : "weekly",
      priority:
        path === "/" ? 1 : path.startsWith("/products/") ? 0.8 : isCms ? 0.4 : 0.7,
    } as const;
  });
}

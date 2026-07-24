import type { MetadataRoute } from "next";
import { api } from "@/lib/apiClient";

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
];

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const paths = [...STATIC_PATHS, ...(await productPaths())];
  // De-dupe in case a product handle ever collides with a static path.
  const unique = Array.from(new Set(paths));
  return unique.map((path) => ({
    url: new URL(path, SITE_URL).toString(),
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : path.startsWith("/products/") ? 0.8 : 0.7,
  }));
}

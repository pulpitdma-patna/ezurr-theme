import { getApiBaseUrl } from "@/lib/apiClient";
import type { CmsBlock, PageRevisionSnapshot, PageVariantId } from "./types";

/**
 * Server-side reads of the PUBLISHED CMS content.
 *
 * The storefront's client store (localStorage) can't be reached from a server
 * component, and `apiClient` attaches a browser token — these helpers talk to
 * the public, unauthenticated CMS endpoints so `/pages/[slug]` can render its
 * document body and metadata during SSR instead of after hydration.
 */

export type PublishedCmsPageSummary = {
  path: string;
  title: string;
};

export type PublishedCmsPage = {
  id: string;
  path: string;
  title: string;
  snapshot: PageRevisionSnapshot;
};

/** CMS content changes rarely; a short shared cache keeps SSR cheap. */
const REVALIDATE_SECONDS = 300;

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
    // API unreachable at request/build time → caller falls back.
    return null;
  }
}

export async function fetchPublishedCmsPages(): Promise<PublishedCmsPageSummary[]> {
  const body = await getJson<{ data?: PublishedCmsPageSummary[] }>("/cms/pages");
  return Array.isArray(body?.data) ? body.data : [];
}

export async function fetchPublishedCmsPage(
  path: string,
): Promise<PublishedCmsPage | null> {
  const body = await getJson<PublishedCmsPage>(
    `/cms/page?path=${encodeURIComponent(path)}`,
  );
  if (!body || typeof body.snapshot !== "object" || body.snapshot === null) {
    return null;
  }
  return body;
}

/** Storefront path for a CMS slug (matches how the admin stores page.path). */
export function cmsPathForSlug(slug: string): string {
  return slug === "home" ? "/" : `/pages/${slug}`;
}

/** Enabled sections of the served variant — mirrors getPublishedCmsSections. */
export function sectionsFromSnapshot(
  snapshot: PageRevisionSnapshot | null | undefined,
  variantId: PageVariantId = "A",
): CmsBlock[] {
  if (!snapshot || !Array.isArray(snapshot.variants)) return [];
  const variant =
    snapshot.variants.find((v) => v.id === variantId) ?? snapshot.variants[0];
  return (variant?.sections ?? []).filter((s) => s?.enabled);
}

/**
 * A meta-description candidate: the first paragraph of the first long-form block
 * on the page, flattened to plain text.
 */
export function summarizeSections(sections: CmsBlock[], maxLength = 155): string {
  for (const section of sections) {
    const html = typeof section.props?.html === "string" ? section.props.html : "";
    if (!html) continue;
    const paragraph = /<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(html)?.[1] ?? html;
    const text = paragraph
      .replace(/<[^>]*>/g, "")
      .replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp);/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length < 40) continue;
    return text.length > maxLength
      ? `${text.slice(0, maxLength - 1).trimEnd()}…`
      : text;
  }
  return "";
}

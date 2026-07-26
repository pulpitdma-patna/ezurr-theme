import type { Metadata } from "next";
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
  /** The owner's own <head> fields; any of them may be null. */
  seo?: {
    metaTitle: string | null;
    metaDescription: string | null;
    ogImageUrl: string | null;
    canonicalUrl: string | null;
    robots: string;
  } | null;
};

/**
 * Widget blocks are resolved against the admin's widget catalog, which only
 * exists in the browser store. A published widget carrying code ships a
 * `sandboxRef` and renders in an iframe, so only code-free widgets still need
 * the client path.
 */
export function needsClientWidgetCatalog(sections: CmsBlock[]): boolean {
  return sections.some(
    (section) =>
      (section.type === "widget" && !section.sandboxRef) ||
      needsClientWidgetCatalog(section.children ?? []),
  );
}

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
 * Next `Metadata` for a published CMS page.
 *
 * What the owner typed into the Page tab wins; the first-paragraph summary is
 * the fallback for a page nobody has filled in yet. `robots` is honoured, so
 * "Show in Google: off" actually reaches the crawler instead of being a
 * checkbox that only moved a database column.
 */
export function metadataForPublishedPage(
  page: PublishedCmsPage,
  canonicalPath: string,
  opts: {
    /**
     * Keep the layout's site-wide title and description when the owner hasn't
     * set their own. For the homepage that matters: falling back to the CMS
     * page's title puts "Homepage" in the browser tab instead of the store's
     * name, and the root layout already ships a good default and OG card.
     */
    inheritSiteDefaults?: boolean;
  } = {},
): Metadata {
  const seo = page.seo ?? null;
  const summary = summarizeSections(sectionsFromSnapshot(page.snapshot));
  const description =
    seo?.metaDescription ?? (opts.inheritSiteDefaults ? null : summary);
  const title = seo?.metaTitle ?? (opts.inheritSiteDefaults ? null : page.title);
  const canonical = seo?.canonicalUrl ?? canonicalPath;
  const noindex = Boolean(seo?.robots?.includes("noindex"));

  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    alternates: { canonical },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type: "website",
      url: canonical,
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(seo?.ogImageUrl ? { images: [{ url: seo.ogImageUrl }] } : {}),
    },
  };
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

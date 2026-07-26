import type { Metadata } from "next";
import { MicroBar } from "@/components/layout/MicroBar";
import { Header } from "@/components/layout/Header";
import { FooterFull } from "@/components/layout/Footer";
import { PageRenderer } from "@/components/cms/PageRenderer";
import { StorefrontCmsPage } from "@/components/cms/StorefrontCmsPage";
import type { CmsBlock } from "@/lib/cms/types";
import {
  cmsPathForSlug,
  fetchPublishedCmsPage,
  sectionsFromSnapshot,
  summarizeSections,
} from "@/lib/cms/publicPages";

type CmsLandingPageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * Widget blocks are resolved against the admin's widget catalog, which only
 * exists in the browser store. A published widget that carries code ships a
 * `sandboxRef` and renders in an iframe, so only code-free widgets still need
 * the client path.
 */
function needsClientWidgetCatalog(sections: CmsBlock[]): boolean {
  return sections.some(
    (section) =>
      (section.type === "widget" && !section.sandboxRef) ||
      needsClientWidgetCatalog(section.children ?? []),
  );
}

export async function generateMetadata({
  params,
}: CmsLandingPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await fetchPublishedCmsPage(cmsPathForSlug(slug));
  if (!page) return {};

  const description = summarizeSections(sectionsFromSnapshot(page.snapshot));
  const canonical = `/pages/${slug}`;

  return {
    title: page.title,
    ...(description ? { description } : {}),
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: page.title,
      ...(description ? { description } : {}),
    },
  };
}

export default async function CmsLandingPage({ params }: CmsLandingPageProps) {
  const { slug } = await params;
  const page = await fetchPublishedCmsPage(cmsPathForSlug(slug));
  const sections = page ? sectionsFromSnapshot(page.snapshot) : [];

  // No published server copy (API off, or the page is still a draft) — keep the
  // client path, which can resolve a local draft and renders the not-found state.
  if (!page || needsClientWidgetCatalog(sections)) {
    return <StorefrontCmsPage pageId={slug} notFoundFallback />;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <MicroBar />
      <Header showSearch />
      <main id="ez-main">
        <PageRenderer
          sections={sections}
          pageCss={
            typeof page.snapshot.customCss === "string" ? page.snapshot.customCss : ""
          }
          // Storefront never executes author JS in-page; code blocks published by
          // the API carry a sandboxRef and render inside an isolated iframe.
          sandboxPageId={page.id}
        />
      </main>
      <FooterFull />
    </div>
  );
}

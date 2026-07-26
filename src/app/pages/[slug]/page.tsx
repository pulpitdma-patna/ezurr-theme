import type { Metadata } from "next";
import { MicroBar } from "@/components/layout/MicroBar";
import { Header } from "@/components/layout/Header";
import { FooterFull } from "@/components/layout/Footer";
import { PageRenderer } from "@/components/cms/PageRenderer";
import { StorefrontCmsPage } from "@/components/cms/StorefrontCmsPage";
import {
  cmsPathForSlug,
  fetchPublishedCmsPage,
  metadataForPublishedPage,
  needsClientWidgetCatalog,
  sectionsFromSnapshot,
} from "@/lib/cms/publicPages";

type CmsLandingPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: CmsLandingPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await fetchPublishedCmsPage(cmsPathForSlug(slug));
  // What the owner typed in the Page tab wins over the guessed summary, and
  // "Show in Google: off" now actually reaches the crawler.
  return page ? metadataForPublishedPage(page, `/pages/${slug}`) : {};
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

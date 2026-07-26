import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getApiBaseUrl } from "@/lib/apiClient";
import { MicroBar } from "@/components/layout/MicroBar";
import { Header } from "@/components/layout/Header";
import { FooterFull } from "@/components/layout/Footer";
import { PageRenderer } from "@/components/cms/PageRenderer";
import { StorefrontCmsPage } from "@/components/cms/StorefrontCmsPage";
import { cmsPagePath, isReservedCmsSlug } from "@/lib/cms/cmsRoutes";
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
  return page ? metadataForPublishedPage(page, cmsPagePath(slug)) : {};
}

export default async function CmsLandingPage({ params }: CmsLandingPageProps) {
  const { slug } = await params;

  /*
   * This route is the storefront's root catch-all, so it answers for every URL no
   * other route claims. That makes the not-found path matter far more than it did
   * under /pages/: returning the client shell's "Page not found" body with a 200
   * would turn every typo, every stale link and every scanner probe on the domain
   * into a soft 404 — an indexable thin page, and a "Submitted URL not found"
   * class of problem in Search Console.
   *
   * A reserved slug never reaches here (a real route wins), but a page whose slug
   * became reserved after it was created would, and it must not render either.
   */
  if (isReservedCmsSlug(slug)) notFound();

  const page = await fetchPublishedCmsPage(cmsPathForSlug(slug));
  const sections = page ? sectionsFromSnapshot(page.snapshot) : [];

  if (!page) {
    // With no API configured this is mock mode, where a page exists only in the
    // browser store — hand over to the client path, which can resolve it. With an
    // API configured, "no published page" is a real 404 and gets the status code.
    if (getApiBaseUrl()) notFound();
    return <StorefrontCmsPage pageId={slug} notFoundFallback />;
  }

  // A code-free widget can only be resolved against the admin's browser catalog.
  if (needsClientWidgetCatalog(sections)) {
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

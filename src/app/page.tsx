import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MicroBar } from "@/components/layout/MicroBar";
import { Header } from "@/components/layout/Header";
import { FooterFull } from "@/components/layout/Footer";
import { PageRenderer } from "@/components/cms/PageRenderer";
import { StorefrontCmsPage } from "@/components/cms/StorefrontCmsPage";
import {
  fetchPublishedCmsPage,
  metadataForPublishedPage,
  needsClientWidgetCatalog,
  sectionsFromSnapshot,
} from "@/lib/cms/publicPages";
import { fetchInstallNeedsSetup, shouldRedirectHomeToSetup } from "@/lib/installState";

/**
 * The homepage, rendered from the CMS.
 *
 * This used to be `<StorefrontCmsPage pageId="home" />` — a client component
 * rendering a hardcoded layout from `defaultHomePage.ts`. The builder let the
 * owner rearrange that layout and it never reached a visitor: the homepage was
 * the one page the CMS appeared to manage and did not.
 *
 * `HomePageSeeder` installs that same layout as a real published page, so this
 * now reads `/` from the API and server-renders it exactly like
 * `/pages/[slug]`. The code seed stays as the fallback for a store whose API is
 * unreachable, or before the seeder has run — the storefront should still come
 * up when the backend is down, just not editably.
 */

export async function generateMetadata(): Promise<Metadata> {
  const page = await fetchPublishedCmsPage("/");
  // Inherit the layout's site title and OG card unless the owner has set their
  // own — the CMS page is called "Homepage", which is not what belongs in a
  // customer's browser tab.
  return page
    ? metadataForPublishedPage(page, "/", { inheritSiteDefaults: true })
    : {};
}

export default async function HomePage() {
  const install = await fetchInstallNeedsSetup();
  if (shouldRedirectHomeToSetup(install)) {
    redirect("/setup");
  }

  const page = await fetchPublishedCmsPage("/");
  const sections = page ? sectionsFromSnapshot(page.snapshot) : [];

  // No published server copy, or a widget only the browser store can resolve —
  // fall back to the client path and its code seed.
  if (!page || sections.length === 0 || needsClientWidgetCatalog(sections)) {
    return <StorefrontCmsPage pageId="home" />;
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

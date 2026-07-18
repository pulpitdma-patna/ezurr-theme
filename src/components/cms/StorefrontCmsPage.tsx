"use client";

import { MicroBar } from "@/components/layout/MicroBar";
import { Header } from "@/components/layout/Header";
import { FooterFull } from "@/components/layout/Footer";
import { PageRenderer } from "@/components/cms/PageRenderer";
import { useCmsPage, useCmsWidgets, usePublishedSections } from "@/hooks/useCmsStore";

type StorefrontCmsPageProps = {
  pageId: string;
  notFoundFallback?: boolean;
};

function CmsSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <MicroBar />
      <Header showSearch />
      <main className="ez-page space-y-6 py-10">
        <div className="h-[420px] animate-pulse rounded-[28px] bg-[#F0F0F2]" />
        <div className="h-24 animate-pulse rounded-2xl bg-[#F5F5F7]" />
        <div className="h-48 animate-pulse rounded-2xl bg-[#F0F0F2]" />
      </main>
      <FooterFull />
    </div>
  );
}

export function StorefrontCmsPage({
  pageId,
  notFoundFallback = false,
}: StorefrontCmsPageProps) {
  const page = useCmsPage(pageId);
  const widgets = useCmsWidgets();
  const { sections, customCss, customJs, ready, missing } = usePublishedSections(
    page,
  );

  if (!ready) {
    return <CmsSkeleton />;
  }

  if (missing || (!page && pageId !== "home")) {
    if (!notFoundFallback && pageId === "home") {
      // keep rendering seed via usePublishedSections
    } else {
      return (
        <div className="min-h-screen bg-white">
          <MicroBar />
          <Header showSearch />
          <main className="ez-page py-24 text-center">
            <h1 className="text-3xl font-semibold tracking-[-0.03em]">Page not found</h1>
            <p className="mt-3 text-sm text-[#6E6E73]">
              This CMS page is unpublished or missing.
            </p>
          </main>
          <FooterFull />
        </div>
      );
    }
  }

  if (missing && notFoundFallback) {
    return (
      <div className="min-h-screen bg-white">
        <MicroBar />
        <Header showSearch />
        <main className="ez-page py-24 text-center">
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">Page not found</h1>
          <p className="mt-3 text-sm text-[#6E6E73]">
            This CMS page is unpublished or missing.
          </p>
        </main>
        <FooterFull />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <MicroBar />
      <Header showSearch />
      <main>
        <PageRenderer
          sections={sections}
          widgets={widgets}
          pageCss={customCss}
          pageJs={customJs}
          allowJs
        />
      </main>
      <FooterFull />
    </div>
  );
}

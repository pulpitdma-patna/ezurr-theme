"use client";

import { useEffect, useState } from "react";
import { MicroBar } from "@/components/layout/MicroBar";
import { Header } from "@/components/layout/Header";
import { FooterFull } from "@/components/layout/Footer";
import { PageRenderer } from "@/components/cms/PageRenderer";
import { useCmsPage, useCmsWidgets, usePublishedSections } from "@/hooks/useCmsStore";
import { api, isApiEnabled } from "@/lib/apiClient";
import type { CmsPageDocument, PageRevisionSnapshot } from "@/lib/cms/types";

type StorefrontCmsPageProps = {
  pageId: string;
  notFoundFallback?: boolean;
};

/** Storefront path for a CMS pageId (matches how the admin stores page.path). */
function pathForPageId(pageId: string): string {
  return pageId === "home" ? "/" : `/pages/${pageId}`;
}

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
  const localPage = useCmsPage(pageId);
  const widgets = useCmsWidgets();

  // Server-published content (client-side) overrides the local store when the
  // API is live. Home still SSRs its seed, then hydrates to the server version.
  const [apiPage, setApiPage] = useState<CmsPageDocument | null>(null);
  const [apiLoading, setApiLoading] = useState(isApiEnabled());
  useEffect(() => {
    if (!isApiEnabled()) return;
    let cancelled = false;
    setApiLoading(true);
    void api
      .publicCmsPage(pathForPageId(pageId))
      .then((res) => {
        if (cancelled) return;
        setApiLoading(false);
        setApiPage({
          id: res.id,
          title: res.title,
          path: res.path,
          status: "published",
          updatedAt: "",
          // The API strips executable JS from the snapshot before serving.
          draft: res.snapshot as unknown as PageRevisionSnapshot,
          published: res.snapshot as unknown as PageRevisionSnapshot,
          revisions: [],
        });
      })
      .catch(() => {
        if (cancelled) return;
        setApiLoading(false);
        setApiPage(null); // unpublished/missing → local fallback
      });
    return () => {
      cancelled = true;
    };
  }, [pageId]);

  const usingApi = apiPage !== null;
  const page = apiPage ?? localPage;
  const { sections, customCss, ready, missing } = usePublishedSections(page);

  // The home page has a server-renderable seed, so we SSR it and hydrate to the
  // published (localStorage) version on the client. Other CMS pages live only
  // in localStorage, so they wait for hydration to avoid a not-found flash.
  // Wait for hydration and, in API mode, for the server lookup to settle before
  // deciding a non-home page is missing.
  if ((!ready || (apiLoading && !usingApi)) && pageId !== "home") {
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
          // Storefront never executes author JS in-page; code blocks published by
          // the API carry a sandboxRef and render inside an isolated iframe.
          sandboxPageId={apiPage?.id}
        />
      </main>
      <FooterFull />
    </div>
  );
}

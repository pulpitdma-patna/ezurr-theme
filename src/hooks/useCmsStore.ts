"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  assignCmsVariant,
  getAdminState,
  getCmsGlobalCode,
  getCmsPage,
  getCmsWidgets,
  getPublishedCmsSections,
  getPublishedPageCode,
  isCmsDraftDirty,
  readCmsVariantAssignment,
  subscribeAdminStore,
} from "@/lib/adminStore";
import { createDefaultHomePage } from "@/lib/cms/defaultHomePage";
import type {
  CmsBlock,
  CmsGlobalCode,
  CmsPageDocument,
  CmsWidgetDefinition,
  PageVariantId,
} from "@/lib/cms/types";

const serverHome = createDefaultHomePage("server");
const serverWidgets: CmsWidgetDefinition[] = [];
const serverCode: CmsGlobalCode = { headCss: "", footerJs: "" };
const fallbackHomeSeed = createDefaultHomePage("fallback-home");
const fallbackHomePublished = {
  sections: getPublishedCmsSections(fallbackHomeSeed, "A"),
  customCss: "",
  customJs: "",
};

export function useCmsHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    getAdminState();
    setHydrated(true);
  }, []);
  return hydrated;
}

export function useCmsPage(pageId: string): CmsPageDocument | null {
  return useSyncExternalStore(
    subscribeAdminStore,
    () => {
      const found = getCmsPage(pageId);
      if (found) return found;
      if (pageId === "home") return getAdminState().cmsPages[0] ?? serverHome;
      return null;
    },
    () => (pageId === "home" ? serverHome : null),
  );
}

export function useCmsPages(): CmsPageDocument[] {
  return useSyncExternalStore(
    subscribeAdminStore,
    () => getAdminState().cmsPages,
    () => [serverHome],
  );
}

export function useCmsWidgets(): CmsWidgetDefinition[] {
  return useSyncExternalStore(
    subscribeAdminStore,
    () => getCmsWidgets(),
    () => serverWidgets,
  );
}

export function useCmsGlobalCode(): CmsGlobalCode {
  return useSyncExternalStore(
    subscribeAdminStore,
    () => getCmsGlobalCode(),
    () => serverCode,
  );
}

/** Stable A/B: SSR/first paint uses A; after mount sticky-assigns once. */
export function useCmsAbVariant(
  page: CmsPageDocument | null,
): PageVariantId {
  const [variant, setVariant] = useState<PageVariantId>("A");

  useEffect(() => {
    if (!page?.published) {
      setVariant("A");
      return;
    }
    const existing = readCmsVariantAssignment(page.id);
    if (existing) {
      setVariant(existing);
      return;
    }
    const trafficA =
      page.published.variants.find((v) => v.id === "A")?.trafficPct ?? 100;
    setVariant(assignCmsVariant(page.id, trafficA));
  }, [page]);

  return variant;
}

export function usePublishedSections(page: CmsPageDocument | null): {
  sections: CmsBlock[];
  customCss: string;
  customJs: string;
  ready: boolean;
  missing: boolean;
} {
  const hydrated = useCmsHydrated();
  const variant = useCmsAbVariant(page);

  if (!page) {
    return { sections: [], customCss: "", customJs: "", ready: hydrated, missing: true };
  }

  if (!page.published) {
    // Home seed always has published; landings may be unpublished
    if (page.id === "home") {
      return {
        ...fallbackHomePublished,
        ready: hydrated,
        missing: false,
      };
    }
    return {
      sections: [],
      customCss: "",
      customJs: "",
      ready: hydrated,
      missing: true,
    };
  }

  const code = getPublishedPageCode(page);
  return {
    sections: getPublishedCmsSections(page, variant),
    customCss: code.customCss,
    customJs: code.customJs,
    ready: hydrated,
    missing: false,
  };
}

export function useCmsDraftDirty(pageId: string): boolean {
  return useSyncExternalStore(
    subscribeAdminStore,
    () => {
      const page = getCmsPage(pageId);
      return page ? isCmsDraftDirty(page) : false;
    },
    () => false,
  );
}

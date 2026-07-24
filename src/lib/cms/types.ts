export type SectionType =
  | "hero_slider"
  | "assurance_strip"
  | "product_rail"
  | "offer_banner"
  | "brand_explorer"
  | "editorial_banner"
  | "digital_cards"
  | "category_showcase"
  | "row"
  | "column"
  | "rich_text"
  | "overlay_stage"
  | "custom_html"
  | "widget";

export type ProductRailSource =
  | "preorders"
  | "games"
  | "consoles"
  | "accessories"
  | "manual";

export type InspectorFieldType =
  | "text"
  | "textarea"
  | "richtext"
  | "url"
  | "toggle"
  | "select"
  | "number"
  | "slides"
  | "assurances"
  | "product-source"
  | "product-keys"
  | "media-url"
  | "layout"
  | "css"
  | "js"
  | "html";

export type InspectorField = {
  key: string;
  label: string;
  type: InspectorFieldType;
  options?: { value: string; label: string }[];
  placeholder?: string;
  help?: string;
};

export type CmsBlockLayout = {
  xPct?: number;
  yPct?: number;
  wPct?: number;
  zIndex?: number;
};

export type CmsBlock = {
  id: string;
  type: SectionType;
  widgetId?: string;
  enabled: boolean;
  props: Record<string, unknown>;
  children?: CmsBlock[];
  layout?: CmsBlockLayout;
  customCss?: string;
  /** Server marks code blocks (custom_html/widget) so the storefront renders
   *  them in an isolated sandbox iframe instead of executing anything. */
  sandboxRef?: string;
};

export type PageVariantId = "A" | "B";

export type PageVariant = {
  id: PageVariantId;
  label: string;
  sections: CmsBlock[];
  trafficPct: number;
};

export type PageRevisionSnapshot = {
  variants: PageVariant[];
  activeVariantId: PageVariantId;
  customCss: string;
  customJs: string;
};

export type PageRevision = {
  id: string;
  at: string;
  label: string;
  snapshot: PageRevisionSnapshot;
};

export type CmsPageDocument = {
  id: string;
  title: string;
  path: string;
  /** Reflects whether a published snapshot exists and matches draft after last publish */
  status: "draft" | "published";
  updatedAt: string;
  draft: PageRevisionSnapshot;
  published: PageRevisionSnapshot | null;
  revisions: PageRevision[];
};

export type CmsWidgetDefinition = {
  id: string;
  name: string;
  description: string;
  category: string;
  author: string;
  version: string;
  installed: boolean;
  enabled: boolean;
  icon: string;
  previewImage?: string;
  defaults: Record<string, unknown>;
  fields: InspectorField[];
  templateHtml: string;
  templateCss?: string;
  templateJs?: string;
  custom?: boolean;
};

export type CmsGlobalCode = {
  headCss: string;
  footerJs: string;
};

export type HeroSlide = {
  id: string;
  title: string;
  subtitle: string;
  price: string;
  strike?: string;
  saveTag?: string;
  tags?: string[];
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  showCountdown?: boolean;
  image: string;
  imagePosition: string;
  backdrop: string;
};

export type AssuranceItem = {
  title: string;
  text: string;
  mark: string;
};

export function snapshotFromWorking(
  variants: PageVariant[],
  activeVariantId: PageVariantId,
  customCss: string,
  customJs: string,
): PageRevisionSnapshot {
  return {
    variants: structuredClone(variants),
    activeVariantId,
    customCss,
    customJs,
  };
}

export function snapshotsEqual(
  a: PageRevisionSnapshot | null | undefined,
  b: PageRevisionSnapshot | null | undefined,
): boolean {
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

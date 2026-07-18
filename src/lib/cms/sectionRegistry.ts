import type { InspectorField, SectionType } from "./types";
import { DEFAULT_ASSURANCES, DEFAULT_HERO_SLIDES } from "./defaultHomePage";

export type SectionRegistryEntry = {
  type: SectionType;
  label: string;
  description: string;
  icon: string;
  nestable: boolean;
  acceptsChildren: boolean;
  defaults: Record<string, unknown>;
  fields: InspectorField[];
};

export const SECTION_REGISTRY: SectionRegistryEntry[] = [
  {
    type: "hero_slider",
    label: "Hero slider",
    description: "Full-bleed carousel with CTAs and countdown.",
    icon: "hero",
    nestable: false,
    acceptsChildren: false,
    defaults: { slides: DEFAULT_HERO_SLIDES },
    fields: [{ key: "slides", label: "Slides", type: "slides" }],
  },
  {
    type: "assurance_strip",
    label: "Assurance strip",
    description: "Trust badges under the hero.",
    icon: "shield",
    nestable: true,
    acceptsChildren: false,
    defaults: { items: DEFAULT_ASSURANCES },
    fields: [{ key: "items", label: "Assurance items", type: "assurances" }],
  },
  {
    type: "product_rail",
    label: "Product rail",
    description: "Horizontal product collection.",
    icon: "rail",
    nestable: true,
    acceptsChildren: false,
    defaults: {
      eyebrow: "Collection",
      title: "Featured products.",
      description: "",
      href: "/games",
      linkLabel: "View all",
      variant: "product",
      source: "games",
      limit: 10,
      productKeys: [],
    },
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "href", label: "Link URL", type: "url" },
      { key: "linkLabel", label: "Link label", type: "text" },
      {
        key: "variant",
        label: "Card variant",
        type: "select",
        options: [
          { value: "product", label: "Product" },
          { value: "preorder", label: "Pre-order" },
          { value: "square", label: "Square" },
        ],
      },
      { key: "source", label: "Product source", type: "product-source" },
      { key: "productKeys", label: "Manual products", type: "product-keys" },
      { key: "limit", label: "Limit", type: "number" },
    ],
  },
  {
    type: "offer_banner",
    label: "Offer banner",
    description: "Prepaid discount banner (respects Appearance toggle).",
    icon: "offer",
    nestable: false,
    acceptsChildren: false,
    defaults: {},
    fields: [],
  },
  {
    type: "brand_explorer",
    label: "Brand explorer",
    description: "Tabbed brand product grids.",
    icon: "brand",
    nestable: false,
    acceptsChildren: false,
    defaults: {},
    fields: [],
  },
  {
    type: "editorial_banner",
    label: "Editorial banner",
    description: "Full-bleed promo with image and CTA.",
    icon: "banner",
    nestable: true,
    acceptsChildren: false,
    defaults: {
      eyebrow: "Featured",
      title: "Tell a story.",
      description: "Supporting copy for this promo.",
      href: "/games",
      cta: "Shop now",
      image: "/images/banner-racing-gear.png",
      imageAlt: "Promo image",
      theme: "dark",
      fullWidth: true,
      imagePosition: "center center",
    },
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "href", label: "CTA URL", type: "url" },
      { key: "cta", label: "CTA label", type: "text" },
      { key: "image", label: "Image", type: "media-url" },
      { key: "imageAlt", label: "Image alt", type: "text" },
      {
        key: "theme",
        label: "Theme",
        type: "select",
        options: [
          { value: "dark", label: "Dark" },
          { value: "light", label: "Light" },
          { value: "violet", label: "Violet" },
        ],
      },
      { key: "imagePosition", label: "Image position", type: "text" },
      { key: "fullWidth", label: "Full width", type: "toggle" },
    ],
  },
  {
    type: "digital_cards",
    label: "Digital cards",
    description: "Instant-delivery game cards feature.",
    icon: "cards",
    nestable: false,
    acceptsChildren: false,
    defaults: {
      eyebrow: "Instant delivery",
      title: "More play.\nZero waiting.",
      description:
        "Wallet top-ups, memberships, and digital codes delivered securely to your mobile.",
      cta: "Explore game cards",
      href: "/game-cards",
    },
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title", type: "textarea" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "cta", label: "CTA label", type: "text" },
      { key: "href", label: "CTA URL", type: "url" },
    ],
  },
  {
    type: "category_showcase",
    label: "Category showcase",
    description: "Shop-by-category mosaic.",
    icon: "grid",
    nestable: false,
    acceptsChildren: false,
    defaults: {
      eyebrow: "Start exploring",
      title: "Shop by category.",
      description: "Jump directly into the collection built for what you want to play next.",
    },
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  {
    type: "row",
    label: "Columns row",
    description: "2–3 column layout for nested modules.",
    icon: "columns",
    nestable: false,
    acceptsChildren: true,
    defaults: { columns: 2, gap: "md" },
    fields: [
      {
        key: "columns",
        label: "Columns",
        type: "select",
        options: [
          { value: "2", label: "2 columns" },
          { value: "3", label: "3 columns" },
        ],
      },
      {
        key: "gap",
        label: "Gap",
        type: "select",
        options: [
          { value: "sm", label: "Small" },
          { value: "md", label: "Medium" },
          { value: "lg", label: "Large" },
        ],
      },
    ],
  },
  {
    type: "column",
    label: "Column",
    description: "Column slot inside a row.",
    icon: "col",
    nestable: false,
    acceptsChildren: true,
    defaults: { index: 0 },
    fields: [],
  },
  {
    type: "rich_text",
    label: "Rich text",
    description: "Formatted content block.",
    icon: "text",
    nestable: true,
    acceptsChildren: false,
    defaults: { html: "<h2>Heading</h2><p>Write something memorable.</p>" },
    fields: [{ key: "html", label: "Content", type: "richtext" }],
  },
  {
    type: "overlay_stage",
    label: "Overlay stage",
    description: "Full-bleed stage with absolutely positioned children.",
    icon: "stage",
    nestable: false,
    acceptsChildren: true,
    defaults: {
      minHeight: 420,
      background: "#101012",
      image: "",
    },
    fields: [
      { key: "minHeight", label: "Min height (px)", type: "number" },
      { key: "background", label: "Background color", type: "text" },
      { key: "image", label: "Background image", type: "media-url" },
    ],
  },
  {
    type: "custom_html",
    label: "Custom HTML",
    description: "Raw HTML embed for demos.",
    icon: "code",
    nestable: true,
    acceptsChildren: false,
    defaults: { html: "<div class='ez-page py-10'><p>Custom HTML block</p></div>" },
    fields: [{ key: "html", label: "HTML", type: "html" }],
  },
];

export function getSectionEntry(type: SectionType): SectionRegistryEntry | undefined {
  return SECTION_REGISTRY.find((entry) => entry.type === type);
}

export function createBlockId(prefix = "sec") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

import type {
  CmsBlock,
  CmsPageDocument,
  HeroSlide,
  AssuranceItem,
  PageRevisionSnapshot,
} from "./types";

export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    id: "gta",
    title: "Grand Theft Auto VI.",
    subtitle: "Reserved, price locked.",
    price: "₹5,999",
    tags: ["Price locked", "COD available"],
    primaryCta: { label: "Pre-order now", href: "/checkout/gta-vi-preorder" },
    secondaryCta: { label: "View details", href: "/products/gta-vi-preorder" },
    showCountdown: true,
    image: "/images/hero-neon-coast.png",
    imagePosition: "68% 22%",
    backdrop: "#11151b",
  },
  {
    id: "wolverine",
    title: "Marvel's Wolverine.",
    subtitle: "The claws come out.",
    price: "₹5,499",
    tags: ["Price locked", "COD available"],
    primaryCta: { label: "Pre-order now", href: "/checkout/zelda-preorder" },
    secondaryCta: { label: "View details", href: "/products/zelda-preorder" },
    showCountdown: false,
    image: "/images/hero-wild-crimson.png",
    imagePosition: "78% 30%",
    backdrop: "#120e12",
  },
  {
    id: "switch2",
    title: "Nintendo Switch 2.",
    subtitle: "Play has no home.",
    price: "₹65,000",
    strike: "₹74,490",
    saveTag: "Save ₹9,490",
    primaryCta: { label: "Add to bag", href: "/checkout/ezurr-play" },
    secondaryCta: { label: "View details", href: "/products/ezurr-play" },
    showCountdown: false,
    image: "/images/hero-handheld-cyan.png",
    imagePosition: "72% 35%",
    backdrop: "#07161b",
  },
];

export const DEFAULT_ASSURANCES: AssuranceItem[] = [
  { title: "Minimum price", text: "You always pay our lowest price.", mark: "↓" },
  { title: "Genuine products", text: "Authentic, sealed, and warranty-backed.", mark: "✓" },
  { title: "Flexible payment", text: "COD under ₹10,000 or save prepaid.", mark: "₹" },
  { title: "Fast dispatch", text: "In-stock orders packed within 24 hours.", mark: "→" },
];

function block(
  id: string,
  type: CmsBlock["type"],
  props: Record<string, unknown> = {},
  extra: Partial<CmsBlock> = {},
): CmsBlock {
  return { id, type, enabled: true, props, ...extra };
}

export function createDefaultHomeSections(): CmsBlock[] {
  return [
    block("sec-hero", "hero_slider", { slides: DEFAULT_HERO_SLIDES }),
    block("sec-assurance", "assurance_strip", { items: DEFAULT_ASSURANCES }),
    block("sec-preorders", "product_rail", {
      eyebrow: "Reserve today · Pay at release",
      title: "The next big worlds.",
      description: "Lock in our minimum price and be ready on release day.",
      href: "/preorders",
      linkLabel: "All pre-orders",
      variant: "preorder",
      source: "preorders",
      limit: 10,
      productKeys: [],
    }),
    block("sec-offer", "offer_banner", {}),
    block("sec-brands", "brand_explorer", {}),
    block("sec-games", "product_rail", {
      eyebrow: "Playing now",
      title: "Games worth disappearing into.",
      description: "New releases, modern classics, and the titles everyone is talking about.",
      href: "/games",
      linkLabel: "All games",
      variant: "product",
      source: "games",
      limit: 10,
      productKeys: [],
    }),
    block("sec-consoles", "product_rail", {
      eyebrow: "Choose your platform",
      title: "Power your next era.",
      description: "",
      href: "/consoles",
      linkLabel: "All consoles",
      variant: "square",
      source: "consoles",
      limit: 9,
      productKeys: [],
    }),
    block("sec-editorial", "editorial_banner", {
      eyebrow: "Build your perfect setup",
      title: "Control every detail.",
      description:
        "From precision racing hardware to handheld freedom, the right gear changes how every game feels.",
      href: "/accessories",
      cta: "Shop gaming gear",
      image: "/images/banner-racing-gear.png",
      imageAlt: "Premium racing simulator in a minimalist studio",
      theme: "light",
      fullWidth: true,
      imagePosition: "62% 40%",
    }),
    block("sec-accessories", "product_rail", {
      eyebrow: "Ready to ship",
      title: "The finishing touch.",
      description: "",
      href: "/accessories",
      linkLabel: "All accessories",
      variant: "square",
      source: "accessories",
      limit: 10,
      productKeys: [],
    }),
    block("sec-digital", "digital_cards", {
      eyebrow: "Instant delivery",
      title: "More play.\nZero waiting.",
      description:
        "Wallet top-ups, memberships, and digital codes delivered securely to your mobile.",
      cta: "Explore game cards",
      href: "/game-cards",
    }),
  ];
}

function cloneSections(sections: CmsBlock[]): CmsBlock[] {
  return structuredClone(sections);
}

function makeSnapshot(sections: CmsBlock[]): PageRevisionSnapshot {
  const variants = [
    { id: "A" as const, label: "Variant A", sections: cloneSections(sections), trafficPct: 100 },
    { id: "B" as const, label: "Variant B", sections: cloneSections(sections), trafficPct: 0 },
  ];
  return {
    variants,
    activeVariantId: "A",
    customCss: "",
    customJs: "",
  };
}

export function createDefaultHomePage(now = new Date().toISOString()): CmsPageDocument {
  const snapshot = makeSnapshot(createDefaultHomeSections());
  return {
    id: "home",
    title: "Homepage",
    path: "/",
    status: "published",
    updatedAt: now,
    draft: structuredClone(snapshot),
    published: structuredClone(snapshot),
    revisions: [],
  };
}

export function createBlankLandingPage(
  id: string,
  title: string,
  slug: string,
  now = new Date().toISOString(),
): CmsPageDocument {
  const sections: CmsBlock[] = [
    block(`${id}-hero`, "rich_text", {
      html: `<h1>${title}</h1><p>Start building this page from the module palette.</p>`,
    }),
  ];
  const draft = makeSnapshot(sections);
  return {
    id,
    title,
    path: `/pages/${slug}`,
    status: "draft",
    updatedAt: now,
    draft,
    published: null,
    revisions: [],
  };
}

/** Normalize legacy flat row children into column containers. */
export function ensureRowColumns(section: CmsBlock): CmsBlock {
  if (section.type !== "row") {
    return {
      ...section,
      children: section.children?.map(ensureRowColumns),
    };
  }
  const children = section.children ?? [];
  const cols = Number(section.props.columns) === 3 ? 3 : 2;
  const alreadyColumns =
    children.length > 0 && children.every((c) => c.type === "column");
  if (alreadyColumns) {
    return {
      ...section,
      children: children.map(ensureRowColumns),
    };
  }
  const columns: CmsBlock[] = Array.from({ length: cols }, (_, i) =>
    block(`col-${section.id}-${i}`, "column", { index: i }, { children: [] }),
  );
  children.forEach((child, i) => {
    const target = columns[i % cols];
    target.children = [...(target.children ?? []), ensureRowColumns(child)];
  });
  return { ...section, children: columns };
}

export function normalizePageBlocks(page: CmsPageDocument): CmsPageDocument {
  const mapSnap = (snap: PageRevisionSnapshot): PageRevisionSnapshot => ({
    ...snap,
    variants: snap.variants.map((v) => ({
      ...v,
      sections: v.sections.map(ensureRowColumns),
    })),
  });
  return {
    ...page,
    draft: mapSnap(page.draft),
    published: page.published ? mapSnap(page.published) : null,
  };
}

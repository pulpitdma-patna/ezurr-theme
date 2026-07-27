import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { PageRenderer } from "@/components/cms/PageRenderer";
import { SECTION_REGISTRY } from "@/lib/cms/sectionRegistry";
import type { CmsBlock, SectionType } from "@/lib/cms/types";

/**
 * Every inspector field must reach the page.
 *
 * `offer_banner` and `brand_explorer` shipped with fields declared in the
 * registry and a renderer that passed no props at all — the section rendered
 * hardcoded copy and the owner could only toggle its visibility. That is not a
 * bug you can see by reading the registry, because the registry looked fine; you
 * see it by typing in the field and watching the page not change.
 *
 * So this asserts the whole chain per field: registry → PageRenderer → component
 * → rendered output. A field that stops being wired fails here rather than in a
 * store owner's afternoon.
 *
 * Fields whose effect cannot be read out of static HTML are listed in
 * `CHECKED_ELSEWHERE` with the reason, so the exemption is a decision on the
 * record rather than a silent gap.
 */

vi.mock("@/hooks/useLiveThemeSettings", () => ({
  useLiveThemeSettings: () => ({
    showOffer: true,
    prepaidDiscount: 10,
    releaseDate: "2026-11-19T00:00:00",
  }),
}));

// Rails and brand shelves fetch their products; the fetch path has its own
// coverage and would only add flake here.
vi.mock("@/lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/apiClient")>();
  return {
    ...actual,
    isApiEnabled: () => false,
    api: { ...actual.api, products: async () => ({ data: [] }) },
  };
});

afterEach(cleanup);

const MARKER = "ZZMARKERZZ";

/** Fields that cannot be asserted from static HTML, and why. */
const CHECKED_ELSEWHERE: Partial<Record<SectionType, Record<string, string>>> = {
  product_rail: {
    source: "Chooses which API query runs; covered by the rail's own fetch path.",
    productKeys: "Feeds api.product(key) lookups, not markup.",
    limit: "Slices the fetched array; nothing to read with an empty catalogue.",
    variant: "Switches card component; asserted by class, not text.",
  },
  editorial_banner: {
    theme: "Asserted below — a class token, not text.",
    imagePosition: "Asserted below — a CSS value.",
    fullWidth: "Asserted below — a layout toggle.",
    imageAlt: "Asserted below — an attribute.",
  },
  legal_doc: { showToc: "Asserted below — adds a nav, emits no text of its own." },
  overlay_stage: {
    minHeight: "Asserted below — inline style.",
    background: "Asserted below — inline style.",
    image: "Asserted below — inline style.",
  },
  row: {
    columns: "Asserted below — grid class.",
    gap: "Asserted below — gap class.",
  },
  hero_slider: { slides: "A repeater — asserted with a real slide below." },
  assurance_strip: { items: "A repeater — asserted with a real item below." },
  category_hero: {
    eyebrow: "Rendered by the category route, not PageRenderer (it is a marker).",
  },
};

function blockFor(type: SectionType, props: Record<string, unknown>): CmsBlock {
  return { id: `b-${type}`, type, enabled: true, props };
}

describe("every declared inspector field reaches the page", () => {
  const textish = new Set([
    "eyebrow",
    "title",
    "description",
    "cta",
    "linkLabel",
    "lastUpdated",
    "notice",
    "badge",
    "html",
  ]);

  for (const entry of SECTION_REGISTRY) {
    const exempt = CHECKED_ELSEWHERE[entry.type] ?? {};
    const testable = entry.fields.filter(
      (f) => textish.has(f.key) && !(f.key in exempt),
    );
    if (testable.length === 0) continue;

    it(`${entry.type}: ${testable.map((f) => f.key).join(", ")}`, () => {
      for (const field of testable) {
        cleanup();
        const value = `${MARKER}-${field.key}`;
        const { container } = render(
          <PageRenderer
            sections={[blockFor(entry.type, { ...entry.defaults, [field.key]: value })]}
          />,
        );
        expect(
          container.textContent,
          `${entry.type}.${field.key} is declared in the inspector but never reaches the page`,
        ).toContain(value);
      }
    });
  }

  it("editorial_banner: href and image are real attributes", () => {
    const { container } = render(
      <PageRenderer
        sections={[
          blockFor("editorial_banner", {
            title: "T",
            href: "/zz-target",
            image: "https://example.test/zz.png",
            imageAlt: "ZZ alt text",
          }),
        ]}
      />,
    );
    expect(container.querySelector('a[href="/zz-target"]')).not.toBeNull();
    const img = container.querySelector("img");
    expect(img?.getAttribute("alt")).toBe("ZZ alt text");
  });

  it("hero_slider: a custom slide replaces the default", () => {
    const { container } = render(
      <PageRenderer
        sections={[
          blockFor("hero_slider", {
            slides: [
              {
                id: "zz",
                title: `${MARKER} hero`,
                subtitle: "sub",
                price: "₹1",
                primaryCta: { label: "Go", href: "/x" },
                secondaryCta: { label: "More", href: "/y" },
                image: "/i.png",
                imagePosition: "50% 50%",
                backdrop: "#000",
              },
            ],
          }),
        ]}
      />,
    );
    expect(container.textContent).toContain(`${MARKER} hero`);
  });

  it("assurance_strip: a custom item replaces the defaults", () => {
    const { container } = render(
      <PageRenderer
        sections={[
          blockFor("assurance_strip", {
            items: [{ title: `${MARKER} promise`, text: "body", mark: "•" }],
          }),
        ]}
      />,
    );
    expect(container.textContent).toContain(`${MARKER} promise`);
  });

  it("offer_banner: {pct} follows the store setting, never a typed number", () => {
    const { container } = render(
      <PageRenderer
        sections={[blockFor("offer_banner", { title: "Save {pct}% now." })]}
      />,
    );
    // 10 comes from the mocked settings above, not from the document.
    expect(container.textContent).toContain("Save 10% now.");
    expect(container.textContent).not.toContain("{pct}");
  });

  /*
   * The fields that change an attribute rather than emit text. These were the
   * easiest ones to wave through as "checked elsewhere", which is exactly how a
   * dead control survives an audit — so they are checked here.
   */

  it("offer_banner: the owner's banner image replaces the stock line-up", () => {
    const { container } = render(
      <PageRenderer
        sections={[
          blockFor("offer_banner", {
            title: "T",
            image: "https://example.test/my-banner.png",
            imageAlt: "My own banner",
          }),
        ]}
      />,
    );
    const html = container.innerHTML;
    expect(html, "the owner's image must reach the banner").toContain(
      encodeURIComponent("https://example.test/my-banner.png").slice(0, 20),
    );
    // The stock three-shot collage must not sit on top of the owner's artwork.
    expect(html).not.toContain("GAMPLAY540");
  });

  it("editorial_banner: theme, fullWidth and imagePosition change the output", () => {
    const base = { title: "T", image: "/i.png" };
    const dark = render(
      <PageRenderer sections={[blockFor("editorial_banner", { ...base, theme: "dark" })]} />,
    ).container.innerHTML;
    cleanup();
    const light = render(
      <PageRenderer sections={[blockFor("editorial_banner", { ...base, theme: "light" })]} />,
    ).container.innerHTML;
    expect(dark, "theme must change the rendered markup").not.toBe(light);
    cleanup();

    // Violet is the full-bleed prepaid treatment: `prepaidOffer = fullWidth &&
    // theme === "violet"`. On an ordinary banner it is a no-op, which is why the
    // option is labelled for what it does rather than for a colour.
    const darkWide = render(
      <PageRenderer
        sections={[blockFor("editorial_banner", { ...base, theme: "dark", fullWidth: true })]}
      />,
    ).container.innerHTML;
    cleanup();
    const violetWide = render(
      <PageRenderer
        sections={[blockFor("editorial_banner", { ...base, theme: "violet", fullWidth: true })]}
      />,
    ).container.innerHTML;
    expect(darkWide, "violet must change a full-width banner").not.toBe(violetWide);
    cleanup();

    const narrow = render(
      <PageRenderer
        sections={[blockFor("editorial_banner", { ...base, fullWidth: false })]}
      />,
    ).container.innerHTML;
    cleanup();
    const wide = render(
      <PageRenderer
        sections={[blockFor("editorial_banner", { ...base, fullWidth: true })]}
      />,
    ).container.innerHTML;
    expect(narrow, "fullWidth must change the rendered markup").not.toBe(wide);
    cleanup();

    const pos = render(
      <PageRenderer
        sections={[blockFor("editorial_banner", { ...base, imagePosition: "12% 87%" })]}
      />,
    ).container.innerHTML;
    expect(pos, "imagePosition must reach the image").toContain("12% 87%");
  });

  it("row: columns and gap change the output", () => {
    const two = render(
      <PageRenderer sections={[blockFor("row", { columns: 2, gap: "sm" })]} />,
    ).container.innerHTML;
    cleanup();
    const three = render(
      <PageRenderer sections={[blockFor("row", { columns: 3, gap: "sm" })]} />,
    ).container.innerHTML;
    expect(two, "columns must change the grid").not.toBe(three);
    cleanup();

    const gapSm = render(
      <PageRenderer sections={[blockFor("row", { columns: 2, gap: "sm" })]} />,
    ).container.innerHTML;
    cleanup();
    const gapLg = render(
      <PageRenderer sections={[blockFor("row", { columns: 2, gap: "lg" })]} />,
    ).container.innerHTML;
    expect(gapSm, "gap must change the row").not.toBe(gapLg);
  });

  it("overlay_stage: minHeight, background and image reach the inline style", () => {
    const { container } = render(
      <PageRenderer
        sections={[
          blockFor("overlay_stage", {
            minHeight: 421,
            background: "rgb(1, 2, 3)",
            image: "https://example.test/bg.png",
          }),
        ]}
      />,
    );
    const html = container.innerHTML;
    expect(html, "minHeight must reach the style").toContain("421");
    expect(html, "background must reach the style").toContain("rgb(1, 2, 3)");
    expect(html, "image must reach the style").toContain("https://example.test/bg.png");
  });

  /*
   * A contents list needs something to list: PageRenderer gates it on
   * `headings.length > 1`.
   *
   * Three headings, not two, because these tests run in happy-dom and DOMPurify
   * unwraps the document's first heading there — an artifact of that DOM
   * implementation, NOT of the sanitizer. Verified against the real server path
   * (node + jsdom), where `<h2>Solo</h2>` survives intact and a two-heading
   * document yields two headings. Using three keeps the assertion meaningful in
   * either environment instead of quietly passing for the wrong reason.
   */
  it("legal_doc: showToc adds or removes the contents nav", () => {
    const withToc = render(
      <PageRenderer
        sections={[
          blockFor("legal_doc", { title: "T", html: "<h2>Zero</h2><h2>One</h2><p>x</p><h2>Two</h2><p>y</p>", showToc: true }),
        ]}
      />,
    ).container.innerHTML;
    cleanup();
    const without = render(
      <PageRenderer
        sections={[
          blockFor("legal_doc", { title: "T", html: "<h2>Zero</h2><h2>One</h2><p>x</p><h2>Two</h2><p>y</p>", showToc: false }),
        ]}
      />,
    ).container.innerHTML;
    expect(withToc, "showToc must change the rendered document").not.toBe(without);
  });

  it("a block whose fields are all exempt is a deliberate decision, not an oversight", () => {
    for (const entry of SECTION_REGISTRY) {
      if (entry.fields.length > 0) continue;
      // category_grid and column carry no content on purpose; the inspector says
      // so. Any NEW fieldless block type has to justify itself here.
      expect(["category_grid", "column"]).toContain(entry.type);
    }
  });
});

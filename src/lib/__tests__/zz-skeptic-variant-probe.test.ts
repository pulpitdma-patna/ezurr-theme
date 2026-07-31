import { describe, it, expect, beforeEach } from "vitest";
import { STORAGE_KEY } from "@/lib/adminStore";

describe("variant B read/write mismatch probe", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows where updateCmsBlock writes on an activeVariantId:B page", async () => {
    const mk = (id: string, html: string) => ({
      id,
      type: "rich_text",
      enabled: true,
      props: { html },
      layout: {},
    });
    const snap = {
      variants: [
        { id: "A", label: "A", trafficPct: 50, sections: [mk("a1", "<p>A copy</p>")] },
        { id: "B", label: "B", trafficPct: 50, sections: [mk("b1", "<p>B copy</p>")] },
      ],
      activeVariantId: "B",
      customCss: "",
      customJs: "",
    };
    const page = {
      id: "probe",
      title: "Probe",
      path: "/probe",
      status: "draft",
      updatedAt: new Date().toISOString(),
      draft: snap,
      published: null,
      revisions: [],
    };
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ cmsPages: [page] }),
    );

    const store = await import("@/lib/adminStore");
    const before = store.getCmsPage("probe")!;
    const canvasBefore = store.getDraftCmsSections(before);
    store.updateCmsBlock("probe", "a1", { props: { html: "<p>EDITED</p>" } });
    store.updateCmsBlock("probe", "b1", { props: { html: "<p>EDITED-B</p>" } });
    const after = store.getCmsPage("probe")!;

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          activeVariantId: after.draft.activeVariantId,
          canvasBefore: canvasBefore.map((s) => s.props),
          canvasAfter: store.getDraftCmsSections(after).map((s) => s.props),
          A: after.draft.variants.find((v) => v.id === "A")!.sections.map((s) => ({ id: s.id, props: s.props })),
          B: after.draft.variants.find((v) => v.id === "B")!.sections.map((s) => ({ id: s.id, props: s.props })),
          stranded: store.hasStrandedVariantB(after),
        },
        null,
        2,
      ),
    );
    expect(true).toBe(true);
  });
});

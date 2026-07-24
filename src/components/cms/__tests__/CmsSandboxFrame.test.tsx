import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { CmsSandboxFrame } from "@/components/cms/CmsSandboxFrame";

/**
 * The sandbox frame is the ONLY place admin-authored custom code runs. These
 * tests lock the security invariants: the iframe must be opaque-origin (never
 * allow-same-origin), it must point at the API sandbox endpoint, and it must
 * only accept a clamped height signal from its own frame at origin "null".
 */
describe("CmsSandboxFrame", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test");
    vi.stubEnv("NEXT_PUBLIC_CMS_SANDBOX_URL", "");
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("renders an opaque-origin sandbox iframe — NEVER allow-same-origin", () => {
    const { container } = render(
      <CmsSandboxFrame pageId="pg_1" variant="A" blockId="blk_1" />,
    );
    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    // The crown-jewel invariant: allow-scripts only, so the frame gets an
    // opaque origin and cannot read the storefront's cookies/localStorage/DOM.
    expect(iframe!.getAttribute("sandbox")).toBe("allow-scripts");
    expect(iframe!.getAttribute("sandbox")).not.toContain("allow-same-origin");
    expect(iframe!.getAttribute("referrerpolicy")).toBe("no-referrer");
  });

  it("points at the API sandbox endpoint with encoded params", () => {
    const { container } = render(
      <CmsSandboxFrame pageId="pg 1" variant="A" blockId="blk/1" />,
    );
    const iframe = container.querySelector("iframe")!;
    expect(iframe.getAttribute("src")).toBe(
      "https://api.test/api/cms/sandbox/pg%201/A/blk%2F1",
    );
  });

  it("renders nothing when no sandbox origin is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    vi.stubEnv("NEXT_PUBLIC_CMS_SANDBOX_URL", "");
    const { container } = render(
      <CmsSandboxFrame pageId="pg_1" variant="A" blockId="blk_1" />,
    );
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("accepts a clamped height only from its own frame at origin 'null'", () => {
    const { container } = render(
      <CmsSandboxFrame pageId="pg_1" variant="A" blockId="blk_1" />,
    );
    const iframe = container.querySelector("iframe")! as HTMLIFrameElement;
    const win = iframe.contentWindow;

    const post = (init: MessageEventInit) =>
      act(() => {
        window.dispatchEvent(new MessageEvent("message", init));
      });

    // Spoofed origin → ignored.
    post({ source: win, origin: "https://evil.test", data: { type: "ezurr-sandbox-height", height: 800 } });
    expect(iframe.style.height).toBe("120px");

    // Wrong message type → ignored.
    post({ source: win, origin: "null", data: { type: "nope", height: 800 } });
    expect(iframe.style.height).toBe("120px");

    // Valid signal from our frame at origin "null" → applied.
    post({ source: win, origin: "null", data: { type: "ezurr-sandbox-height", height: 640 } });
    expect(iframe.style.height).toBe("640px");

    // Over-large height is hard-clamped to the ceiling.
    post({ source: win, origin: "null", data: { type: "ezurr-sandbox-height", height: 999999 } });
    expect(iframe.style.height).toBe("4000px");
  });
});

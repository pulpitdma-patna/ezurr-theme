import { describe, it, expect, vi, afterEach } from "vitest";
import {
  fetchInstallNeedsSetup,
  shouldRedirectHomeToSetup,
  shouldShowConnectingScreen,
} from "@/lib/installState";

describe("shouldRedirectHomeToSetup", () => {
  it("redirects only when the API answered and the store needs setup", () => {
    expect(
      shouldRedirectHomeToSetup({ known: true, needsSetup: true, reason: "ok" }),
    ).toBe(true);
    expect(
      shouldRedirectHomeToSetup({ known: true, needsSetup: false, reason: "ok" }),
    ).toBe(false);
    expect(
      shouldRedirectHomeToSetup({ known: false, needsSetup: true, reason: "unreachable" }),
    ).toBe(false);
  });
});

describe("shouldShowConnectingScreen", () => {
  it("shows connecting whenever the API did not answer", () => {
    expect(
      shouldShowConnectingScreen({ known: false, needsSetup: false, reason: "missing_url" }),
    ).toBe(true);
    expect(
      shouldShowConnectingScreen({ known: false, needsSetup: false, reason: "unreachable" }),
    ).toBe(true);
    expect(
      shouldShowConnectingScreen({ known: true, needsSetup: false, reason: "ok" }),
    ).toBe(false);
  });
});

describe("fetchInstallNeedsSetup", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns unknown when the API URL is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    await expect(fetchInstallNeedsSetup()).resolves.toEqual({
      needsSetup: false,
      known: false,
      reason: "missing_url",
    });
  });

  it("reads needsSetup from a successful response", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ needsSetup: true }),
    })) as unknown as typeof fetch;

    await expect(fetchInstallNeedsSetup(fetchImpl)).resolves.toEqual({
      needsSetup: true,
      known: true,
      reason: "ok",
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/api/install/state",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("returns unknown when the API is unreachable", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
    const fetchImpl = vi.fn(async () => {
      throw new Error("network");
    }) as unknown as typeof fetch;

    await expect(fetchInstallNeedsSetup(fetchImpl)).resolves.toEqual({
      needsSetup: false,
      known: false,
      reason: "unreachable",
    });
  });
});

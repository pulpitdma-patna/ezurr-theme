import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchInstallNeedsSetup, shouldRedirectHomeToSetup } from "@/lib/installState";

describe("shouldRedirectHomeToSetup", () => {
  it("redirects only when the API answered and the store needs setup", () => {
    expect(shouldRedirectHomeToSetup({ known: true, needsSetup: true })).toBe(true);
    expect(shouldRedirectHomeToSetup({ known: true, needsSetup: false })).toBe(false);
    expect(shouldRedirectHomeToSetup({ known: false, needsSetup: true })).toBe(false);
  });
});

describe("fetchInstallNeedsSetup", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns unknown when the API URL is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    await expect(fetchInstallNeedsSetup()).resolves.toEqual({ needsSetup: false, known: false });
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
    });
  });
});

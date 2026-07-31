import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("accountStore init", () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    window.localStorage.clear();
  });

  it("seeds demo wishlist when the API is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    const { getAccountState, demoAccountState } = await import("@/lib/accountStore");
    const state = getAccountState();
    expect(state.wishlistKeys.length).toBeGreaterThan(0);
    expect(state.points).toBe(demoAccountState().points);
  });

  it("starts empty when the API URL is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
    const { getAccountState } = await import("@/lib/accountStore");
    const state = getAccountState();
    expect(state.wishlistKeys).toEqual([]);
    expect(state.addresses).toEqual([]);
    expect(state.points).toBe(0);
    expect(state.pointsLedger).toEqual([]);
  });

  it("does not overwrite an existing localStorage blob with demo seed", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
    window.localStorage.setItem(
      "ezurr_account_store",
      JSON.stringify({ wishlistKeys: ["kept-key"], points: 12 }),
    );
    const { getAccountState } = await import("@/lib/accountStore");
    const state = getAccountState();
    expect(state.wishlistKeys).toEqual(["kept-key"]);
    expect(state.points).toBe(12);
    expect(state.addresses).toEqual([]);
  });
});

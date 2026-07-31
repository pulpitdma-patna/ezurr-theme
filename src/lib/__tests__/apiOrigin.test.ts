import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  clearApiUrlOverride,
  getApiUrlOverride,
  isEzurrHealthBody,
  normalizeApiOrigin,
  probeSameOriginApiHealth,
  setApiUrlOverride,
} from "@/lib/apiOrigin";
import {
  getApiBaseUrl,
  getApiUpstreamUrl,
  isApiEnabled,
  isApiProxyEnabled,
} from "@/lib/apiClient";

describe("normalizeApiOrigin", () => {
  it("strips trailing slash and /api", () => {
    expect(normalizeApiOrigin("https://api.example.com/")).toBe("https://api.example.com");
    expect(normalizeApiOrigin("https://api.example.com/api")).toBe("https://api.example.com");
    expect(normalizeApiOrigin("https://api.example.com/api/")).toBe("https://api.example.com");
  });
});

describe("isEzurrHealthBody", () => {
  it("requires ok and service", () => {
    expect(isEzurrHealthBody({ ok: true, service: "ezurr-api" })).toBe(true);
    expect(isEzurrHealthBody({ ok: true })).toBe(false);
    expect(isEzurrHealthBody({ ok: false, service: "ezurr-api" })).toBe(false);
  });
});

describe("paste override", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    clearApiUrlOverride();
  });

  it("wins over env for client upstream and disables proxy", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://env.example.com");
    vi.stubEnv("NEXT_PUBLIC_API_PROXY", "1");
    setApiUrlOverride("https://override.example.com/api");
    expect(getApiUrlOverride()).toBe("https://override.example.com");
    expect(getApiUpstreamUrl()).toBe("https://override.example.com");
    expect(isApiProxyEnabled()).toBe(false);
    expect(getApiBaseUrl()).toBe("https://override.example.com");
    expect(isApiEnabled()).toBe(true);
  });

  it("enables the API when env is unset but override is set", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    setApiUrlOverride("https://api.example.com");
    expect(isApiEnabled()).toBe(true);
    expect(getApiBaseUrl()).toBe("https://api.example.com");
  });
});

describe("probeSameOriginApiHealth", () => {
  it("returns true for Ezurr health JSON", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, service: "ezurr-api" }),
    })) as unknown as typeof fetch;
    await expect(probeSameOriginApiHealth(fetchImpl)).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/health",
      expect.objectContaining({ cache: "no-store" }),
    );
  });
});

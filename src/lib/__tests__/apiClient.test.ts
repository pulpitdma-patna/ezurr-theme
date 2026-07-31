import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getApiBaseUrl,
  getApiUpstreamUrl,
  isApiEnabled,
  isApiProxyEnabled,
  apiFetch,
  ApiError,
  setApiToken,
} from "@/lib/apiClient";

function mockResponse(status: number, body: string) {
  return { ok: status >= 200 && status < 300, status, text: async () => body };
}

describe("getApiBaseUrl / isApiEnabled", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns null and disabled when the URL is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    window.localStorage.clear();
    window.sessionStorage.clear();
    expect(getApiBaseUrl()).toBeNull();
    expect(isApiEnabled()).toBe(false);
  });

  it("strips a trailing slash and enables the API", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000/");
    vi.stubEnv("NEXT_PUBLIC_API_PROXY", "0");
    expect(getApiBaseUrl()).toBe("http://localhost:8000");
    expect(getApiUpstreamUrl()).toBe("http://localhost:8000");
    expect(isApiEnabled()).toBe(true);
  });

  it("uses same-origin base in the browser when the proxy flag is on", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
    vi.stubEnv("NEXT_PUBLIC_API_PROXY", "1");
    expect(isApiProxyEnabled()).toBe(true);
    expect(getApiUpstreamUrl()).toBe("https://api.example.com");
    // jsdom provides window, so proxy mode returns "".
    expect(getApiBaseUrl()).toBe("");
  });
});

describe("apiFetch", () => {
  beforeEach(() => setApiToken(null));
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    setApiToken(null);
  });

  it("throws ApiError when the API URL is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    await expect(apiFetch("/x")).rejects.toBeInstanceOf(ApiError);
  });

  it("prefixes /api, injects a Bearer token, and parses JSON", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test");
    vi.stubEnv("NEXT_PUBLIC_API_PROXY", "0");
    setApiToken("tok123");
    const fetchMock = vi.fn(async () => mockResponse(200, JSON.stringify({ ok: true })));
    vi.stubGlobal("fetch", fetchMock);

    const res = await apiFetch<{ ok: boolean }>("/health");
    expect(res.ok).toBe(true);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://api.test/api/health");
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer tok123");
    expect((init.headers as Headers).get("Accept")).toBe("application/json");
  });

  it("calls same-origin /api when the proxy is enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
    vi.stubEnv("NEXT_PUBLIC_API_PROXY", "1");
    const fetchMock = vi.fn(async () => mockResponse(200, JSON.stringify({ ok: true })));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/health");
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe("/api/health");
  });

  it("uses body.message for the ApiError message", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test");
    vi.stubEnv("NEXT_PUBLIC_API_PROXY", "0");
    vi.stubGlobal("fetch", vi.fn(async () => mockResponse(422, JSON.stringify({ message: "Nope" }))));
    await expect(apiFetch("/x")).rejects.toMatchObject({ status: 422, message: "Nope" });
  });

  it("falls back to 'API {status}' when there is no message", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test");
    vi.stubEnv("NEXT_PUBLIC_API_PROXY", "0");
    vi.stubGlobal("fetch", vi.fn(async () => mockResponse(500, "")));
    await expect(apiFetch("/x")).rejects.toMatchObject({ status: 500, message: "API 500" });
  });
});

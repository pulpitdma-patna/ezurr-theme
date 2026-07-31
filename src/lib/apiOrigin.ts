/**
 * Browser-side API origin discovery and paste override.
 *
 * Production builds still bake NEXT_PUBLIC_API_URL for Next rewrites / RSC.
 * The browser can additionally:
 *   1. Discover the API via same-origin `/api/health` (proxy working)
 *   2. Persist a one-time pasted Laravel origin when the proxy/env path fails
 */

export const API_URL_OVERRIDE_KEY = "ezurr_api_url_override";
export const API_SAME_ORIGIN_KEY = "ezurr_api_same_origin";

/** Strip trailing slash and a trailing `/api` so operators can paste either form. */
export function normalizeApiOrigin(raw: string): string {
  let url = raw.trim().replace(/\/+$/, "");
  if (url.toLowerCase().endsWith("/api")) {
    url = url.slice(0, -4).replace(/\/+$/, "");
  }
  return url;
}

export function getEnvApiUpstreamUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return null;
  return normalizeApiOrigin(raw);
}

export function getApiUrlOverride(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(API_URL_OVERRIDE_KEY)?.trim();
  if (!raw) return null;
  return normalizeApiOrigin(raw);
}

export function setApiUrlOverride(url: string): string {
  const normalized = normalizeApiOrigin(url);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(API_URL_OVERRIDE_KEY, normalized);
    window.sessionStorage.removeItem(API_SAME_ORIGIN_KEY);
  }
  return normalized;
}

export function clearApiUrlOverride(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(API_URL_OVERRIDE_KEY);
}

export function hasApiUrlOverride(): boolean {
  return getApiUrlOverride() !== null;
}

export function isSameOriginApiDiscovered(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(API_SAME_ORIGIN_KEY) === "1";
}

export function markSameOriginApiDiscovered(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(API_SAME_ORIGIN_KEY, "1");
}

export function clearSameOriginApiDiscovered(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(API_SAME_ORIGIN_KEY);
}

/** True when the JSON looks like Ezurr's public health payload. */
export function isEzurrHealthBody(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const row = body as { ok?: unknown; service?: unknown };
  return row.ok === true && row.service === "ezurr-api";
}

/**
 * Probe same-origin `/api/health`. When the Next rewrite is live, the browser
 * does not need to know the Cloudways origin.
 */
export async function probeSameOriginApiHealth(
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetchImpl("/api/health", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const body: unknown = await res.json();
    return isEzurrHealthBody(body);
  } catch {
    return false;
  }
}

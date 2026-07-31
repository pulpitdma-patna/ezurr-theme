import { getApiUpstreamUrl } from "@/lib/apiClient";

export type InstallProbeReason = "missing_url" | "unreachable" | "http_error" | "ok";

export type InstallNeedsSetupResult = {
  needsSetup: boolean;
  /** True when the API answered; false when unreachable / unset. */
  known: boolean;
  reason: InstallProbeReason;
};

/**
 * Whether the storefront should send visitors to /setup.
 *
 * Uses the absolute API upstream (not the same-origin proxy) so this works in
 * RSC / server components where Next rewrites are not applied to server fetch.
 * Unreachable API → known:false so the homepage can show a connecting screen
 * instead of a fake shop.
 */
export async function fetchInstallNeedsSetup(
  fetchImpl: typeof fetch = fetch,
): Promise<InstallNeedsSetupResult> {
  const base = getApiUpstreamUrl();
  if (!base) return { needsSetup: false, known: false, reason: "missing_url" };

  try {
    const res = await fetchImpl(`${base}/api/install/state`, {
      headers: { Accept: "application/json" },
      // Always re-check: claim closes the window permanently.
      cache: "no-store",
    });
    if (!res.ok) return { needsSetup: false, known: false, reason: "http_error" };
    const body = (await res.json()) as { needsSetup?: unknown };
    return {
      needsSetup: body.needsSetup === true,
      known: true,
      reason: "ok",
    };
  } catch {
    return { needsSetup: false, known: false, reason: "unreachable" };
  }
}

/** Pure decision used by the homepage and unit tests. */
export function shouldRedirectHomeToSetup(result: InstallNeedsSetupResult): boolean {
  return result.known && result.needsSetup;
}

/** API URL missing or API unreachable — do not render a fake shop. */
export function shouldShowConnectingScreen(result: InstallNeedsSetupResult): boolean {
  return !result.known;
}

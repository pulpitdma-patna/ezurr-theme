import { ApiError } from "@/lib/apiClient";

/**
 * Turn a thrown API error into something a shop owner can act on.
 *
 * Admin screens catch with a bare `catch {}` and show a fixed string — "Could
 * not update rule", "Could not save rule". An expired session, a permission
 * problem, a validation error and a dead network all read identically, and the
 * one that happens most often (the session expiring while a tab sits open) has a
 * fix the owner will never guess from that sentence.
 *
 * The CMS already learned this lesson; `cmsApi.toCmsError` is the same idea
 * scoped to pages. This is the general version for the rest of the admin.
 *
 * @param fallback What to say when the failure has no better explanation.
 */
export function adminErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) {
    return "Couldn't reach the store server. Check your connection and try again.";
  }

  const body = err.body as
    | { message?: string; errors?: Record<string, string[]> }
    | null;
  const firstFieldError = body?.errors
    ? Object.values(body.errors)[0]?.[0]
    : undefined;

  switch (err.status) {
    case 0:
      return "The store server isn't configured.";
    case 401:
      return "Your session has expired. Sign in again, then try once more.";
    case 403:
      return "You don't have permission to change this.";
    case 404:
      return "That item no longer exists — someone may have deleted it.";
    case 409:
      return "This was changed somewhere else since you opened it. Reload and try again.";
    case 422:
      return firstFieldError ?? body?.message ?? fallback;
    case 429:
      return "Too many changes too quickly. Wait a moment and try again.";
    default:
      return body?.message ?? fallback;
  }
}

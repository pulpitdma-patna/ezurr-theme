import { ApiError, apiFetch, isApiEnabled } from "@/lib/apiClient";
import type { CmsPageDocument } from "@/lib/cms/types";

/**
 * Every CMS write in one place, with one error vocabulary.
 *
 * The old code called `api.upsertCmsPage(...).catch(() => {})` from a button
 * handler and popped a success toast before the request resolved. A colliding
 * path, an expired session and a dead network all looked identical to the
 * owner: "Published ✓", and a page that was never saved.
 *
 * Nothing here swallows a failure. Callers get a discriminated result and a
 * message written for a shop owner rather than a developer.
 */

export type CmsResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: CmsError };

export type CmsError = {
  /** Owner-readable. Safe to render directly. */
  message: string;
  /** Set when the failure belongs beside a specific field, not in a toast. */
  field?: "path" | "title" | "document";
  kind: "validation" | "conflict" | "permission" | "offline" | "unknown";
  status?: number;
};

export type CmsPageSummary = {
  id: string;
  path: string;
  title: string;
  status: "draft" | "published";
  updatedAt: string | null;
  /** Set when a future go-live is pending — otherwise this reads as "Draft". */
  publishAt?: string | null;
  unpublishAt?: string | null;
  publishedAt?: string | null;
  /** Live, but the draft has moved on since. Answered from the two hashes. */
  hasUnpublishedChanges?: boolean;
};

export type CmsRevisionSummary = {
  id: string;
  revision: number;
  kind: "save" | "publish" | "rollback" | "import" | "delete";
  label: string | null;
  author: string | null;
  createdAt: string | null;
};

/** Translate a thrown ApiError into something worth showing a shop owner. */
function toCmsError(err: unknown): CmsError {
  if (!(err instanceof ApiError)) {
    return {
      kind: "offline",
      message:
        "Couldn't reach the store server. Your changes are still on this device — we'll try again.",
    };
  }

  const body = err.body as { message?: string; errors?: Record<string, string[]> } | null;
  const first = body?.errors ? Object.entries(body.errors)[0] : undefined;

  switch (err.status) {
    case 0:
      return { kind: "offline", status: 0, message: "The store server isn't configured." };
    case 401:
      return {
        kind: "permission",
        status: 401,
        message: "Your session has expired. Sign in again to keep editing.",
      };
    case 403:
      return {
        kind: "permission",
        status: 403,
        message: "You don't have permission to change this page.",
      };
    case 409:
      return {
        kind: "conflict",
        status: 409,
        message: "This page was changed somewhere else since you opened it.",
      };
    case 413:
      return {
        kind: "validation",
        status: 413,
        field: "document",
        message: "This page is too large to save. Try splitting it into two pages.",
      };
    case 422: {
      // The path collision is the one an author hits by accident, and it belongs
      // next to the field rather than in a toast that disappears.
      const key = first?.[0] ?? "";
      const field = key.startsWith("path")
        ? "path"
        : key.startsWith("title")
          ? "title"
          : key.startsWith("document")
            ? "document"
            : undefined;
      return {
        kind: "validation",
        status: 422,
        field,
        message: first?.[1]?.[0] ?? body?.message ?? "That page couldn't be saved.",
      };
    }
    default:
      return {
        kind: "unknown",
        status: err.status,
        message: body?.message ?? "Something went wrong saving this page.",
      };
  }
}

async function run<T>(fn: () => Promise<T>): Promise<CmsResult<T>> {
  if (!isApiEnabled()) {
    return {
      ok: false,
      error: { kind: "offline", message: "The store server isn't configured." },
    };
  }
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    return { ok: false, error: toCmsError(err) };
  }
}

/** Save the draft. Never publishes — the server ignores status entirely. */
export function saveDraft(
  page: CmsPageDocument,
  opts: { keepalive?: boolean } = {},
): Promise<CmsResult<CmsPageSummary>> {
  return run(() =>
    apiFetch<CmsPageSummary>("/admin/cms/pages", {
      method: "POST",
      keepalive: opts.keepalive,
      body: JSON.stringify({
        id: page.id,
        path: page.path,
        title: page.title,
        document: page,
        // Top-level, not inside `document`: these are columns on the server,
        // so their length limits are enforced by the database and a meta-tag
        // edit never touches the snapshot that publish and rollback move.
        ...(page.seo
          ? {
              metaTitle: page.seo.metaTitle,
              metaDescription: page.seo.metaDescription,
              ogImageUrl: page.seo.ogImageUrl,
              canonicalUrl: page.seo.canonicalUrl,
              robots: page.seo.robots,
            }
          : {}),
      }),
    }),
  );
}

/** Copy the stored draft into the live snapshot. */
export function publishPage(
  publicId: string,
  when: { publishAt?: string; unpublishAt?: string } = {},
): Promise<CmsResult<CmsPageSummary>> {
  return run(() =>
    apiFetch<CmsPageSummary>(`/admin/cms/pages/${encodeURIComponent(publicId)}/publish`, {
      method: "POST",
      body: JSON.stringify(when),
    }),
  );
}

export function unpublishPage(publicId: string): Promise<CmsResult<CmsPageSummary>> {
  return run(() =>
    apiFetch<CmsPageSummary>(`/admin/cms/pages/${encodeURIComponent(publicId)}/unpublish`, {
      method: "POST",
    }),
  );
}

export function loadPage(publicId: string): Promise<CmsResult<CmsPageDocument>> {
  return run(() =>
    apiFetch<CmsPageDocument>(`/admin/cms/pages/${encodeURIComponent(publicId)}`),
  );
}

export function listPages(): Promise<CmsResult<CmsPageSummary[]>> {
  return run(() =>
    apiFetch<{ data: CmsPageSummary[] }>("/admin/cms/pages").then((r) => r.data),
  );
}

export function deletePage(publicId: string): Promise<CmsResult<{ ok: boolean }>> {
  return run(() =>
    apiFetch<{ ok: boolean }>(`/admin/cms/pages/${encodeURIComponent(publicId)}`, {
      method: "DELETE",
    }),
  );
}

export function listRevisions(
  publicId: string,
): Promise<CmsResult<{ data: CmsRevisionSummary[]; publishedRevisionId: string | null }>> {
  return run(() =>
    apiFetch<{ data: CmsRevisionSummary[]; publishedRevisionId: string | null }>(
      `/admin/cms/pages/${encodeURIComponent(publicId)}/revisions`,
    ),
  );
}

export function restoreRevision(
  publicId: string,
  revisionId: string,
): Promise<CmsResult<CmsPageSummary>> {
  return run(() =>
    apiFetch<CmsPageSummary>(
      `/admin/cms/pages/${encodeURIComponent(publicId)}/revisions/${encodeURIComponent(revisionId)}/rollback`,
      { method: "POST" },
    ),
  );
}

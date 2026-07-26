"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useAdminToast } from "@/components/admin/AdminToast";
import { formatAdminDateTime } from "@/lib/adminFormat";
import { isApiEnabled } from "@/lib/apiClient";
import { listPages, deletePage as deletePage_, type CmsPageSummary } from "@/lib/cms/cmsApi";
import { useCmsPages } from "@/hooks/useCmsStore";
import type { CmsPageDocument, PageRevisionSnapshot } from "@/lib/cms/types";
import {
  createCmsPage,
  deleteCmsPage,
  duplicateCmsPage,
  getCmsPage,
  publishCmsPage,
  setAdminState,
  unpublishCmsPage,
} from "@/lib/adminStore";

// Persist a page's structured document to the server (executable JS is stripped
// server-side before it can ever reach the storefront).

function isSnapshot(value: unknown): value is PageRevisionSnapshot {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as PageRevisionSnapshot).variants)
  );
}

/**
 * Coerce a stored server document into the editor's shape. The server persists
 * whatever the client sent, so anything without a usable draft snapshot is
 * skipped rather than imported as a broken page.
 */
function toPageDocument(raw: Record<string, unknown>): CmsPageDocument | null {
  const draft = raw.draft;
  if (!isSnapshot(draft)) return null;
  const status = raw.status === "published" ? "published" : "draft";
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? "Untitled page"),
    path: String(raw.path ?? ""),
    status,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
    draft,
    published: isSnapshot(raw.published) ? raw.published : null,
    revisions: Array.isArray(raw.revisions) ? (raw.revisions as CmsPageDocument["revisions"]) : [],
  };
}

export default function AdminCmsPagesPage() {
  const pages = useCmsPages();
  const toast = useAdminToast();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [deletePage, setDeletePage] = useState<{ id: string; title: string } | null>(null);
  const [summaries, setSummaries] = useState<CmsPageSummary[]>([]);
  const [syncState, setSyncState] = useState<"idle" | "loading" | "synced" | "error">(
    isApiEnabled() ? "loading" : "idle",
  );

  /**
   * The server is the source of truth once the API is on: pull every stored
   * document into the editor store so seeded pages are editable, and so
   * publishing pushes the server copy back instead of a stale local draft.
   */
  /**
   * Load the LIST only — never the documents.
   *
   * This used to fetch every page's full document and do
   * `byId.set(doc.id, doc)`, replacing each local copy wholesale, draft
   * included, with no dirty check. Since the builder saved only to
   * localStorage, coming back to this screen silently threw away everything
   * the owner had just written.
   *
   * The builder now loads and saves its own page against the server, so this
   * screen only needs titles, paths and statuses. It cannot overwrite an edit
   * because it no longer touches drafts at all.
   */
  const hydrateFromApi = useCallback(async () => {
    if (!isApiEnabled()) return;
    setSyncState("loading");
    const res = await listPages();
    if (!res.ok) {
      setSyncState("error");
      return;
    }
    setSummaries(res.data);
    setSyncState("synced");
  }, []);

  useEffect(() => {
    void hydrateFromApi();
  }, [hydrateFromApi]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Pages"
        description="Build storefront pages with a section builder — homepage, landings, and custom modules."
      />

      {isApiEnabled() ? (
        <AdminNotice tone={syncState === "error" ? "error" : "info"}>
          {syncState === "error" ? (
            <>
              Could not load pages from the server — you are editing local drafts.
              Publishing now would overwrite the server copy.{" "}
              <button
                type="button"
                onClick={() => void hydrateFromApi()}
                className="font-semibold underline"
              >
                Retry
              </button>
            </>
          ) : (
            <>
              {syncState === "loading"
                ? "Loading pages from the server…"
                : "Pages are loaded from the server."}{" "}
              Publishing saves the structured content back. Custom JS/CSS is kept
              for editing but only runs inside the storefront sandbox.
            </>
          )}
        </AdminNotice>
      ) : null}

      <div className="rounded-2xl border border-black/[0.07] bg-white p-5">
        <p className="text-sm font-semibold text-[#1D1D1F]">Create page</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slug) {
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, ""),
                );
              }
            }}
            placeholder="Title"
            className="min-h-11 flex-1 rounded-xl border border-black/[0.1] px-3 text-sm outline-none focus:border-[#1D1D1F]"
          />
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug"
            className="min-h-11 w-full rounded-xl border border-black/[0.1] px-3 text-sm outline-none focus:border-[#1D1D1F] sm:w-48"
          />
          <button
            type="button"
            onClick={() => {
              if (!title.trim()) return;
              const id = createCmsPage(title.trim(), slug.trim() || title.trim());
              toast.push("Page created", "success");
              setTitle("");
              setSlug("");
              window.location.href = `/admin/cms/${id}`;
            }}
            className="min-h-11 rounded-xl bg-[#1D1D1F] px-5 text-sm font-semibold text-white"
          >
            Create
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/[0.07] bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-black/[0.06] bg-[#F8F8FA] text-[11px] uppercase tracking-[0.1em] text-[#86868B]">
            <tr>
              <th className="px-4 py-3 font-semibold">Page</th>
              <th className="px-4 py-3 font-semibold">Path</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Updated</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id} className="border-b border-black/[0.05] last:border-0">
                <td className="px-4 py-3.5">
                  <Link
                    href={`/admin/cms/${page.id}`}
                    className="font-semibold text-[#1D1D1F] hover:underline"
                  >
                    {page.title}
                  </Link>
                </td>
                <td className="ez-mono px-4 py-3.5 text-xs text-[#6E6E73]">{page.path}</td>
                <td className="px-4 py-3.5">
                  {/* Status comes from the SERVER, not the local copy — the
                      local one said "published" the moment you pressed a button
                      that had not reached anything. */}
                  {(() => {
                    const live =
                      summaries.find((s) => s.id === page.id)?.status ?? page.status;
                    return (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          live === "published"
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-[#F0F0F2] text-[#6E6E73]"
                        }`}
                      >
                        {live === "published" ? "Live" : "Draft"}
                      </span>
                    );
                  })()}
                </td>
                <td className="ez-mono px-4 py-3.5 text-[11px] text-[#A1A1A6]">
                  {formatAdminDateTime(page.updatedAt)}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Link
                      href={`/admin/cms/${page.id}`}
                      className="rounded-lg border border-black/[0.1] px-2.5 py-1 text-[11px] font-semibold hover:bg-[#F5F5F7]"
                    >
                      Edit
                    </Link>
                    {/* Publish and Unpublish live in the builder now. Having
                        them here is what created the trap where a published
                        page offered only "Unpublish", so the way to save your
                        work was to take the page down and put it back up. */}
                    <button
                      type="button"
                      onClick={() => {
                        const id = duplicateCmsPage(page.id);
                        toast.push("Duplicated", "success");
                        if (id) window.location.href = `/admin/cms/${id}`;
                      }}
                      className="rounded-lg border border-black/[0.1] px-2.5 py-1 text-[11px] font-semibold hover:bg-[#F5F5F7]"
                    >
                      Duplicate
                    </button>
                    {page.id !== "home" ? (
                      <button
                        type="button"
                        onClick={() => setDeletePage({ id: page.id, title: page.title })}
                        className="rounded-lg border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href="/admin/cms/code"
          className="rounded-full border border-black/[0.1] bg-white px-4 py-2 font-semibold hover:bg-[#F5F5F7]"
        >
          Global custom code →
        </Link>
        <Link
          href="/admin/settings#appearance"
          className="rounded-full border border-black/[0.1] bg-white px-4 py-2 font-semibold hover:bg-[#F5F5F7]"
        >
          Appearance settings →
        </Link>
      </div>

      <ConfirmDialog
        open={deletePage !== null}
        title="Delete page?"
        description={`"${deletePage?.title ?? "This page"}" will be removed. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onCancel={() => setDeletePage(null)}
        onConfirm={async () => {
          const target = deletePage;
          setDeletePage(null);
          if (!target) return;
          deleteCmsPage(target.id);
          if (!isApiEnabled()) {
            toast.push("Deleted", "success");
            return;
          }
          // The server refuses to delete a published page, which is a real
          // answer the owner needs to see — not something to swallow.
          const res = await deletePage_(target.id);
          toast.push(res.ok ? "Deleted" : res.error.message, res.ok ? "success" : "danger");
          if (res.ok) void hydrateFromApi();
        }}
      />
    </div>
  );
}

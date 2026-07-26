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
} from "@/lib/adminStore";

// Persist a page's structured document to the server (executable JS is stripped
// server-side before it can ever reach the storefront).

/** Matches CategoryTemplateSeeder::PUBLIC_ID. */
const CATEGORY_TEMPLATE_ID = "category-template";

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

export default function AdminCmsPagesPage() {
  const pages = useCmsPages();
  const apiOn = isApiEnabled();
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

  /**
   * The list renders the SERVER's pages.
   *
   * It used to render `useCmsPages()` — the localStorage store, seeded with one
   * hardcoded homepage — and only borrow `status` from the server. So every page
   * created outside this browser was invisible here: the six seeded policy pages,
   * the real homepage row, and the category template. The owner could reach them
   * only by typing a URL they had no way to know.
   *
   * Mock mode (API off) still renders the local store, which is the only thing
   * that exists there.
   */
  const rows = apiOn
    ? summaries.map((s) => ({
        id: s.id,
        title: s.title,
        path: s.path,
        status: s.status,
        updatedAt: s.updatedAt ?? "",
        publishAt: s.publishAt ?? null,
        hasUnpublishedChanges: Boolean(s.hasUnpublishedChanges),
      }))
    : pages.map((p) => ({
        id: p.id,
        title: p.title,
        path: p.path,
        status: p.status,
        updatedAt: p.updatedAt,
        publishAt: null as string | null,
        hasUnpublishedChanges: false,
      }));

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
              Couldn&apos;t load your pages from the server. This list may be out
              of date — open a page to see its real state.{" "}
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
                ? "Loading your pages…"
                : "Open a page to edit it. Changes save as you work; use Publish inside the editor to put them live."}
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
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-[#6E6E73]">
                  {syncState === "loading" ? "Loading your pages…" : "No pages yet."}
                </td>
              </tr>
            ) : null}
            {rows.map((page) => {
              // Pages the store needs to function. Editable, but deleting one
              // would take the homepage down or leave every category page with no
              // layout, so the button is not offered.
              const isSystemPage = page.id === "home" || page.id === CATEGORY_TEMPLATE_ID;
              return (
              <tr key={page.id} className="border-b border-black/[0.05] last:border-0">
                <td className="px-4 py-3.5">
                  <Link
                    href={`/admin/cms/${page.id}`}
                    className="font-semibold text-[#1D1D1F] hover:underline"
                  >
                    {page.title}
                  </Link>
                  {page.id === CATEGORY_TEMPLATE_ID ? (
                    <span className="mt-0.5 block text-[11px] leading-snug text-[#86868B]">
                      The layout every category page uses — edit once, applies to
                      all of them.
                    </span>
                  ) : null}
                  {page.id === "home" ? (
                    <span className="mt-0.5 block text-[11px] text-[#86868B]">
                      Your storefront home page.
                    </span>
                  ) : null}
                </td>
                <td className="ez-mono px-4 py-3.5 text-xs text-[#6E6E73]">{page.path}</td>
                <td className="px-4 py-3.5">
                  {/* Four states, not two. "Draft" for a page with a pending
                      go-live, or a live page with unsaved edits, is true and
                      useless on its own. */}
                  {(() => {
                    const [label, tone] = page.publishAt
                      ? [
                          `Scheduled ${formatAdminDateTime(page.publishAt)}`,
                          "bg-sky-50 text-sky-900",
                        ]
                      : page.status === "published" && page.hasUnpublishedChanges
                        ? ["Live · edits pending", "bg-amber-50 text-amber-900"]
                        : page.status === "published"
                          ? ["Live", "bg-emerald-50 text-emerald-800"]
                          : ["Draft", "bg-[#F0F0F2] text-[#6E6E73]"];
                    return (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}
                      >
                        {label}
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
                    {!isSystemPage ? (
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
                    ) : null}
                    {!isSystemPage ? (
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
              );
            })}
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

"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useAdminToast } from "@/components/admin/AdminToast";
import { api, isApiEnabled } from "@/lib/apiClient";
import { useCmsPages } from "@/hooks/useCmsStore";
import {
  createCmsPage,
  deleteCmsPage,
  duplicateCmsPage,
  getCmsPage,
  publishCmsPage,
  unpublishCmsPage,
} from "@/lib/adminStore";

// Persist a page's structured document to the server (executable JS is stripped
// server-side before it can ever reach the storefront).
function syncCmsPageToApi(id: string) {
  if (!isApiEnabled()) return;
  const doc = getCmsPage(id);
  if (!doc) return;
  void api
    .upsertCmsPage({
      id: doc.id,
      path: doc.path,
      title: doc.title,
      status: doc.status,
      document: doc as unknown as Record<string, unknown>,
    })
    .catch(() => {});
}

export default function AdminCmsPagesPage() {
  const pages = useCmsPages();
  const toast = useAdminToast();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [deletePage, setDeletePage] = useState<{ id: string; title: string } | null>(null);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Pages"
        description="Build storefront pages with a section builder — homepage, landings, and custom modules."
      />

      {isApiEnabled() ? (
        <AdminNotice tone="info">
          Publishing a page saves its structured content to the server. Custom
          JS/CSS is kept for editing but is not served to the storefront yet
          (pending a security sandbox).
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
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      page.status === "published"
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-[#F0F0F2] text-[#6E6E73]"
                    }`}
                  >
                    {page.status}
                  </span>
                </td>
                <td className="ez-mono px-4 py-3.5 text-[11px] text-[#A1A1A6]">
                  {new Date(page.updatedAt).toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Link
                      href={`/admin/cms/${page.id}`}
                      className="rounded-lg border border-black/[0.1] px-2.5 py-1 text-[11px] font-semibold hover:bg-[#F5F5F7]"
                    >
                      Edit
                    </Link>
                    {page.published ? (
                      page.id !== "home" ? (
                        <button
                          type="button"
                          onClick={() => {
                            unpublishCmsPage(page.id);
                            syncCmsPageToApi(page.id);
                            toast.push("Unpublished", "neutral");
                          }}
                          className="rounded-lg border border-black/[0.1] px-2.5 py-1 text-[11px] font-semibold hover:bg-[#F5F5F7]"
                        >
                          Unpublish
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            publishCmsPage(page.id);
                            syncCmsPageToApi(page.id);
                            toast.push("Re-published", "success");
                          }}
                          className="rounded-lg border border-black/[0.1] px-2.5 py-1 text-[11px] font-semibold hover:bg-[#F5F5F7]"
                        >
                          Re-publish
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          publishCmsPage(page.id);
                          syncCmsPageToApi(page.id);
                          toast.push("Published", "success");
                        }}
                        className="rounded-lg border border-black/[0.1] px-2.5 py-1 text-[11px] font-semibold hover:bg-[#F5F5F7]"
                      >
                        Publish
                      </button>
                    )}
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
          href="/admin/cms/widgets"
          className="rounded-full border border-black/[0.1] bg-white px-4 py-2 font-semibold hover:bg-[#F5F5F7]"
        >
          Widget marketplace →
        </Link>
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
        onConfirm={() => {
          if (deletePage) {
            const id = deletePage.id;
            deleteCmsPage(id);
            if (isApiEnabled()) void api.deleteCmsPage(id).catch(() => {});
            toast.push("Deleted", "success");
          }
          setDeletePage(null);
        }}
      />
    </div>
  );
}

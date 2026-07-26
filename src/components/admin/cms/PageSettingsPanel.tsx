"use client";

import { useState } from "react";
import { MediaLibraryPicker } from "@/components/admin/MediaLibraryPicker";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { updateCmsPageMeta, updateCmsPageSeo, getDraftCmsSections } from "@/lib/adminStore";
import { summarizeSections } from "@/lib/cms/publicPages";
import { DEFAULT_CMS_SEO, type CmsPageDocument } from "@/lib/cms/types";

/**
 * The "Page" tab of the builder's right rail.
 *
 * With nothing selected that rail was 300px of "Select a section on the
 * canvas" — while the page's own title, address and search-engine fields had
 * no UI at all. `updateCmsPageMeta` had existed unused since the CMS shipped,
 * and the SEO columns were write-only from the server's side.
 *
 * Everything here saves through the same autosave as a block edit; nothing
 * publishes.
 */

function slugFromPath(path: string): string {
  return path.replace(/^\/pages\//, "").replace(/^\//, "");
}

function Counter({ value, max }: { value: string; max: number }) {
  const n = value.length;
  return (
    <span
      className={`ez-mono text-[10px] ${
        n > max ? "text-red-700" : n > max * 0.9 ? "text-amber-700" : "text-[#A1A1A6]"
      }`}
    >
      {n}/{max}
    </span>
  );
}

export function PageSettingsPanel({ page }: { page: CmsPageDocument }) {
  const seo = { ...DEFAULT_CMS_SEO, ...(page.seo ?? {}) };
  const isHome = page.id === "home";
  const [slug, setSlug] = useState(slugFromPath(page.path));
  const [renameTo, setRenameTo] = useState<string | null>(null);

  const commitSlug = (nextSlug: string) => {
    const clean = nextSlug
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!clean || clean === slugFromPath(page.path)) {
      setSlug(slugFromPath(page.path));
      return;
    }
    // A published page's URL is in Google, in WhatsApp forwards, and possibly
    // printed on an invoice. Changing it is not a text-field edit.
    if (page.status === "published") {
      setRenameTo(clean);
      return;
    }
    updateCmsPageMeta(page.id, { path: `/pages/${clean}` });
    setSlug(clean);
  };

  const useFirstParagraph = () => {
    const text = summarizeSections(getDraftCmsSections(page));
    if (text) updateCmsPageSeo(page.id, { metaDescription: text });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-black/[0.06] px-3 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868B]">
          Page
        </p>
        <h3 className="mt-1 text-sm font-semibold text-[#1D1D1F]">{page.title}</h3>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
        <label className="block">
          <span className="text-[11px] font-semibold text-[#6E6E73]">Title</span>
          <input
            className="mt-1 w-full rounded-lg border border-black/[0.1] bg-white px-2.5 py-2 text-xs outline-none focus:border-[#1D1D1F]"
            value={page.title}
            onChange={(e) => updateCmsPageMeta(page.id, { title: e.target.value })}
          />
        </label>

        <div>
          <span className="text-[11px] font-semibold text-[#6E6E73]">Web address</span>
          {isHome ? (
            <p className="ez-mono mt-1 rounded-lg bg-[#F5F5F7] px-2.5 py-2 text-[11px] text-[#6E6E73]">
              yourstore.com/
              <span className="text-[#A1A1A6]"> — the home page can&apos;t be moved</span>
            </p>
          ) : (
            <div className="mt-1 flex items-center rounded-lg border border-black/[0.1] bg-white pl-2.5">
              <span className="ez-mono shrink-0 text-[11px] text-[#A1A1A6]">
                /pages/
              </span>
              <input
                className="ez-mono w-full min-w-0 bg-transparent py-2 pr-2.5 text-[11px] outline-none"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                onBlur={(e) => commitSlug(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
              />
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-xl border border-black/[0.06] bg-[#F8F8FA] p-3">
          <p className="m-0 text-[11px] font-semibold text-[#6E6E73]">
            How this page looks on Google
          </p>

          {/* A real preview beats two labelled boxes: the point of a meta title
              is what it looks like in a result, and that is where truncation
              actually bites. */}
          <div className="rounded-lg border border-black/[0.06] bg-white p-2.5">
            <p className="m-0 truncate text-[13px] text-[#1a0dab]">
              {seo.metaTitle || page.title}
            </p>
            <p className="ez-mono m-0 truncate text-[10px] text-[#006621]">
              yourstore.com{page.path}
            </p>
            <p className="m-0 mt-0.5 line-clamp-2 text-[11px] leading-snug text-[#545454]">
              {seo.metaDescription || (
                <span className="text-[#A1A1A6]">
                  No description yet — Google will pick a sentence off the page.
                </span>
              )}
            </p>
          </div>

          <label className="block">
            <span className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#6E6E73]">
                Search title
              </span>
              <Counter value={seo.metaTitle ?? ""} max={70} />
            </span>
            <input
              className="mt-1 w-full rounded-lg border border-black/[0.1] bg-white px-2.5 py-2 text-xs outline-none focus:border-[#1D1D1F]"
              value={seo.metaTitle ?? ""}
              maxLength={70}
              placeholder={page.title}
              onChange={(e) =>
                updateCmsPageSeo(page.id, { metaTitle: e.target.value || null })
              }
            />
          </label>

          <label className="block">
            <span className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#6E6E73]">
                Description
              </span>
              <Counter value={seo.metaDescription ?? ""} max={200} />
            </span>
            <textarea
              className="mt-1 w-full min-h-[70px] rounded-lg border border-black/[0.1] bg-white px-2.5 py-2 text-xs outline-none focus:border-[#1D1D1F]"
              value={seo.metaDescription ?? ""}
              maxLength={200}
              onChange={(e) =>
                updateCmsPageSeo(page.id, {
                  metaDescription: e.target.value || null,
                })
              }
            />
            <button
              type="button"
              onClick={useFirstParagraph}
              className="mt-1 text-[11px] font-semibold text-[#1D1D1F] underline"
            >
              Use the first paragraph
            </button>
          </label>

          <div>
            <span className="text-[11px] font-semibold text-[#6E6E73]">
              Share image
            </span>
            <p className="m-0 mb-1.5 text-[10px] leading-snug text-[#A1A1A6]">
              Shown when someone posts this link on WhatsApp or Instagram.
            </p>
            <MediaLibraryPicker
              value={seo.ogImageUrl ?? ""}
              onChange={(url) =>
                updateCmsPageSeo(page.id, { ogImageUrl: url || null })
              }
            />
          </div>

          {/* A `noindex,nofollow` text field is a trap: one typo and the page
              silently disappears from Google with no way to tell. */}
          <label className="flex items-start gap-2 text-[11px] text-[#3A3A3C]">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={!seo.robots.includes("noindex")}
              onChange={(e) =>
                updateCmsPageSeo(page.id, {
                  robots: e.target.checked ? "index,follow" : "noindex,nofollow",
                })
              }
            />
            <span>
              <span className="font-semibold">Show in Google</span>
              <span className="block text-[10px] leading-snug text-[#A1A1A6]">
                Turn off for a page you only want to share by link.
              </span>
            </span>
          </label>
        </div>

        <details className="rounded-xl border border-black/[0.06] p-3">
          <summary className="cursor-pointer text-[11px] font-semibold text-[#6E6E73]">
            Advanced
          </summary>
          <label className="mt-2 block">
            <span className="text-[11px] font-semibold text-[#6E6E73]">
              Canonical URL
            </span>
            <input
              className="ez-mono mt-1 w-full rounded-lg border border-black/[0.1] bg-white px-2.5 py-2 text-[11px] outline-none focus:border-[#1D1D1F]"
              value={seo.canonicalUrl ?? ""}
              placeholder={`yourstore.com${page.path}`}
              onChange={(e) =>
                updateCmsPageSeo(page.id, { canonicalUrl: e.target.value || null })
              }
            />
            <span className="mt-1 block text-[10px] leading-snug text-[#A1A1A6]">
              Only set this if the same content also lives at another address.
            </span>
          </label>
        </details>
      </div>

      <ConfirmDialog
        open={renameTo !== null}
        title="Change this page's address?"
        description={
          renameTo
            ? `This page is live. Anyone who has the old link — a customer, a Google result, a WhatsApp forward — will get "page not found".\n\nOld: yourstore.com${page.path}\nNew: yourstore.com/pages/${renameTo}`
            : ""
        }
        confirmLabel="Change the address"
        danger
        onCancel={() => {
          setRenameTo(null);
          setSlug(slugFromPath(page.path));
        }}
        onConfirm={() => {
          if (renameTo) {
            updateCmsPageMeta(page.id, { path: `/pages/${renameTo}` });
            setSlug(renameTo);
          }
          setRenameTo(null);
        }}
      />
    </div>
  );
}

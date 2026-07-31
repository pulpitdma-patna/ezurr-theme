"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { CatalogTabs } from "@/components/admin/CatalogTabs";
import { IconButton, PencilIcon, PlusIcon } from "@/components/admin/IconButton";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { ListToolbar } from "@/components/admin/ListToolbar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { AdminCategoryRecord } from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { usePagedList } from "@/hooks/useListQuery";
import {
  createCategory,
  deleteCategory,
  upsertCategory,
} from "@/lib/adminStore";
import { api, isApiEnabled } from "@/lib/apiClient";
import { categoryPath, slugifyCategory } from "@/lib/categoryRoutes";

type DrawerMode = "add" | "edit" | null;
type CategoryRow = AdminCategoryRecord & {
  image?: string | null;
  parentId?: string | null;
  parentKey?: string | null;
  // Counted server-side in API mode; derived from the mock catalog otherwise.
  productCount?: number;
  /** What a customer would actually see, vs the catalogue total above. */
  visibleCount?: number;
  /** Whether this category has a storefront page. */
  listable?: boolean;
  href?: string;
  metaTitle?: string | null;
};

export default function AdminCategoriesPage() {
  const store = useAdminStore();
  const apiOn = isApiEnabled();
  const [query, setQuery] = useState("");
  const [page, setPage] = usePagedList(query);
  const [apiCategories, setApiCategories] = useState<CategoryRow[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  // Drawer-action errors must render inside the drawer, not behind its overlay.
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [key, setKey] = useState("");
  const [image, setImage] = useState("");
  const [active, setActive] = useState(true);
  const [listable, setListable] = useState(true);
  const [metaTitle, setMetaTitle] = useState("");
  // Where this category's page would live. The five pre-CMS slugs keep their own
  // top-level paths; everything else lives under /categories/.
  const pagePath = editing?.href ?? categoryPath(slugifyCategory(key || label) || "…");

  useEffect(() => {
    if (!apiOn) return;
    void api
      .adminCategories()
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : [];
        setApiCategories(
          rows.map((c) => ({
            id: c.id,
            key: c.key,
            label: c.label,
            description: c.description || "",
            image: c.image ?? null,
            parentId: c.parentId ?? null,
            parentKey: c.parentKey ?? null,
            active: c.active,
            productCount: c.productCount ?? 0,
            visibleCount: c.visibleCount ?? 0,
            listable: c.listable ?? false,
            href: c.href,
            metaTitle: c.metaTitle ?? null,
          })),
        );
        setListError(null);
      })
      .catch((err: Error) => {
        setApiCategories([]);
        setListError(err.message || "Could not load your categories.");
      });
  }, [apiOn]);

  const categorySource: CategoryRow[] = apiOn ? apiCategories : store.categories;
  const productSource = apiOn ? [] : store.products;

  const mapped = useMemo(
    () =>
      categorySource.map((cat) => ({
        ...cat,
        // In API mode the count arrives with the row — the mock catalog isn't
        // loaded there, and filtering it locally is what made every row read 0.
        productCount: apiOn
          ? (cat.productCount ?? 0)
          : productSource.filter((p) => p.category === cat.key).length,
      })),
    [apiOn, categorySource, productSource],
  );

  /**
   * 29 of the 33 categories came out of the Shopify import and have no page:
   * seven "-copy" duplicates, five platform facets of one 13-product parent,
   * price bands called "2000" and "2999", and rows that are perfect subsets of
   * Games. Every one of them showed a green "Active" badge, so the screen read
   * as 33 working categories and he had no way to tell which four a customer
   * could actually reach.
   *
   * Default to the ones customers can see, and say in one line what the other
   * 29 are. Which of them actually go is his decision about his shop, so
   * nothing here deletes anything.
   */
  const hiddenCount = mapped.filter((c) => !c.listable).length;
  const [showAll, setShowAll] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mapped
      .filter((cat) => showAll || q !== "" || cat.listable)
      .filter((cat) => {
        if (!q) return true;
        return cat.label.toLowerCase().includes(q) || cat.key.toLowerCase().includes(q);
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [mapped, query, showAll]);

  function openAdd() {
    setEditing(null);
    setLabel("");
    setDescription("");
    setKey("");
    setImage("");
    setActive(true);
    // A category the owner just created was made on purpose, so it gets a page.
    // Everything the Shopify import produced is backfilled off.
    setListable(true);
    setMetaTitle("");
    setDrawerMode("add");
  }

  function openEdit(row: CategoryRow) {
    setEditing(row);
    setLabel(row.label);
    setDescription(row.description);
    setKey(row.key);
    setImage(row.image ?? "");
    setActive(row.active);
    setListable(row.listable ?? false);
    setMetaTitle(row.metaTitle ?? "");
    setDrawerMode("edit");
  }

  function closeDrawer() {
    setDrawerMode(null);
    setEditing(null);
    setFormError(null);
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!label.trim()) return;
    setFormError(null);
    if (apiOn) {
      // Only whitespace was collapsed before, so every realistic category name
      // with punctuation produced an invalid slug and a 422 the owner could do
      // nothing with: "Holiday Sale!" -> "holiday-sale!", "Games & Gear" ->
      // "games-&-gear", "PS5  Deals" -> "ps5--deals". The API rule is
      // /^[a-z0-9]+(?:-[a-z0-9]+)*$/ (CategoryController), so strip everything
      // else, collapse hyphen runs and trim — the same slugifier the CMS create
      // form already uses.
      const slug = slugifyCategory(key || label);
      if (!slug) {
        setFormError(
          "Give this category a name with at least one letter or number.",
        );
        return;
      }
      void api
        .upsertCategory({
          key: drawerMode === "edit" ? editing?.key : undefined,
          slug,
          name: label.trim(),
          description,
          imageUrl: image || null,
          parentId: null,
          active,
          listable,
          metaTitle: metaTitle.trim() || null,
        })
        .then((saved) => {
          const record: CategoryRow = {
            id: saved.id,
            key: saved.key,
            label: saved.label,
            description: saved.description || "",
            image: saved.image ?? null,
            parentId: saved.parentId ?? null,
            parentKey: saved.parentKey ?? null,
            active: saved.active,
            listable: saved.listable ?? listable,
            href: saved.href,
            metaTitle: saved.metaTitle ?? null,
            // The upsert response is the bare category; only the list endpoint
            // counts products. Carry the known count so an edit doesn't reset
            // the column to 0 until the next reload.
            productCount: editing?.productCount ?? 0,
          };
          setApiCategories((prev) => {
            const idx = prev.findIndex((c) => c.key === record.key);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = record;
              return next;
            }
            return [...prev, record];
          });
          closeDrawer();
        })
        .catch((err) => setFormError(err instanceof Error ? err.message : "That category did not save."));
      return;
    }
    if (drawerMode === "add") {
      createCategory({ label, description, key: key || undefined, active });
    } else if (editing) {
      upsertCategory({
        ...editing,
        label: label.trim(),
        description: description.trim(),
        key: key.trim() || editing.key,
        active,
      });
    }
    closeDrawer();
  }

  function handleDelete() {
    if (!editing) return;
    setPendingDelete(false);
    setFormError(null);
    if (apiOn) {
      void api
        .deleteCategory(editing.key)
        .then(() => {
          setApiCategories((prev) => prev.filter((c) => c.key !== editing.key));
          closeDrawer();
        })
        .catch((err) => setFormError(err instanceof Error ? err.message : "That category did not delete."));
      return;
    }
    deleteCategory(editing.id);
    closeDrawer();
  }

  const columns: DataTableColumn<(typeof rows)[number]>[] = [
    {
      key: "label",
      header: "Category",
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md border border-black/[0.06] bg-[#F7F7F8]">
            {row.image ? (
              <Image src={row.image} alt="" fill className="object-cover" sizes="36px" unoptimized />
            ) : null}
          </span>
          {/* The slug line under every label and the Description column are
              gone: the first is a web address printed as a subtitle, and 31 of
              33 descriptions were "—". The web address is in the drawer, where
              it can be copied. */}
          <div className="text-sm font-semibold tracking-[-0.02em]">{row.label}</div>
        </div>
      ),
    },
    {
      key: "products",
      header: "Products",
      render: (row) => (
        <span className="ez-mono text-xs font-medium">{row.productCount}</span>
      ),
    },
    {
      key: "status",
      header: "Customers can see it",
      render: (row) => (
        <StatusBadge
          kind="custom"
          label={row.listable ? "Yes" : "No"}
          className={
            row.listable ? "bg-[#EAF6ED] text-[#2D6B3C]" : "bg-[#F0F0F2] text-[#6E6E73]"
          }
        />
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <IconButton label="Edit category" onClick={() => openEdit(row)}>
            <PencilIcon />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Categories"
        description="The sections customers browse your shop by."
      />

      <CatalogTabs active="categories" />

      <ListToolbar
        search={{
          value: query,
          onChange: setQuery,
          placeholder: "Search categories",
        }}
        actions={
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white"
          >
            <PlusIcon />
            Add category
          </button>
        }
      />

      {listError ? <AdminNotice tone="error">{listError}</AdminNotice> : null}

      {hiddenCount > 0 && !showAll && !query.trim() ? (
        <p className="mb-2 text-[11px] text-[#86868B]">
          {hiddenCount} categor{hiddenCount === 1 ? "y" : "ies"} came from the
          Shopify import and are hidden from customers.{" "}
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="font-semibold text-[#1D1D1F] underline underline-offset-2"
          >
            Review them
          </button>
        </p>
      ) : null}
      {showAll ? (
        <p className="mb-2 text-[11px] text-[#86868B]">
          Showing every category, including the ones customers can&apos;t see.{" "}
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className="font-semibold text-[#1D1D1F] underline underline-offset-2"
          >
            Show only the visible ones
          </button>
        </p>
      ) : null}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        emptyMessage={
          query.trim()
            ? `No category matches "${query.trim()}".`
            : "No categories yet. Add the sections customers browse by — Games, Consoles, Accessories."
        }
        emptyAction={
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#1D1D1F] px-3 text-xs font-semibold text-white"
          >
            <PlusIcon />
            Add category
          </button>
        }
        onRowClick={openEdit}
        page={page}
        pageSize={25}
        onPageChange={setPage}
        pageSizeOptions={[10, 25, 50]}
      />

      <AdminDrawer
        open={drawerMode !== null}
        title={drawerMode === "add" ? "Add category" : "Edit category"}
        subtitle={editing?.key}
        onClose={closeDrawer}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError ? <AdminNotice tone="error">{formError}</AdminNotice> : null}
          <label className="flex flex-col gap-1.5">
            <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
              Name
            </span>
            <input
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-10 rounded-xl border border-black/[0.08] bg-[#F7F7F8] px-3 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
              placeholder="Games"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            {/* "Key / slug" is two developer words for one thing he can see in
                the line below: the end of the web address customers land on. */}
            <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
              End of the web address
            </span>
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="h-10 rounded-xl border border-black/[0.08] bg-[#F7F7F8] px-3 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
              placeholder="games"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="rounded-xl border border-black/[0.08] bg-[#F7F7F8] px-3 py-2.5 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
            />
          </label>
          <ImageUploadField value={image} onChange={setImage} folder="categories" label="Image" />

          {/* Two switches, one idea. "Active in filters" and "Give this category
              a page" were separate, so 29 categories showed a green Active badge
              while having no page a customer could ever reach — 29 rows of the
              screen contradicting itself. One question now, and it writes both.
              Parent category is gone with them: 0 of 33 used it. */}
          <div className="rounded-xl border border-black/[0.08] bg-[#F7F7F8] p-3">
            <label className="flex items-start gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={listable}
                onChange={(e) => {
                  setListable(e.target.checked);
                  setActive(e.target.checked);
                }}
                className="mt-0.5 accent-[#1D1D1F]"
              />
              <span>
                Show this category to customers.
                <span className="mt-0.5 block text-[11px] font-normal leading-snug text-[#6E6E73]">
                  {listable ? (
                    <>
                      They can visit{" "}
                      <span className="ez-mono">yourstore.com{pagePath}</span> and it
                      can appear in the menu.
                    </>
                  ) : (
                    "No page, no menu entry, nothing in Google. Only you can see it."
                  )}
                </span>
              </span>
            </label>

            {listable && editing && (editing.visibleCount ?? 0) === 0 ? (
              <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-snug text-amber-900">
                Nothing in this category is visible to customers yet, so the page
                will be hidden from Google until you add products.
              </p>
            ) : null}

            {listable ? (
              <label className="mt-3 block">
                <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
                  Heading Google shows
                </span>
                <input
                  value={metaTitle}
                  maxLength={70}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder={label || "Holiday Sale — up to 40% off"}
                  className="mt-1 h-10 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
                />
                <span className="ez-mono mt-1 block text-[10px] text-[#A1A1A6]">
                  {metaTitle.length} of 70 letters. Leave it blank and Google uses the
                  name above.
                </span>
              </label>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-lg bg-[#1D1D1F] px-4 text-xs font-semibold text-white"
            >
              {drawerMode === "add" ? "Add this category" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={closeDrawer}
              className="inline-flex h-9 items-center rounded-lg border border-black/10 px-4 text-xs font-semibold"
            >
              Cancel
            </button>
            {drawerMode === "edit" && editing ? (
              <button
                type="button"
                onClick={() => setPendingDelete(true)}
                className="ml-auto inline-flex h-9 items-center rounded-lg px-4 text-xs font-semibold text-[#B42318]"
              >
                Delete
              </button>
            ) : null}
          </div>
        </form>
      </AdminDrawer>

      <ConfirmDialog
        open={pendingDelete}
        title={`Delete "${editing?.label ?? "this category"}"?`}
        description="The section disappears from your shop and its page stops working. The products in it are not deleted — they stay in your list, just not under this heading."
        confirmLabel="Delete this category"
        cancelLabel="Keep it"
        danger
        onCancel={() => setPendingDelete(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

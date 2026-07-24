"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { AdminNotice } from "@/components/admin/AdminNotice";
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

type DrawerMode = "add" | "edit" | null;
type CategoryRow = AdminCategoryRecord & {
  image?: string | null;
  parentId?: string | null;
  parentKey?: string | null;
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
  const [parentId, setParentId] = useState("");
  const [active, setActive] = useState(true);

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
          })),
        );
        setListError(null);
      })
      .catch((err: Error) => {
        setApiCategories([]);
        setListError(err.message || "Could not load categories");
      });
  }, [apiOn]);

  const categorySource: CategoryRow[] = apiOn ? apiCategories : store.categories;
  const productSource = apiOn ? [] : store.products;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categorySource
      .map((cat) => ({
        ...cat,
        productCount: productSource.filter((p) => p.category === cat.key).length,
      }))
      .filter((cat) => {
        if (!q) return true;
        return (
          cat.label.toLowerCase().includes(q) ||
          cat.key.toLowerCase().includes(q) ||
          cat.description.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [categorySource, productSource, query]);

  function openAdd() {
    setEditing(null);
    setLabel("");
    setDescription("");
    setKey("");
    setImage("");
    setParentId("");
    setActive(true);
    setDrawerMode("add");
  }

  function openEdit(row: CategoryRow) {
    setEditing(row);
    setLabel(row.label);
    setDescription(row.description);
    setKey(row.key);
    setImage(row.image ?? "");
    setParentId(row.parentId ?? "");
    setActive(row.active);
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
      const slug = (key || label).toLowerCase().replace(/\s+/g, "-");
      void api
        .upsertCategory({
          key: drawerMode === "edit" ? editing?.key : undefined,
          slug,
          name: label.trim(),
          description,
          imageUrl: image || null,
          parentId: parentId || null,
          active,
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
        .catch((err) => setFormError(err instanceof Error ? err.message : "Could not save category"));
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
        .catch((err) => setFormError(err instanceof Error ? err.message : "Could not delete category"));
      return;
    }
    deleteCategory(editing.id);
    closeDrawer();
  }

  const parentOptions = categorySource.filter((c) => c.key !== editing?.key);

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
          <div>
            <div className="text-sm font-semibold tracking-[-0.02em]">{row.label}</div>
            <div className="mt-0.5 ez-mono text-[10px] text-[#86868B]">{row.key}</div>
            {row.parentKey ? (
              <div className="mt-0.5 text-[10px] text-[#86868B]">↳ under {row.parentKey}</div>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs text-[#6E6E73]">{row.description || "—"}</span>
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
      header: "Status",
      render: (row) => (
        <StatusBadge
          kind="custom"
          label={row.active ? "Active" : "Hidden"}
          className={
            row.active ? "bg-[#EAF6ED] text-[#2D6B3C]" : "bg-[#F0F0F2] text-[#6E6E73]"
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
        description="Organize catalog sections shown across products and filters."
      />

      <ListToolbar
        resultLabel={`${rows.length} categories`}
        search={{
          value: query,
          onChange: setQuery,
          placeholder: "Search categories…",
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

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        emptyMessage="No categories yet."
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
              Label
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
            <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
              Key / slug
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
          <label className="flex flex-col gap-1.5">
            <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
              Parent category
            </span>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="h-10 rounded-xl border border-black/[0.08] bg-[#F7F7F8] px-3 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
            >
              <option value="">None (top level)</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="accent-[#1D1D1F]"
            />
            Active in filters
          </label>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-lg bg-[#1D1D1F] px-4 text-xs font-semibold text-white"
            >
              {drawerMode === "add" ? "Create" : "Save"}
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
        title="Delete category?"
        description={`"${editing?.label ?? "This category"}" will be removed. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onCancel={() => setPendingDelete(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

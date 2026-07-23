"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { IconButton, PencilIcon, PlusIcon } from "@/components/admin/IconButton";
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

export default function AdminCategoriesPage() {
  const store = useAdminStore();
  const apiOn = isApiEnabled();
  const [query, setQuery] = useState("");
  const [page, setPage] = usePagedList(query);
  const [apiCategories, setApiCategories] = useState<AdminCategoryRecord[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [editing, setEditing] = useState<AdminCategoryRecord | null>(null);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [key, setKey] = useState("");
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

  const categorySource = apiOn ? apiCategories : store.categories;
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
    setActive(true);
    setDrawerMode("add");
  }

  function openEdit(row: AdminCategoryRecord) {
    setEditing(row);
    setLabel(row.label);
    setDescription(row.description);
    setKey(row.key);
    setActive(row.active);
    setDrawerMode("edit");
  }

  function closeDrawer() {
    setDrawerMode(null);
    setEditing(null);
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!label.trim()) return;
    if (apiOn) {
      const slug = (key || label).toLowerCase().replace(/\s+/g, "-");
      void api
        .upsertCategory({
          key: drawerMode === "edit" ? editing?.key : undefined,
          slug,
          name: label.trim(),
          description,
          active,
        })
        .then((saved) => {
          const record: AdminCategoryRecord = {
            id: saved.id,
            key: saved.key,
            label: saved.label,
            description: saved.description || "",
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
        .catch(() => setListError("Could not save category"));
      return;
    }
    if (drawerMode === "add") {
      createCategory({ label, description, key: key || undefined });
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

  const columns: DataTableColumn<(typeof rows)[number]>[] = [
    {
      key: "label",
      header: "Category",
      render: (row) => (
        <div>
          <div className="text-sm font-semibold tracking-[-0.02em]">{row.label}</div>
          <div className="mt-0.5 ez-mono text-[10px] text-[#86868B]">{row.key}</div>
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
          {drawerMode === "edit" ? (
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="accent-[#1D1D1F]"
              />
              Active in filters
            </label>
          ) : null}
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
            {drawerMode === "edit" &&
            editing &&
            store.products.filter((p) => p.category === editing.key).length === 0 ? (
              <button
                type="button"
                onClick={() => {
                  deleteCategory(editing.id);
                  closeDrawer();
                }}
                className="ml-auto inline-flex h-9 items-center rounded-lg px-4 text-xs font-semibold text-[#B42318]"
              >
                Delete
              </button>
            ) : null}
          </div>
        </form>
      </AdminDrawer>
    </div>
  );
}

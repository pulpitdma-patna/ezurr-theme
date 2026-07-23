"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { IconButton, PencilIcon, PlusIcon } from "@/components/admin/IconButton";
import { ListToolbar } from "@/components/admin/ListToolbar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { AdminBrandRecord } from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { usePagedList } from "@/hooks/useListQuery";
import { createBrand, deleteBrand, upsertBrand } from "@/lib/adminStore";
import { api, isApiEnabled } from "@/lib/apiClient";

type DrawerMode = "add" | "edit" | null;

export default function AdminBrandsPage() {
  const store = useAdminStore();
  const apiOn = isApiEnabled();
  const [query, setQuery] = useState("");
  const [page, setPage] = usePagedList(query);
  const [apiBrands, setApiBrands] = useState<(AdminBrandRecord & { slug: string })[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [editing, setEditing] = useState<(AdminBrandRecord & { slug?: string }) | null>(null);
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!apiOn) return;
    void api
      .adminBrands()
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : [];
        setApiBrands(rows.map((b) => ({ id: b.id, slug: b.slug, name: b.name, active: b.active })));
        setListError(null);
      })
      .catch((err: Error) => {
        setApiBrands([]);
        setListError(err.message || "Could not load brands");
      });
  }, [apiOn]);

  const brandSource = apiOn ? apiBrands : store.brands;
  const productSource = apiOn ? [] : store.products;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return brandSource
      .map((brand) => ({
        ...brand,
        productCount: productSource.filter((p) => p.brand === brand.name).length,
      }))
      .filter((brand) => {
        if (!q) return true;
        return brand.name.toLowerCase().includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [brandSource, productSource, query]);

  function openAdd() {
    setEditing(null);
    setName("");
    setActive(true);
    setDrawerMode("add");
  }

  function openEdit(row: AdminBrandRecord & { slug?: string }) {
    setEditing(row);
    setName(row.name);
    setActive(row.active);
    setDrawerMode("edit");
  }

  function closeDrawer() {
    setDrawerMode(null);
    setEditing(null);
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    if (apiOn) {
      const slug = name.trim().toLowerCase().replace(/\s+/g, "-");
      void api
        .upsertBrand({
          key: drawerMode === "edit" ? editing?.slug : undefined,
          name: name.trim(),
          active,
        })
        .then((saved) => {
          const record = {
            id: saved.id,
            slug: saved.slug,
            name: saved.name,
            active: saved.active,
          };
          setApiBrands((prev) => {
            const idx = prev.findIndex((b) => b.id === record.id || b.name === record.name);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = record;
              return next;
            }
            return [...prev, record];
          });
          closeDrawer();
        })
        .catch(() => setListError("Could not save brand"));
      return;
    }
    if (drawerMode === "add") {
      createBrand(name);
    } else if (editing) {
      upsertBrand({
        ...editing,
        name: name.trim(),
        active,
      });
    }
    closeDrawer();
  }

  const columns: DataTableColumn<(typeof rows)[number]>[] = [
    {
      key: "name",
      header: "Brand",
      sortable: true,
      render: (row) => (
        <span className="text-sm font-semibold tracking-[-0.02em]">{row.name}</span>
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
          <IconButton label="Edit brand" onClick={() => openEdit(row)}>
            <PencilIcon />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Brands"
        description="Manage publisher and platform brands used across the catalog."
      />

      <ListToolbar
        resultLabel={`${rows.length} brands`}
        search={{
          value: query,
          onChange: setQuery,
          placeholder: "Search brands…",
        }}
        actions={
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white"
          >
            <PlusIcon />
            Add brand
          </button>
        }
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        emptyMessage="No brands yet."
        emptyAction={
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#1D1D1F] px-3 text-xs font-semibold text-white"
          >
            <PlusIcon />
            Add brand
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
        title={drawerMode === "add" ? "Add brand" : "Edit brand"}
        onClose={closeDrawer}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <label className="flex flex-col gap-1.5">
            <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
              Brand name
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 rounded-xl border border-black/[0.08] bg-[#F7F7F8] px-3 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
              placeholder="PlayStation"
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
            store.products.filter((p) => p.brand === editing.name).length === 0 ? (
              <button
                type="button"
                onClick={() => {
                  deleteBrand(editing.id);
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

"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { ListToolbar } from "@/components/admin/ListToolbar";
import { StockBadge } from "@/components/admin/StockBadge";
import { useAdminToast } from "@/components/admin/AdminToast";
import type { AdminCatalogRow } from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { usePagedList, useSearchQueryParam } from "@/hooks/useListQuery";
import { adjustStock } from "@/lib/adminStore";
import { api, apiUpdateProduct, isApiEnabled } from "@/lib/apiClient";
import { mapApiProductToAdminRow } from "@/lib/apiMappers";

export default function AdminInventoryPage() {
  const store = useAdminStore();
  const toast = useAdminToast();
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get("filter");
  const [filterLocal, setFilterLocal] = useState<string | null>(null);
  const [seenFilter, setSeenFilter] = useState(urlFilter);
  if (urlFilter !== seenFilter) {
    setSeenFilter(urlFilter);
    setFilterLocal(null);
  }
  const filter =
    filterLocal ??
    (urlFilter === "low" || urlFilter === "out" || urlFilter === "all" ? urlFilter : "all");
  const [query, setQuery] = useSearchQueryParam();
  const [sortKey, setSortKey] = useState("stock");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = usePagedList(`${filter}|${query}|${sortKey}|${sortDir}`);
  const [adjustKey, setAdjustKey] = useState<string | null>(null);
  const [delta, setDelta] = useState("1");
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const apiOn = isApiEnabled();
  const [apiProducts, setApiProducts] = useState<AdminCatalogRow[]>([]);

  const loadProducts = useCallback(async () => {
    if (!apiOn) return;
    try {
      const perPage = 100;
      const first = await api.adminProducts({ page: 1, per_page: perPage });
      let all = Array.isArray(first.data) ? first.data : [];
      const lastPage = Number(first.last_page ?? 1);
      for (let p = 2; p <= lastPage; p += 1) {
        const res = await api.adminProducts({ page: p, per_page: perPage });
        if (Array.isArray(res.data)) all = all.concat(res.data);
      }
      setApiProducts(all.map((p, i) => mapApiProductToAdminRow(p, i)));
    } catch {
      setApiProducts([]);
    }
  }, [apiOn]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const source = apiOn ? apiProducts : store.products;

  useEffect(() => {
    if (!adjustKey) return;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>("input,button")?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setAdjustKey(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [adjustKey]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const threshold = store.settings.lowStockThreshold ?? 5;
    let list = source.filter((row) => {
      if (filter === "low" && !(row.stock > 0 && row.stock <= threshold)) return false;
      if (filter === "out" && row.stock !== 0) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.sku.toLowerCase().includes(q) ||
        row.platform.toLowerCase().includes(q)
      );
    });
    list = [...list].sort((a, b) => {
      const cmp = sortKey === "name" ? a.name.localeCompare(b.name) : a.stock - b.stock;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [source, store.settings.lowStockThreshold, filter, query, sortKey, sortDir]);

  const columns: DataTableColumn<AdminCatalogRow>[] = [
    {
      key: "sku",
      header: "SKU",
      render: (row) => (
        <Link
          href={`/admin/products/${encodeURIComponent(row.key)}/edit`}
          className="ez-mono text-[11px] font-medium hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.sku}
        </Link>
      ),
    },
    {
      key: "name",
      header: "Product",
      sortable: true,
      render: (row) => (
        <div>
          <div className="text-sm font-semibold tracking-[-0.02em]">{row.name}</div>
          <div className="text-[11px] text-[#86868B]">{row.platform}</div>
        </div>
      ),
    },
    {
      key: "stock",
      header: "Stock",
      sortable: true,
      render: (row) => <StockBadge stock={row.stock} />,
    },
    {
      key: "adjust",
      header: "Adjust",
      className: "text-right",
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setAdjustKey(row.key);
            setDelta("1");
          }}
          className="rounded-md border border-black/10 px-2.5 py-1 text-[11px] font-semibold hover:bg-[#F5F5F7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
        >
          ± Qty
        </button>
      ),
    },
  ];

  async function applyAdjust(sign: 1 | -1) {
    if (!adjustKey) return;
    const amount = Math.abs(Number(delta) || 0);
    if (amount === 0) return;
    if (apiOn) {
      const key = adjustKey;
      const current = source.find((p) => p.key === key)?.stock ?? 0;
      const nextStock = Math.max(0, current + sign * amount);
      try {
        await apiUpdateProduct(key, { stock: nextStock });
        await loadProducts();
        toast.push(`Stock updated to ${nextStock}`, "success");
        setAdjustKey(null);
      } catch (err) {
        // Keep the modal open so the failed adjustment isn't mistaken for a save.
        toast.push(err instanceof Error ? err.message : "Could not update stock", "warning");
      }
      return;
    }
    adjustStock(adjustKey, sign * amount);
    setAdjustKey(null);
  }

  const adjusting = source.find((p) => p.key === adjustKey);

  return (
    <div>
      <AdminPageHeader
        title="Inventory"
        description="Triage low stock, adjust quantities, and jump into product edit."
      />

      <ListToolbar
        resultLabel={`${rows.length} SKUs`}
        search={{
          value: query,
          onChange: setQuery,
          placeholder: "Search SKU, name, platform…",
        }}
        filters={
          <AdminSelect
            label="Stock"
            value={filter}
            onChange={setFilterLocal}
            options={[
              { value: "all", label: "All" },
              { value: "low", label: "Low stock" },
              { value: "out", label: "Out of stock" },
            ]}
          />
        }
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.key}
        emptyMessage="No inventory rows match."
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={(key) => {
          if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
          else {
            setSortKey(key);
            setSortDir("asc");
          }
        }}
        page={page}
        pageSize={25}
        onPageChange={setPage}
      />

      {store.ledger.length > 0 ? (
        <section className="mt-5">
          <h2 className="mb-2 text-sm font-semibold">Recent ledger</h2>
          <ul className="divide-y divide-black/[0.05] overflow-hidden rounded-lg border border-black/[0.08] bg-white">
            {store.ledger.slice(0, 8).map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs"
              >
                <Link
                  href={`/admin/products/${encodeURIComponent(entry.productKey)}/edit`}
                  className="ez-mono font-medium hover:underline"
                >
                  {entry.sku}
                </Link>
                <span className={entry.delta >= 0 ? "text-[#2D6B3C]" : "text-[#B42318]"}>
                  {entry.delta >= 0 ? "+" : ""}
                  {entry.delta}
                </span>
                <span className="text-[#86868B]">{entry.reason}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {adjusting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Dismiss"
            onClick={() => setAdjustKey(null)}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full max-w-sm rounded-lg bg-white p-5 shadow-lg"
          >
            <h3 id={titleId} className="text-sm font-semibold tracking-[-0.02em]">
              Adjust stock
            </h3>
            <p className="mt-1 text-xs text-[#6E6E73]">
              {adjusting.name} · current {adjusting.stock}
            </p>
            <input
              type="number"
              min={1}
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              className="mt-4 h-9 w-full rounded-md border border-black/[0.08] bg-[#F7F7F8] px-3 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void applyAdjust(1)}
                className="h-8 flex-1 rounded-md bg-[#1D1D1F] text-xs font-semibold text-white"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => void applyAdjust(-1)}
                className="h-8 flex-1 rounded-md border border-black/10 text-xs font-semibold"
              >
                Remove
              </button>
              <button
                type="button"
                onClick={() => setAdjustKey(null)}
                className="h-8 rounded-md px-3 text-xs font-semibold text-[#6E6E73]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

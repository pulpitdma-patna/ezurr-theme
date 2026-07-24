"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { ListToolbar } from "@/components/admin/ListToolbar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StockBadge } from "@/components/admin/StockBadge";
import { useAdminToast } from "@/components/admin/AdminToast";
import type { AdminCatalogRow, AdminOrder } from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { usePagedList, useSearchQueryParam } from "@/hooks/useListQuery";
import { useStaffRole } from "@/hooks/useStaffRole";
import { can } from "@/lib/adminPermissions";
import { markPreordersReady } from "@/lib/adminStore";
import { api, isApiEnabled } from "@/lib/apiClient";
import { mapApiOrderToAdmin } from "@/lib/apiMappers";

export default function AdminPreordersPage() {
  const apiOn = isApiEnabled();
  const store = useAdminStore();
  const toast = useAdminToast();
  const { role } = useStaffRole();
  const canWrite = can("orders.write", role);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [query, setQuery] = useSearchQueryParam();
  const [page, setPage] = usePagedList(query);
  const [catalogPage, setCatalogPage] = usePagedList(`catalog|${query}`);
  const [apiOrders, setApiOrders] = useState<AdminOrder[]>([]);

  const loadPreorders = () => {
    if (!apiOn) return;
    void api
      .adminOrders({ status: "preorder", per_page: 100 })
      .then((res) => setApiOrders((res.data ?? []).map((raw) => mapApiOrderToAdmin(raw))))
      .catch(() => {});
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadPreorders, [apiOn]);

  const allPreorders = apiOn ? apiOrders : store.orders.filter((o) => o.status === "preorder");

  const preorderOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allPreorders.filter((o) => {
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        (o.items[0]?.name ?? "").toLowerCase().includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPreorders, query]);

  const catalogPreorders = useMemo(
    () => store.products.filter((p) => p.category === "preorders"),
    [store.products],
  );

  const holdsByTitle = useMemo(() => {
    const map = new Map<string, { name: string; releaseDate?: string; orders: AdminOrder[] }>();
    for (const order of allPreorders) {
      const item = order.items[0];
      const key = item?.productKey ?? item?.name ?? order.id;
      const product = store.products.find((p) => p.key === item?.productKey);
      const prev = map.get(key) ?? {
        name: item?.name ?? "Untitled",
        releaseDate: product?.releaseDate,
        orders: [],
      };
      prev.orders.push(order);
      map.set(key, prev);
    }
    return [...map.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPreorders, store.products]);

  const orderColumns: DataTableColumn<AdminOrder>[] = [
    {
      key: "id",
      header: "Order",
      render: (row) => (
        <Link href={`/admin/orders/${row.id}`} className="ez-mono text-[11px] font-semibold">
          {row.id}
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (row) => <span className="text-sm font-medium">{row.customerName}</span>,
    },
    {
      key: "item",
      header: "Title",
      render: (row) => (
        <span className="text-xs text-[#6E6E73]">{row.items[0]?.name ?? "—"}</span>
      ),
    },
    {
      key: "total",
      header: "Total",
      render: (row) => <span className="ez-mono text-xs">{row.total}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge kind="order" status={row.status} />,
    },
  ];

  const catalogColumns: DataTableColumn<AdminCatalogRow>[] = [
    {
      key: "sku",
      header: "SKU",
      render: (row) => (
        <Link
          href={`/admin/products/${encodeURIComponent(row.key)}/edit`}
          className="ez-mono text-[11px] font-medium hover:underline"
        >
          {row.sku}
        </Link>
      ),
    },
    {
      key: "name",
      header: "Product",
      render: (row) => (
        <div>
          <div className="text-sm font-semibold">{row.name}</div>
          <div className="text-[11px] text-[#86868B]">
            {row.edition}
            {row.releaseDate ? ` · releases ${row.releaseDate}` : ""}
          </div>
        </div>
      ),
    },
    {
      key: "stock",
      header: "Alloc",
      render: (row) => <StockBadge stock={row.stock} />,
    },
    {
      key: "price",
      header: "Price",
      render: (row) => <span className="ez-mono text-xs">{row.price}</span>,
    },
  ];

  function batchReady() {
    if (!canWrite) {
      toast.push("Read-only role cannot release holds", "warning");
      return;
    }
    const count = selected.length;
    if (apiOn) {
      setConfirmRelease(false);
      void (async () => {
        try {
          // Release = confirm the preorder; the API emits preorder_released.
          await Promise.all(selected.map((id) => api.patchOrderStatus(id, { status: "confirmed" })));
          toast.push(`Released ${count} hold${count === 1 ? "" : "s"} → confirmed`, "success");
          setSelected([]);
          loadPreorders();
        } catch (e) {
          toast.push(e instanceof Error ? e.message : "Release failed", "warning");
        }
      })();
      return;
    }
    markPreordersReady(selected);
    toast.push(`Released ${count} hold${count === 1 ? "" : "s"} · stock allocated`, "success");
    setSelected([]);
    setConfirmRelease(false);
  }

  return (
    <div>
      <AdminPageHeader
        title="Pre-orders"
        description="Group release holds by title, then batch-release to confirmed with stock allocation."
        actions={
          selected.length > 0 ? (
            <button
              type="button"
              disabled={!canWrite}
              onClick={() => setConfirmRelease(true)}
              className="inline-flex h-8 items-center rounded-md bg-[#1D1D1F] px-3 text-xs font-semibold text-white disabled:opacity-40"
            >
              Release {selected.length}
            </button>
          ) : null
        }
      />

      {!apiOn ? (
        <AdminNotice tone="demo" className="mb-4">
          Pre-orders shown here are derived from local demo data — enable the store
          API for live pre-order holds and release.
        </AdminNotice>
      ) : null}

      {holdsByTitle.length > 0 ? (
        <section className="mb-5 grid gap-2 sm:grid-cols-2">
          {holdsByTitle.map((group) => (
            <div
              key={group.name}
              className="rounded-lg border border-black/[0.08] bg-white px-4 py-3"
            >
              <div className="text-sm font-semibold tracking-[-0.02em]">{group.name}</div>
              <div className="mt-0.5 text-xs text-[#86868B]">
                {group.orders.length} on hold
                {group.releaseDate ? ` · release ${group.releaseDate}` : ""}
              </div>
              <button
                type="button"
                onClick={() => setSelected(group.orders.map((o) => o.id))}
                className="mt-2 text-xs font-semibold text-[#424245] hover:underline"
              >
                Select holds
              </button>
            </div>
          ))}
        </section>
      ) : null}

      <section>
        <ListToolbar
          resultLabel={`${preorderOrders.length} holds`}
          search={{
            value: query,
            onChange: setQuery,
            placeholder: "Search order, customer, title…",
          }}
        />
        <DataTable
          columns={orderColumns}
          rows={preorderOrders}
          rowKey={(row) => row.id}
          emptyMessage="No pre-order holds."
          selectable={canWrite}
          selectedKeys={selected}
          onToggleRow={(key) =>
            setSelected((prev) =>
              prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
            )
          }
          onToggleAll={() => {
            const keys = preorderOrders.map((o) => o.id);
            const all = keys.every((k) => selected.includes(k));
            setSelected(all ? [] : keys);
          }}
          page={page}
          pageSize={25}
          onPageChange={setPage}
          bulkBar={
            <>
              <span className="text-xs font-semibold">{selected.length} selected</span>
              <button
                type="button"
                onClick={() => setConfirmRelease(true)}
                className="h-7 rounded-md bg-white px-2.5 text-[11px] font-semibold text-[#1D1D1F]"
              >
                Batch release
              </button>
              <button
                type="button"
                onClick={() => setSelected([])}
                className="h-7 rounded-md px-2.5 text-[11px] font-semibold text-white/70"
              >
                Clear
              </button>
            </>
          }
        />
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold tracking-[-0.02em]">
          Catalog pre-orders ({catalogPreorders.length})
        </h2>
        <DataTable
          columns={catalogColumns}
          rows={catalogPreorders}
          rowKey={(row) => row.key}
          emptyMessage="No pre-order products."
          pageSize={25}
          page={catalogPage}
          onPageChange={setCatalogPage}
        />
      </section>

      <ConfirmDialog
        open={confirmRelease}
        title={`Release ${selected.length} pre-order${selected.length === 1 ? "" : "s"}?`}
        description="Orders move to Confirmed and physical/preorder stock is deducted via the ledger."
        confirmLabel="Release & allocate"
        onConfirm={batchReady}
        onCancel={() => setConfirmRelease(false)}
      />
    </div>
  );
}

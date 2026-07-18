"use client";

import { useMemo, useState } from "react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { ExportIcon, IconButton } from "@/components/admin/IconButton";
import { ListToolbar } from "@/components/admin/ListToolbar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useAdminToast } from "@/components/admin/AdminToast";
import type { AdminCoupon } from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { usePagedList, useSearchQueryParam } from "@/hooks/useListQuery";
import { useStaffRole } from "@/hooks/useStaffRole";
import { can } from "@/lib/adminPermissions";
import { upsertCoupon } from "@/lib/adminStore";

const PAGE_SIZES = [10, 25, 50];

export default function AdminCouponsPage() {
  const store = useAdminStore();
  const toast = useAdminToast();
  const { role } = useStaffRole();
  const canWrite = can("coupons.write", role);
  const [query, setQuery] = useSearchQueryParam();
  const [stateFilter, setStateFilter] = useState("all");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = usePagedList(`${query}|${stateFilter}|${pageSize}`);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCoupon | null>(null);
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("10");
  const [maxUses, setMaxUses] = useState("100");
  const [active, setActive] = useState(true);
  const [disableId, setDisableId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.coupons.filter((coupon) => {
      if (stateFilter === "active" && !coupon.active) return false;
      if (stateFilter === "inactive" && coupon.active) return false;
      if (!q) return true;
      return coupon.code.toLowerCase().includes(q) || coupon.id.toLowerCase().includes(q);
    });
  }, [store.coupons, query, stateFilter]);

  function openCreate() {
    if (!canWrite) {
      toast.push("Viewer/support cannot edit coupons", "warning");
      return;
    }
    setEditing(null);
    setCode("");
    setPercent("10");
    setMaxUses("100");
    setActive(true);
    setDrawerOpen(true);
  }

  function openEdit(coupon: AdminCoupon) {
    if (!canWrite) {
      toast.push("Read-only role", "warning");
      return;
    }
    setEditing(coupon);
    setCode(coupon.code);
    setPercent(String(coupon.percentOff));
    setMaxUses(String(coupon.maxUses));
    setActive(coupon.active);
    setDrawerOpen(true);
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!canWrite) return;
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    upsertCoupon({
      id: editing?.id ?? `CPN-${Date.now()}`,
      code: trimmed,
      percentOff: Math.min(90, Math.max(1, Number(percent) || 1)),
      active,
      uses: editing?.uses ?? 0,
      maxUses: Math.max(1, Number(maxUses) || 1),
      createdAt: editing?.createdAt ?? new Date().toISOString().slice(0, 10),
    });
    setDrawerOpen(false);
    toast.push(editing ? `${trimmed} updated` : `${trimmed} created`, "success");
  }

  function exportCsv() {
    const header = "code,percentOff,uses,maxUses,active,createdAt\n";
    const body = rows
      .map((c) => `${c.code},${c.percentOff},${c.uses},${c.maxUses},${c.active},${c.createdAt}`)
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ezurr-coupons.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns: DataTableColumn<AdminCoupon>[] = [
    {
      key: "code",
      header: "Code",
      render: (row) => <span className="ez-mono text-xs font-semibold">{row.code}</span>,
    },
    {
      key: "off",
      header: "Discount",
      render: (row) => <span className="ez-mono text-xs">{row.percentOff}%</span>,
    },
    {
      key: "uses",
      header: "Uses",
      render: (row) => (
        <span className="ez-mono text-xs">
          {row.uses}/{row.maxUses}
        </span>
      ),
    },
    {
      key: "active",
      header: "State",
      render: (row) => (
        <StatusBadge
          kind="custom"
          label={row.active ? "Active" : "Inactive"}
          className={
            row.active ? "bg-[#EAF6ED] text-[#2D6B3C]" : "bg-[#F0F0F2] text-[#6E6E73]"
          }
        />
      ),
    },
    {
      key: "toggle",
      header: "",
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="rounded-md border border-black/10 px-2.5 py-1 text-[11px] font-semibold"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={!canWrite}
            onClick={() => {
              if (row.active) setDisableId(row.id);
              else {
                upsertCoupon({ ...row, active: true });
                toast.push(`${row.code} enabled`, "success");
              }
            }}
            className="rounded-md border border-black/10 px-2.5 py-1 text-[11px] font-semibold disabled:opacity-40"
          >
            {row.active ? "Disable" : "Enable"}
          </button>
        </div>
      ),
    },
  ];

  const disabling = store.coupons.find((c) => c.id === disableId);

  return (
    <div>
      <AdminPageHeader
        title="Coupons"
        description="Create promo codes, set capacity, and pause campaigns when they end."
      />

      <ListToolbar
        resultLabel={`${rows.length} of ${store.coupons.length}`}
        search={{
          value: query,
          onChange: setQuery,
          placeholder: "Search code…",
        }}
        filters={
          <AdminSelect
            label="State"
            value={stateFilter}
            onChange={setStateFilter}
            options={[
              { value: "all", label: "All" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
        }
        actions={
          <>
            <IconButton label="Export CSV" onClick={exportCsv} size="md">
              <ExportIcon />
            </IconButton>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-9 items-center rounded-xl bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white disabled:opacity-40"
              disabled={!canWrite}
            >
              New coupon
            </button>
          </>
        }
      />

      {rows.length === 0 ? (
        <AdminEmptyState
          title="No coupons match"
          description="Create a code or clear filters."
          action={
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-8 items-center rounded-lg bg-[#1D1D1F] px-3 text-xs font-semibold text-white"
            >
              New coupon
            </button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          emptyMessage="No coupons yet."
          onRowClick={openEdit}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          pageSizeOptions={PAGE_SIZES}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}

      <AdminDrawer
        open={drawerOpen}
        title={editing ? "Edit coupon" : "New coupon"}
        onClose={() => setDrawerOpen(false)}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block">
            <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">Code</span>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-xl border border-black/[0.08] bg-[#F7F7F8] px-3 text-sm"
              placeholder="SUMMER20"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">% off</span>
              <input
                type="number"
                min={1}
                max={90}
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-black/[0.08] bg-[#F7F7F8] px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">Max uses</span>
              <input
                type="number"
                min={1}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-black/[0.08] bg-[#F7F7F8] px-3 text-sm"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="accent-[#1D1D1F]"
            />
            Active
          </label>
          <button
            type="submit"
            className="h-10 w-full rounded-xl bg-[#1D1D1F] text-xs font-semibold text-white"
          >
            Save coupon
          </button>
        </form>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(disableId)}
        title={`Disable ${disabling?.code ?? "coupon"}?`}
        description="Shoppers will no longer be able to apply this code at checkout."
        confirmLabel="Disable"
        danger
        onConfirm={() => {
          if (disabling) {
            upsertCoupon({ ...disabling, active: false });
            toast.push(`${disabling.code} disabled`, "success");
          }
          setDisableId(null);
        }}
        onCancel={() => setDisableId(null)}
      />
    </div>
  );
}

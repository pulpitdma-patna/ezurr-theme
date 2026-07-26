"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { ListToolbar } from "@/components/admin/ListToolbar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useAdminToast } from "@/components/admin/AdminToast";
import { formatInr } from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { usePagedList, useSearchQueryParam } from "@/hooks/useListQuery";
import { useStaffRole } from "@/hooks/useStaffRole";
import { formatAdminDate } from "@/lib/adminFormat";
import { can } from "@/lib/adminPermissions";
import { upsertCoupon } from "@/lib/adminStore";
import { api, isApiEnabled, type ApiCoupon } from "@/lib/apiClient";

const PAGE_SIZES = [10, 25, 50];

type CouponRow = {
  id: string;
  code: string;
  discountType: "percent" | "fixed";
  value: number;
  minOrder: number;
  startsAt?: string | null;
  endsAt?: string | null;
  usedCount: number;
  usageLimit?: number | null;
  active: boolean;
};

function apiToRow(c: ApiCoupon): CouponRow {
  return {
    id: c.id,
    code: c.code,
    discountType: c.discountType,
    value: c.value,
    minOrder: c.minOrder,
    startsAt: c.startsAt ?? null,
    endsAt: c.endsAt ?? null,
    usedCount: c.usedCount,
    usageLimit: c.usageLimit ?? null,
    active: c.active,
  };
}

function statusOf(row: CouponRow): { label: string; className: string } {
  if (!row.active) return { label: "Inactive", className: "bg-[#F0F0F2] text-[#6E6E73]" };
  const now = Date.now();
  if (row.startsAt && new Date(row.startsAt).getTime() > now) {
    return { label: "Scheduled", className: "bg-[#FEF3C7] text-[#92400E]" };
  }
  if (row.endsAt && new Date(row.endsAt).getTime() < now) {
    return { label: "Expired", className: "bg-[#FDECEC] text-[#B42318]" };
  }
  return { label: "Active", className: "bg-[#EAF6ED] text-[#2D6B3C]" };
}

/** `<input type="date">` only accepts `YYYY-MM-DD`, so this stays unformatted. */
function toDateInput(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

const emptyForm = {
  code: "",
  description: "",
  discountType: "percent" as "percent" | "fixed",
  value: "10",
  maxDiscount: "",
  minOrder: "0",
  startsAt: "",
  endsAt: "",
  usageLimit: "",
  perCustomerLimit: "",
  firstOrderOnly: false,
  categorySlug: "",
  brandSlug: "",
  active: true,
};

export default function AdminCouponsPage() {
  const store = useAdminStore();
  const toast = useAdminToast();
  const { role } = useStaffRole();
  const canWrite = can("coupons.write", role);
  const apiOn = isApiEnabled();
  const [query, setQuery] = useSearchQueryParam();
  const [stateFilter, setStateFilter] = useState("all");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = usePagedList(`${query}|${stateFilter}|${pageSize}`);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [disableRow, setDisableRow] = useState<CouponRow | null>(null);
  // Delete is a hard delete on a shared business object, so it gets the same
  // confirmation step the far milder "Disable" action already has.
  const [deletePendingRow, setDeletePendingRow] = useState<CouponRow | null>(null);
  const [apiCoupons, setApiCoupons] = useState<CouponRow[]>([]);
  // Keep the full API records so editing can repopulate every field; the row
  // summary drops maxDiscount, per-customer limit, description, scope, etc.
  const [apiRaw, setApiRaw] = useState<ApiCoupon[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  const loadCoupons = useCallback(async () => {
    if (!apiOn) return;
    try {
      const res = await api.adminCoupons();
      const rows = res.data ?? [];
      setApiRaw(rows);
      setApiCoupons(rows.map(apiToRow));
      setListError(null);
    } catch (err) {
      setApiRaw([]);
      setApiCoupons([]);
      setListError(err instanceof Error ? err.message : "Could not load coupons");
    }
  }, [apiOn]);

  useEffect(() => {
    void loadCoupons();
  }, [loadCoupons]);

  const source: CouponRow[] = apiOn
    ? apiCoupons
    : store.coupons.map((c) => ({
        id: c.id,
        code: c.code,
        discountType: "percent",
        value: c.percentOff,
        minOrder: 0,
        usedCount: c.uses,
        usageLimit: c.maxUses,
        active: c.active,
      }));

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return source.filter((c) => {
      if (stateFilter === "active" && !c.active) return false;
      if (stateFilter === "inactive" && c.active) return false;
      if (!q) return true;
      return c.code.toLowerCase().includes(q);
    });
  }, [source, query, stateFilter]);

  function up<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openCreate() {
    if (!canWrite) return toast.push("Read-only role", "warning");
    setEditingCode(null);
    setForm({ ...emptyForm });
    setDrawerOpen(true);
  }

  function openEdit(row: CouponRow) {
    if (!canWrite) return toast.push("Read-only role", "warning");
    if (!apiOn) {
      // Mock mode keeps the simple fields only.
      setEditingCode(row.code);
      setForm({ ...emptyForm, code: row.code, value: String(row.value), active: row.active });
      setDrawerOpen(true);
      return;
    }
    // Populate the full form from the coupon object so an edit doesn't blank
    // out fields the row summary doesn't carry (maxDiscount, per-customer limit,
    // description, first-order-only, scope) and silently wipe them on save.
    const c = apiRaw.find((x) => x.code === row.code);
    setEditingCode(row.code);
    setForm({
      code: row.code,
      description: c?.description ?? "",
      discountType: row.discountType,
      value: String(row.value),
      maxDiscount: c?.maxDiscount != null ? String(c.maxDiscount) : "",
      minOrder: String(row.minOrder),
      startsAt: toDateInput(row.startsAt),
      endsAt: toDateInput(row.endsAt),
      usageLimit: row.usageLimit != null ? String(row.usageLimit) : "",
      perCustomerLimit: c?.perCustomerLimit != null ? String(c.perCustomerLimit) : "",
      firstOrderOnly: c?.firstOrderOnly ?? false,
      categorySlug: c?.categorySlug ?? "",
      brandSlug: c?.brandSlug ?? "",
      active: c?.active ?? row.active,
    });
    setDrawerOpen(true);
  }

  const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!canWrite) return;
    const code = form.code.trim().toUpperCase();
    if (!code) return;

    if (apiOn) {
      const payload = {
        code,
        description: form.description || null,
        discountType: form.discountType,
        value: Math.max(1, Number(form.value) || 1),
        maxDiscount: form.discountType === "percent" ? numOrNull(form.maxDiscount) : null,
        minOrder: Number(form.minOrder) || 0,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
        usageLimit: numOrNull(form.usageLimit),
        perCustomerLimit: numOrNull(form.perCustomerLimit),
        firstOrderOnly: form.firstOrderOnly,
        categorySlug: form.categorySlug || null,
        brandSlug: form.brandSlug || null,
        active: form.active,
      };
      const req = editingCode
        ? api.updateCoupon(editingCode, payload)
        : api.createCoupon(payload);
      void req
        .then(() => {
          setDrawerOpen(false);
          toast.push(editingCode ? `${code} updated` : `${code} created`, "success");
          return loadCoupons();
        })
        .catch((err) =>
          toast.push(err instanceof Error ? err.message : "Could not save coupon", "warning"),
        );
      return;
    }

    // Mock fallback (limited fields).
    upsertCoupon({
      id: editingCode ? code : `CPN-${Date.now()}`,
      code,
      percentOff: Math.min(90, Math.max(1, Number(form.value) || 1)),
      active: form.active,
      uses: 0,
      maxUses: Math.max(1, Number(form.usageLimit) || 100),
      createdAt: new Date().toISOString().slice(0, 10),
    });
    setDrawerOpen(false);
    toast.push(editingCode ? `${code} updated` : `${code} created`, "success");
  }

  function toggleActive(row: CouponRow) {
    if (!canWrite) return;
    if (row.active) {
      setDisableRow(row);
      return;
    }
    if (apiOn) {
      void api
        .updateCoupon(row.code, { active: true })
        .then(() => {
          toast.push(`${row.code} enabled`, "success");
          return loadCoupons();
        })
        .catch(() => toast.push("Could not enable", "warning"));
    } else {
      const c = store.coupons.find((x) => x.id === row.id);
      if (c) upsertCoupon({ ...c, active: true });
      toast.push(`${row.code} enabled`, "success");
    }
  }

  function deleteRow(row: CouponRow) {
    if (!canWrite || !apiOn) return;
    void api
      .deleteCoupon(row.code)
      .then(() => {
        toast.push(`${row.code} deleted`, "success");
        return loadCoupons();
      })
      .catch(() => toast.push("Could not delete", "warning"));
  }

  const deleteWarning = deletePendingRow
    ? deletePendingRow.usedCount > 0
      ? `${deletePendingRow.code} has already been redeemed ${deletePendingRow.usedCount} time${
          deletePendingRow.usedCount === 1 ? "" : "s"
        }. Deleting removes the code permanently — disable it instead if you only want to stop new redemptions.`
      : `${deletePendingRow.code} will be removed permanently. This cannot be undone.`
    : "";

  const columns: DataTableColumn<CouponRow>[] = [
    {
      key: "code",
      header: "Code",
      render: (row) => <span className="ez-mono text-xs font-semibold">{row.code}</span>,
    },
    {
      key: "off",
      header: "Discount",
      render: (row) => (
        <span className="ez-mono text-xs">
          {row.discountType === "fixed" ? formatInr(row.value) : `${row.value}%`}
        </span>
      ),
    },
    {
      key: "min",
      header: "Min order",
      render: (row) => <span className="ez-mono text-xs">{row.minOrder ? formatInr(row.minOrder) : "—"}</span>,
    },
    {
      key: "validity",
      header: "Validity",
      render: (row) => (
        <span className="text-[11px] text-[#6E6E73]">
          {row.startsAt || row.endsAt
            ? `${formatAdminDate(row.startsAt)} → ${formatAdminDate(row.endsAt)}`
            : "No expiry"}
        </span>
      ),
    },
    {
      key: "uses",
      header: "Uses",
      render: (row) => (
        <span className="ez-mono text-xs">
          {row.usedCount}
          {row.usageLimit != null ? `/${row.usageLimit}` : ""}
        </span>
      ),
    },
    {
      key: "state",
      header: "State",
      render: (row) => {
        const s = statusOf(row);
        return <StatusBadge kind="custom" label={s.label} className={s.className} />;
      },
    },
    {
      key: "actions",
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
            onClick={() => toggleActive(row)}
            className="rounded-md border border-black/10 px-2.5 py-1 text-[11px] font-semibold disabled:opacity-40"
          >
            {row.active ? "Disable" : "Enable"}
          </button>
          {apiOn ? (
            <button
              type="button"
              disabled={!canWrite}
              onClick={() => setDeletePendingRow(row)}
              className="rounded-md border border-[#F5C2C0] px-2.5 py-1 text-[11px] font-semibold text-[#B42318] disabled:opacity-40"
            >
              Delete
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  const fieldClass =
    "mt-1.5 h-10 w-full rounded-xl border border-black/[0.08] bg-[#F7F7F8] px-3 text-sm";
  const labelClass = "ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]";

  return (
    <div>
      <AdminPageHeader
        title="Coupons"
        description="Create promo codes with validity windows, discount rules, and usage limits."
      />

      {listError ? <AdminNotice tone="error">{listError}</AdminNotice> : null}

      <ListToolbar
        resultLabel={`${rows.length} of ${source.length}`}
        search={{ value: query, onChange: setQuery, placeholder: "Search code…" }}
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
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-9 items-center rounded-xl bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white disabled:opacity-40"
            disabled={!canWrite}
          >
            New coupon
          </button>
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
        title={editingCode ? "Edit coupon" : "New coupon"}
        onClose={() => setDrawerOpen(false)}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block">
            <span className={labelClass}>Code</span>
            <input
              required
              value={form.code}
              onChange={(e) => up("code", e.target.value.toUpperCase())}
              disabled={Boolean(editingCode)}
              className={`${fieldClass} disabled:opacity-60`}
              placeholder="SUMMER20"
            />
          </label>

          {apiOn ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={labelClass}>Type</span>
                  <select
                    value={form.discountType}
                    onChange={(e) => up("discountType", e.target.value as "percent" | "fixed")}
                    className={fieldClass}
                  >
                    <option value="percent">Percent %</option>
                    <option value="fixed">Fixed ₹</option>
                  </select>
                </label>
                <label className="block">
                  <span className={labelClass}>{form.discountType === "fixed" ? "Amount ₹" : "% off"}</span>
                  <input
                    type="number"
                    min={1}
                    value={form.value}
                    onChange={(e) => up("value", e.target.value)}
                    className={fieldClass}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {form.discountType === "percent" ? (
                  <label className="block">
                    <span className={labelClass}>Max discount ₹ (cap)</span>
                    <input
                      type="number"
                      min={0}
                      value={form.maxDiscount}
                      onChange={(e) => up("maxDiscount", e.target.value)}
                      className={fieldClass}
                      placeholder="No cap"
                    />
                  </label>
                ) : null}
                <label className="block">
                  <span className={labelClass}>Min order ₹</span>
                  <input
                    type="number"
                    min={0}
                    value={form.minOrder}
                    onChange={(e) => up("minOrder", e.target.value)}
                    className={fieldClass}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={labelClass}>Starts</span>
                  <input type="date" value={form.startsAt} onChange={(e) => up("startsAt", e.target.value)} className={fieldClass} />
                </label>
                <label className="block">
                  <span className={labelClass}>Ends</span>
                  <input type="date" value={form.endsAt} onChange={(e) => up("endsAt", e.target.value)} className={fieldClass} />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={labelClass}>Total usage limit</span>
                  <input type="number" min={1} value={form.usageLimit} onChange={(e) => up("usageLimit", e.target.value)} className={fieldClass} placeholder="Unlimited" />
                </label>
                <label className="block">
                  <span className={labelClass}>Per-customer limit</span>
                  <input type="number" min={1} value={form.perCustomerLimit} onChange={(e) => up("perCustomerLimit", e.target.value)} className={fieldClass} placeholder="Unlimited" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={labelClass}>Category scope</span>
                  <select value={form.categorySlug} onChange={(e) => up("categorySlug", e.target.value)} className={fieldClass}>
                    <option value="">Any category</option>
                    {store.categories.map((c) => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={labelClass}>Brand scope</span>
                  <select value={form.brandSlug} onChange={(e) => up("brandSlug", e.target.value)} className={fieldClass}>
                    <option value="">Any brand</option>
                    {store.brands.map((b) => (
                      <option key={b.id} value={b.name.toLowerCase().replace(/\s+/g, "-")}>{b.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={form.firstOrderOnly} onChange={(e) => up("firstOrderOnly", e.target.checked)} className="accent-[#1D1D1F]" />
                First order only
              </label>
            </>
          ) : (
            <label className="block">
              <span className={labelClass}>% off</span>
              <input type="number" min={1} max={90} value={form.value} onChange={(e) => up("value", e.target.value)} className={fieldClass} />
            </label>
          )}

          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={form.active} onChange={(e) => up("active", e.target.checked)} className="accent-[#1D1D1F]" />
            Active
          </label>

          <button type="submit" className="h-10 w-full rounded-xl bg-[#1D1D1F] text-xs font-semibold text-white">
            Save coupon
          </button>
        </form>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(disableRow)}
        title={`Disable ${disableRow?.code ?? "coupon"}?`}
        description="Shoppers will no longer be able to apply this code at checkout."
        confirmLabel="Disable"
        danger
        onConfirm={() => {
          const row = disableRow;
          if (row) {
            if (apiOn) {
              void api
                .updateCoupon(row.code, { active: false })
                .then(() => {
                  toast.push(`${row.code} disabled`, "success");
                  return loadCoupons();
                })
                .catch(() => toast.push("Could not disable", "warning"));
            } else {
              const c = store.coupons.find((x) => x.id === row.id);
              if (c) upsertCoupon({ ...c, active: false });
              toast.push(`${row.code} disabled`, "success");
            }
          }
          setDisableRow(null);
        }}
        onCancel={() => setDisableRow(null)}
      />

      <ConfirmDialog
        open={Boolean(deletePendingRow)}
        title={`Delete ${deletePendingRow?.code ?? "coupon"}?`}
        description={deleteWarning}
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          const row = deletePendingRow;
          setDeletePendingRow(null);
          if (row) deleteRow(row);
        }}
        onCancel={() => setDeletePendingRow(null)}
      />
    </div>
  );
}

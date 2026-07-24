"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { isApiEnabled, api, type ApiDigitalCode, type ApiDigitalStock } from "@/lib/apiClient";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { ListToolbar } from "@/components/admin/ListToolbar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useAdminToast } from "@/components/admin/AdminToast";
import { maskDigitalCode, type AdminDigitalCode } from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { usePagedList, useSearchQueryParam } from "@/hooks/useListQuery";
import { useStaffRole } from "@/hooks/useStaffRole";
import { can } from "@/lib/adminPermissions";

const PAGE_SIZES = [25, 50, 100];

const statusTone: Record<string, string> = {
  available: "bg-[#EAF6ED] text-[#2D6B3C]",
  reserved: "bg-[#FEF6E7] text-[#8A5A00]",
  assigned: "bg-[#DBEAFE] text-[#1D4ED8]",
  redeemed: "bg-[#F0F0F2] text-[#6E6E73]",
};

export default function AdminDigitalCodesPage() {
  const apiOn = isApiEnabled();
  return apiOn ? <ApiVault /> : <MockVault />;
}

/* ------------------------------------------------------------------ API --- */

function ApiVault() {
  const toast = useAdminToast();
  const { role } = useStaffRole();
  const canWrite = can("orders.write", role);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useSearchQueryParam();
  const [codes, setCodes] = useState<ApiDigitalCode[]>([]);
  const [stock, setStock] = useState<ApiDigitalStock[]>([]);
  const [page, setPage] = usePagedList(`${filter}|${query}`);
  const [pageSize, setPageSize] = useState(25);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [importProduct, setImportProduct] = useState("");
  const [importCodes, setImportCodes] = useState("");
  const [importing, setImporting] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [list, st] = await Promise.all([
        api.adminDigitalCodes({ status: filter === "all" ? undefined : filter }),
        api.adminDigitalStock(),
      ]);
      setCodes(list.data);
      setStock(st);
    } catch {
      /* keep prior */
    }
  }, [filter]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return codes;
    return codes.filter(
      (c) => c.product_key.toLowerCase().includes(q) || c.masked_code.toLowerCase().includes(q),
    );
  }, [codes, query]);

  async function doImport() {
    if (!importProduct.trim() || !importCodes.trim()) return;
    setImporting(true);
    try {
      const res = await api.importDigitalCodes(importProduct.trim(), importCodes);
      toast.push(`Imported ${res.imported} · skipped ${res.skipped}`, "success");
      setImportCodes("");
      await reload();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : "Import failed", "warning");
    } finally {
      setImporting(false);
    }
  }

  const columns: DataTableColumn<ApiDigitalCode>[] = [
    {
      key: "code",
      header: "Code",
      render: (row) => <span className="ez-mono text-[11px]">{row.masked_code}</span>,
    },
    {
      key: "product",
      header: "Product",
      render: (row) => <span className="text-sm font-medium">{row.product_key}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <StatusBadge kind="custom" label={row.status} className={`capitalize ${statusTone[row.status] ?? ""}`} />
      ),
    },
    {
      key: "assigned",
      header: "Order",
      hideOnMobile: true,
      render: (row) => <span className="text-xs text-[#86868B]">{row.order_id ?? "—"}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) =>
        row.status === "available" ? (
          <button
            type="button"
            disabled={!canWrite}
            onClick={() => setDeleteId(row.id)}
            className="rounded-md border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-700 disabled:opacity-40"
          >
            Delete
          </button>
        ) : (
          <span className="text-[11px] text-[#AEAEB2]">—</span>
        ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Digital codes"
        description="Vault for game keys, wallet top-ups & gift cards. Codes auto-deliver when a digital order is placed."
      />

      {/* Stock summary */}
      {stock.length > 0 ? (
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {stock.map((s) => (
            <div key={s.product_key} className="rounded-xl border border-black/[0.07] bg-white p-3">
              <div className="ez-mono text-[10px] uppercase tracking-[0.12em] text-[#86868B]">
                {s.product_key}
              </div>
              <div className="mt-1 text-sm">
                <span className="font-semibold text-[#2D6B3C]">{s.available}</span> available ·{" "}
                <span className="text-[#6E6E73]">{s.assigned} assigned</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Import panel */}
      {canWrite ? (
        <div className="mb-5 rounded-2xl border border-black/[0.08] bg-[#F8F8FA] p-4 sm:p-5">
          <div className="ez-mono text-[10px] uppercase tracking-[0.14em] text-[#86868B]">
            Import codes
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[220px_1fr_auto] sm:items-start">
            <input
              value={importProduct}
              onChange={(e) => setImportProduct(e.target.value)}
              placeholder="Product key (e.g. psn-1000)"
              className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#1D1D1F]"
            />
            <textarea
              value={importCodes}
              onChange={(e) => setImportCodes(e.target.value)}
              placeholder="One code per line…"
              rows={3}
              className="rounded-lg border border-black/10 bg-white px-3 py-2 font-mono text-[12px] outline-none focus:border-[#1D1D1F]"
            />
            <button
              type="button"
              disabled={importing || !importProduct.trim() || !importCodes.trim()}
              onClick={() => void doImport()}
              className="h-10 rounded-lg bg-[#1D1D1F] px-4 text-xs font-semibold text-white disabled:opacity-40"
            >
              {importing ? "Importing…" : "Import"}
            </button>
          </div>
        </div>
      ) : null}

      <ListToolbar
        resultLabel={`${rows.length} codes`}
        search={{ value: query, onChange: setQuery, placeholder: "Search code or product…" }}
        filters={
          <AdminSelect
            label="Status"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All" },
              { value: "available", label: "Available" },
              { value: "assigned", label: "Assigned" },
            ]}
          />
        }
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        emptyMessage="No digital codes yet — import some above."
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        pageSizeOptions={PAGE_SIZES}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete this code?"
        description="Removes an unused code from the vault. Assigned codes are protected."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (deleteId) {
            void api
              .deleteDigitalCode(deleteId)
              .then(() => {
                toast.push("Code deleted", "success");
                return reload();
              })
              .catch(() => toast.push("Could not delete", "warning"));
          }
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

/* ----------------------------------------------------------------- Mock --- */

function MockVault() {
  const store = useAdminStore();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useSearchQueryParam();
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = usePagedList(`${filter}|${query}|${pageSize}`);
  const [revealed, setRevealed] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.digitalCodes.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.productName.toLowerCase().includes(q) ||
        c.platform.toLowerCase().includes(q)
      );
    });
  }, [store.digitalCodes, filter, query]);

  const columns: DataTableColumn<AdminDigitalCode>[] = [
    {
      key: "code",
      header: "Code",
      render: (row) => (
        <button
          type="button"
          className="ez-mono text-[11px] font-medium hover:underline"
          onClick={() => setRevealed((p) => (p === row.id ? null : row.id))}
        >
          {revealed === row.id ? row.code : maskDigitalCode(row.code)}
        </button>
      ),
    },
    {
      key: "product",
      header: "Product",
      render: (row) => <span className="text-sm font-medium">{row.productName}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <StatusBadge kind="custom" label={row.status} className={`capitalize ${statusTone[row.status] ?? ""}`} />
      ),
    },
  ];

  return (
    <div>
      <AdminNotice tone="demo">
        The code vault is a local demo — enable the store API for a live vault with import + auto-delivery.
      </AdminNotice>
      <AdminPageHeader
        title="Digital codes"
        description="Vault for wallet top-ups and gift cards."
        actions={
          <Link
            href="/admin/tools/import"
            className="inline-flex h-9 items-center rounded-xl border border-black/[0.1] bg-white px-3 text-xs font-semibold"
          >
            Import CSV
          </Link>
        }
      />

      <ListToolbar
        resultLabel={`${rows.length} of ${store.digitalCodes.length}`}
        search={{ value: query, onChange: setQuery, placeholder: "Search code, product…" }}
        filters={
          <AdminSelect
            label="Status"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All" },
              { value: "available", label: "Available" },
              { value: "assigned", label: "Assigned" },
              { value: "redeemed", label: "Redeemed" },
            ]}
          />
        }
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        emptyMessage="No digital codes match."
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        pageSizeOptions={PAGE_SIZES}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}

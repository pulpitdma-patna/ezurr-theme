"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { ListToolbar } from "@/components/admin/ListToolbar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useAdminToast } from "@/components/admin/AdminToast";
import { maskDigitalCode, type AdminDigitalCode, type AdminDigitalCodeStatus } from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { usePagedList, useSearchQueryParam } from "@/hooks/useListQuery";
import { useStaffRole } from "@/hooks/useStaffRole";
import { can } from "@/lib/adminPermissions";
import { assignDigitalCodeToOrder, logActivity, updateDigitalCode } from "@/lib/adminStore";

const statusTone: Record<AdminDigitalCodeStatus, string> = {
  available: "bg-[#EAF6ED] text-[#2D6B3C]",
  assigned: "bg-[#DBEAFE] text-[#1D4ED8]",
  redeemed: "bg-[#F0F0F2] text-[#6E6E73]",
};

const PAGE_SIZES = [10, 25, 50, 100];

export default function AdminDigitalCodesPage() {
  const store = useAdminStore();
  const toast = useAdminToast();
  const { role } = useStaffRole();
  const canWrite = can("orders.write", role);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useSearchQueryParam();
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = usePagedList(`${filter}|${query}|${pageSize}`);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [assignId, setAssignId] = useState<string | null>(null);
  const [orderPick, setOrderPick] = useState("");
  const [redeemId, setRedeemId] = useState<string | null>(null);

  const digitalOrders = useMemo(
    () =>
      store.orders.filter(
        (o) =>
          o.status !== "cancelled" &&
          o.items.some((item) => item.fulfillmentType === "digital"),
      ),
    [store.orders],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.digitalCodes.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.productName.toLowerCase().includes(q) ||
        c.platform.toLowerCase().includes(q) ||
        (c.assignedOrderId ?? "").toLowerCase().includes(q)
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
          className="ez-mono text-[11px] font-medium hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
          onClick={(e) => {
            e.stopPropagation();
            const next = revealed === row.id ? null : row.id;
            setRevealed(next);
            if (next) {
              logActivity({
                actor: "Admin",
                action: "digital_code.revealed",
                entityType: "system",
                entityId: row.id,
                detail: maskDigitalCode(row.code),
              });
            }
          }}
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
      key: "platform",
      header: "Platform",
      hideOnMobile: true,
      render: (row) => <span className="text-xs text-[#6E6E73]">{row.platform}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <StatusBadge
          kind="custom"
          label={row.status}
          className={`capitalize ${statusTone[row.status]}`}
        />
      ),
    },
    {
      key: "assigned",
      header: "Assigned",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs text-[#86868B]">
          {row.assignedTo ?? "—"}
          {row.assignedOrderId ? (
            <>
              {" · "}
              <Link href={`/admin/orders/${row.assignedOrderId}`} className="font-semibold">
                {row.assignedOrderId}
              </Link>
            </>
          ) : null}
        </span>
      ),
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
            onClick={(e) => {
              e.stopPropagation();
              setAssignId(row.id);
              setOrderPick(digitalOrders[0]?.id ?? "");
            }}
            className="rounded-md border border-black/10 px-2.5 py-1 text-[11px] font-semibold disabled:opacity-40"
          >
            Assign
          </button>
        ) : row.status === "assigned" ? (
          <button
            type="button"
            disabled={!canWrite}
            onClick={(e) => {
              e.stopPropagation();
              setRedeemId(row.id);
            }}
            className="rounded-md border border-black/10 px-2.5 py-1 text-[11px] font-semibold disabled:opacity-40"
          >
            Redeem
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
        description="Vault for wallet top-ups and gift cards — assign to a real digital order."
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
        search={{
          value: query,
          onChange: setQuery,
          placeholder: "Search code, product, order…",
        }}
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

      {assignId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Dismiss"
            onClick={() => setAssignId(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-sm rounded-lg border border-black/[0.08] bg-white p-5 shadow-lg"
          >
            <h2 className="text-sm font-semibold">Assign to order</h2>
            <p className="mt-1 text-xs text-[#6E6E73]">
              Pick a digital order so the code links to a customer.
            </p>
            {digitalOrders.length === 0 ? (
              <p className="mt-3 text-sm text-[#B42318]">No open digital orders available.</p>
            ) : (
              <select
                value={orderPick}
                onChange={(e) => setOrderPick(e.target.value)}
                className="mt-3 h-9 w-full rounded-md border border-black/[0.08] bg-[#F7F7F8] px-3 text-sm"
              >
                {digitalOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.id} · {order.customerName}
                  </option>
                ))}
              </select>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssignId(null)}
                className="h-8 rounded-md border border-black/10 px-3 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!orderPick || digitalOrders.length === 0}
                onClick={() => {
                  if (!assignId || !orderPick) return;
                  assignDigitalCodeToOrder(assignId, orderPick);
                  setAssignId(null);
                  toast.push("Code assigned", "success");
                }}
                className="h-8 rounded-md bg-[#1D1D1F] px-3 text-xs font-semibold text-white disabled:opacity-40"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(redeemId)}
        title="Mark code redeemed?"
        description="This marks the vault entry as redeemed for the assigned customer."
        confirmLabel="Redeem"
        onConfirm={() => {
          if (redeemId) {
            updateDigitalCode(redeemId, {
              status: "redeemed",
              redeemedAt: new Date().toISOString(),
            });
            toast.push("Code redeemed", "success");
          }
          setRedeemId(null);
        }}
        onCancel={() => setRedeemId(null)}
      />
    </div>
  );
}

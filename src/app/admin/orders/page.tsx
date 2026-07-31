"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { ExportIcon, EyeIcon, IconButton } from "@/components/admin/IconButton";
import { ListToolbar } from "@/components/admin/ListToolbar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  formatInr,
  parsePrice,
  type AdminOrder,
} from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useListSavedViews } from "@/hooks/useListSavedViews";
import { usePagedList, useSearchQueryParam } from "@/hooks/useListQuery";
import { adminErrorMessage } from "@/lib/adminError";
import { looksLikeMobileQuery, mobileMatches } from "@/lib/mobileMatch";
import { formatAdminDate } from "@/lib/adminFormat";
import { formatMobileDisplay } from "@/lib/auth";
import { bulkUpdateOrderStatus } from "@/lib/adminStore";
import { api, isApiEnabled } from "@/lib/apiClient";
import { mapApiOrderToAdmin } from "@/lib/apiMappers";
import { useAdminToast } from "@/components/admin/AdminToast";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

const PAGE_SIZES = [10, 25, 50, 100];

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "packed", label: "Packed" },
  { value: "shipped", label: "Shipped" },
  { value: "preorder", label: "Pre-order" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

const dateRangeOptions = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "custom", label: "Custom range" },
];

function startOfDay(d: Date) {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(d: Date) {
  const next = new Date(d);
  next.setHours(23, 59, 59, 999);
  return next;
}

function inDateRange(
  placedAt: string,
  range: string,
  from: string,
  to: string,
): boolean {
  const placed = new Date(placedAt).getTime();
  if (Number.isNaN(placed)) return true;
  const now = new Date();

  if (range === "today") {
    return placed >= startOfDay(now).getTime() && placed <= endOfDay(now).getTime();
  }
  if (range === "7d") {
    const fromDate = startOfDay(now);
    fromDate.setDate(fromDate.getDate() - 6);
    return placed >= fromDate.getTime() && placed <= endOfDay(now).getTime();
  }
  if (range === "30d") {
    const fromDate = startOfDay(now);
    fromDate.setDate(fromDate.getDate() - 29);
    return placed >= fromDate.getTime() && placed <= endOfDay(now).getTime();
  }
  if (range === "custom") {
    if (from) {
      const fromTs = startOfDay(new Date(from)).getTime();
      if (placed < fromTs) return false;
    }
    if (to) {
      const toTs = endOfDay(new Date(to)).getTime();
      if (placed > toTs) return false;
    }
  }
  return true;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const store = useAdminStore();
  const [status, setStatus] = useState("all");
  const urlPayment = searchParams.get("payment");
  const [paymentLocal, setPaymentLocal] = useState<"all" | "COD" | "Prepaid" | null>(null);
  const [seenPay, setSeenPay] = useState(urlPayment);
  if (urlPayment !== seenPay) {
    setSeenPay(urlPayment);
    setPaymentLocal(null);
  }
  const payment: "all" | "COD" | "Prepaid" =
    paymentLocal ??
    (urlPayment === "COD" || urlPayment === "Prepaid" ? urlPayment : "all");

  const [dateRange, setDateRange] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [query, setQuery] = useSearchQueryParam();
  const [sortKey, setSortKey] = useState("placedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState(25);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [bulkConfirm, setBulkConfirm] = useState<"packed" | "shipped" | null>(null);
  const [density, setDensity] = useState<"compact" | "comfortable">("comfortable");
  const { views, removeView } = useListSavedViews("orders");
  const toast = useAdminToast();
  const [listLoading, setListLoading] = useState(true);
  const [apiOrders, setApiOrders] = useState<AdminOrder[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  useEffect(() => {
    if (!isApiEnabled()) {
      const t = window.setTimeout(() => setListLoading(false), 220);
      return () => window.clearTimeout(t);
    }
    let cancelled = false;
    setListLoading(true);
    void (async () => {
      try {
        // Page through the full order book (server clamps per_page to 100)
        // instead of showing only the first page.
        const perPage = 100;
        const first = await api.adminOrders({ page: 1, per_page: perPage });
        let all = Array.isArray(first.data) ? first.data : [];
        const lastPage = Number(first.last_page ?? 1);
        for (let p = 2; p <= lastPage && !cancelled; p += 1) {
          const res = await api.adminOrders({ page: p, per_page: perPage });
          if (Array.isArray(res.data)) all = all.concat(res.data);
        }
        if (cancelled) return;
        setApiOrders(all.map((raw) => mapApiOrderToAdmin(raw)));
        setListError(null);
      } catch (err) {
        if (cancelled) return;
        setApiOrders([]);
        setListError(err instanceof Error ? err.message : "Could not load orders");
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const [page, setPage] = usePagedList(
    `${status}|${payment}|${dateRange}|${dateFrom}|${dateTo}|${query}|${sortKey}|${sortDir}|${pageSize}`,
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    // A phone number typed the way a customer says it — "98765 43210",
    // "+91 98765 43210" — used to match nothing, because the filter compared the
    // raw string. See lib/mobileMatch.
    const searchingByPhone = looksLikeMobileQuery(q);
    const source = isApiEnabled() ? apiOrders : store.orders;
    let list = source.filter((order) => {
      if (status !== "all" && order.status !== status) return false;
      if (payment !== "all" && order.payment !== payment) return false;
      if (!inDateRange(order.placedAt, dateRange, dateFrom, dateTo)) return false;
      if (!q) return true;
      return (
        order.id.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        (searchingByPhone
          ? mobileMatches(order.customerMobile, q)
          : order.customerMobile.includes(q)) ||
        order.city.toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "total") cmp = parsePrice(a.total) - parsePrice(b.total);
      else if (sortKey === "placedAt") cmp = a.placedAt.localeCompare(b.placedAt);
      else if (sortKey === "customer") cmp = a.customerName.localeCompare(b.customerName);
      else cmp = a.id.localeCompare(b.id);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [
    apiOrders,
    store.orders,
    status,
    payment,
    dateRange,
    dateFrom,
    dateTo,
    query,
    sortKey,
    sortDir,
  ]);

  function exportCsv() {
    const header = "id,placedAt,customer,mobile,total,payment,status,city\n";
    const body = rows
      .map(
        (o) =>
          `${o.id},${o.placedAt},"${o.customerName.replace(/"/g, '""')}",${o.customerMobile},${o.total},${o.payment},${o.status},${o.city}`,
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ezurr-orders.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns: DataTableColumn<AdminOrder>[] = [
    {
      key: "placedAt",
      header: "Order",
      sortable: true,
      render: (row) => (
        <div>
          <div className="ez-mono text-[10px] font-semibold uppercase tracking-[0.08em]">
            {row.id}
          </div>
          <div className="mt-0.5 text-[11px] text-[#86868B]">{formatAdminDate(row.placedAt)}</div>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      sortable: true,
      render: (row) => (
        <div>
          <div className="text-sm font-semibold tracking-[-0.02em]">{row.customerName}</div>
          <div className="ez-mono mt-0.5 text-[10px] text-[#86868B]">
            {formatMobileDisplay(row.customerMobile)}
          </div>
        </div>
      ),
    },
    {
      key: "total",
      header: "Total",
      sortable: true,
      render: (row) => (
        <div>
          <div className="ez-mono text-xs font-medium">{row.total}</div>
          <div className="mt-0.5 text-[11px] text-[#86868B]">{row.payment}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge kind="order" status={row.status} />,
    },
    {
      key: "city",
      header: "City",
      hideOnMobile: true,
      render: (row) => <span className="text-xs text-[#6E6E73]">{row.city}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <IconButton
            label="View order"
            onClick={() => router.push(`/admin/orders/${row.id}`)}
          >
            <EyeIcon />
          </IconButton>
        </div>
      ),
    },
  ];

  function onSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "placedAt" ? "desc" : "asc");
    }
  }

  // In API mode apiOrders holds the full order book, so counts must read it —
  // not the local seed store.
  const orderSource = isApiEnabled() ? apiOrders : store.orders;
  const pendingCod = orderSource.filter(
    (o) => o.payment === "COD" && o.status === "pending",
  ).length;

  return (
    <div>
      <AdminPageHeader
        title="Orders"
        description="Confirm COD, pack prepaid, and ship — open any row for fulfillment."
      />

      {listError ? (
        <AdminNotice tone="error">{listError}</AdminNotice>
      ) : null}

      <ListToolbar
        resultLabel={`${rows.length} of ${orderSource.length}`}
        search={{
          value: query,
          onChange: setQuery,
          placeholder: "Search order ID, customer, mobile, city…",
        }}
        filters={
          <>
            <AdminSelect
              label="Status"
              value={status}
              onChange={setStatus}
              options={statusOptions}
            />
            <AdminSelect
              label="Payment"
              value={payment}
              onChange={(v) => setPaymentLocal(v as "all" | "COD" | "Prepaid")}
              options={[
                { value: "all", label: "All payments" },
                { value: "COD", label: "COD" },
                { value: "Prepaid", label: "Prepaid" },
              ]}
            />
            <AdminSelect
              label="Date"
              value={dateRange}
              onChange={setDateRange}
              options={dateRangeOptions}
            />
            {dateRange === "custom" ? (
              <>
                <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-black/[0.07] bg-white pl-3 pr-2 shadow-none">
                  <span className="ez-mono shrink-0 text-[9px] uppercase tracking-[0.12em] text-[#86868B]">
                    From
                  </span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-full border-0 bg-transparent text-xs font-semibold text-[#1D1D1F] outline-none"
                  />
                </label>
                <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-black/[0.07] bg-white pl-3 pr-2 shadow-none">
                  <span className="ez-mono shrink-0 text-[9px] uppercase tracking-[0.12em] text-[#86868B]">
                    To
                  </span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-full border-0 bg-transparent text-xs font-semibold text-[#1D1D1F] outline-none"
                  />
                </label>
              </>
            ) : null}
          </>
        }
        actions={
          <>
            {pendingCod > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setPaymentLocal("COD");
                  setStatus("pending");
                  setDateRange("all");
                }}
                className="inline-flex h-9 items-center rounded-xl border border-[#F5C2C0] bg-[#FFF5F5] px-3 text-xs font-semibold text-[#B42318]"
              >
                COD · {pendingCod}
              </button>
            ) : null}
            <div
              className="inline-flex h-9 items-center rounded-xl border border-black/[0.07] bg-white p-0.5"
              role="group"
              aria-label="Table density"
            >
              {(
                [
                  { id: "comfortable" as const, label: "Comfort" },
                  { id: "compact" as const, label: "Compact" },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setDensity(option.id)}
                  className={`h-8 rounded-lg px-2.5 text-[11px] font-semibold transition ${
                    density === option.id
                      ? "bg-[#1D1D1F] text-white"
                      : "text-[#6E6E73] hover:text-[#1D1D1F]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <IconButton label="Export CSV" onClick={exportCsv} size="md">
              <ExportIcon />
            </IconButton>
          </>
        }
      />

      {views.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {views.map((view) => (
            <button
              key={view.id}
              type="button"
              onClick={() => {
                setQuery(view.query);
                setStatus(view.filters.status ?? "all");
                setPaymentLocal(
                  view.filters.payment === "COD" || view.filters.payment === "Prepaid"
                    ? view.filters.payment
                    : "all",
                );
                setDateRange(view.filters.dateRange ?? "all");
                setDateFrom(view.filters.dateFrom ?? "");
                setDateTo(view.filters.dateTo ?? "");
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                removeView(view.id);
                toast.push("View removed", "neutral");
              }}
              className="rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#424245] hover:text-[#1D1D1F]"
              title="Click to apply · right-click to remove"
            >
              {view.name}
            </button>
          ))}
        </div>
      ) : null}

      <DataTable
        loading={listLoading}
        density={density}
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        emptyMessage="No orders match this filter."
        onRowClick={(row) => router.push(`/admin/orders/${row.id}`)}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        pageSizeOptions={PAGE_SIZES}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        selectable
        selectedKeys={selectedKeys}
        onToggleRow={(key) => {
          setSelectedKeys((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
          );
        }}
        onToggleAll={() => {
          const pageIds = rows
            .slice((page - 1) * pageSize, page * pageSize)
            .map((o) => o.id);
          const allOnPage = pageIds.every((id) => selectedKeys.includes(id));
          setSelectedKeys((prev) =>
            allOnPage
              ? prev.filter((id) => !pageIds.includes(id))
              : [...new Set([...prev, ...pageIds])],
          );
        }}
        bulkBar={
          <>
            <span className="ez-mono text-[10px] uppercase tracking-[0.12em] text-white/70">
              {selectedKeys.length} selected
            </span>
            <button
              type="button"
              className="h-8 rounded-lg bg-white px-3 text-xs font-semibold text-[#1D1D1F]"
              onClick={() => setBulkConfirm("packed")}
            >
              Mark packed
            </button>
            <button
              type="button"
              className="h-8 rounded-lg border border-white/20 px-3 text-xs font-semibold text-white"
              onClick={() => setBulkConfirm("shipped")}
            >
              Mark shipped
            </button>
            <button
              type="button"
              className="h-8 rounded-lg px-3 text-xs font-semibold text-white/70"
              onClick={() => setSelectedKeys([])}
            >
              Clear
            </button>
          </>
        }
      />

      <ConfirmDialog
        open={bulkConfirm !== null}
        title={
          bulkConfirm === "shipped"
            ? `Mark ${selectedKeys.length} order(s) shipped?`
            : `Mark ${selectedKeys.length} order(s) packed?`
        }
        description="This updates status for every selected order. You can still change individual orders afterward."
        confirmLabel={bulkConfirm === "shipped" ? "Mark shipped" : "Mark packed"}
        onCancel={() => setBulkConfirm(null)}
        onConfirm={() => {
          if (!bulkConfirm) return;
          const count = selectedKeys.length;
          if (isApiEnabled()) {
            // allSettled, not all. Promise.all rejects on the FIRST failure while
            // every other request carries on and succeeds on the server — so one
            // illegal transition in a batch of twenty (a COD order not accepted
            // yet cannot go straight to packed) skipped the .then() entirely.
            // The other nineteen were packed, the list still showed them
            // unpacked, and the toast said "Could not update orders via API".
            // The owner was told nothing happened, on the job they do every
            // morning, and had to reload and compare rows by eye to find out
            // what was true.
            void Promise.allSettled(
              selectedKeys.map((id) =>
                api.patchOrderStatus(id, { status: bulkConfirm }),
              ),
            ).then((results) => {
              const done: string[] = [];
              const failed: { id: string; reason: string }[] = [];
              results.forEach((r, i) => {
                const id = selectedKeys[i];
                if (r.status === "fulfilled") done.push(id);
                else failed.push({ id, reason: adminErrorMessage(r.reason, "Could not update it.") });
              });

              // Apply what actually landed, so the list agrees with the server
              // even when part of the batch was refused.
              if (done.length) {
                setApiOrders((prev) =>
                  prev.map((o) => (done.includes(o.id) ? { ...o, status: bulkConfirm } : o)),
                );
              }

              if (!failed.length) {
                toast.push(`Marked ${done.length} order(s) ${bulkConfirm}`, "success");
              } else if (!done.length) {
                toast.push(failed[0].reason, "danger");
              } else {
                // Partial: say both halves. The count that moved is the useful
                // number; the reason is why the rest did not.
                toast.push(
                  `${done.length} marked ${bulkConfirm}. ${failed.length} could not be — ${failed[0].reason}`,
                  "warning",
                );
              }

              // Keep the refused ones selected so they can be dealt with; only
              // clear what succeeded. Clearing everything meant the owner could
              // not even see which orders still needed attention.
              setSelectedKeys(failed.map((f) => f.id));
            });
          } else {
            bulkUpdateOrderStatus(selectedKeys, bulkConfirm);
            toast.push(`Marked ${count} order(s) ${bulkConfirm}`, "success");
            setSelectedKeys([]);
          }
          setBulkConfirm(null);
        }}
      />
    </div>
  );
}

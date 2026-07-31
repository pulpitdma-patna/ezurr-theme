"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageTabs, type AdminTab } from "@/components/admin/AdminPageTabs";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { ExportIcon, IconButton } from "@/components/admin/IconButton";
import { ListToolbar } from "@/components/admin/ListToolbar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { AdminOrder } from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useSearchQueryParam } from "@/hooks/useListQuery";
import { adminErrorMessage } from "@/lib/adminError";
import { formatAdminDate } from "@/lib/adminFormat";
import { bulkUpdateOrderStatus } from "@/lib/adminStore";
import { api, isApiEnabled } from "@/lib/apiClient";
import { mapApiOrderToAdmin } from "@/lib/apiMappers";
import { formatMobileDisplay } from "@/lib/auth";
import { looksLikeMobileQuery, mobileDigits } from "@/lib/mobileMatch";

/**
 * The orders screen, organised around the job instead of the data model.
 *
 * It used to be every order ever taken — fetched a hundred at a time before it
 * could paint anything — under Status / Payment / Date dropdowns. The owner does
 * not think in statuses; he thinks in piles: what must I accept, what do I pack,
 * what goes out today. Each tab is one pile.
 *
 * Because every order behind a tab shares one legal next move, the bulk action
 * offered there can never be refused. That structurally removes the failure
 * where marking twenty orders packed announced "Could not update orders via API"
 * — one was a cash-on-delivery order he had not accepted yet, the other nineteen
 * went through, and the screen reported that nothing had happened.
 */

type TabDef = AdminTab & { action?: { status: string; label: string; verb: string } };

/** Mirrors OrderController::BUCKETS. The server owns the statuses; this owns the words. */
const TABS: TabDef[] = [
  { key: "needs-ok", label: "Needs your OK", action: { status: "confirmed", label: "Accept", verb: "accepted" } },
  { key: "to-pack", label: "To pack", action: { status: "packed", label: "Packed", verb: "packed" } },
  { key: "to-send", label: "To send", action: { status: "shipped", label: "Sent", verb: "sent" } },
  { key: "on-the-way", label: "On the way", action: { status: "delivered", label: "Delivered", verb: "delivered" } },
  { key: "money-problem", label: "Money problem", tone: "alert" },
  { key: "delivered", label: "Delivered" },
  { key: "closed", label: "Closed" },
];

const READ_ONLY = new Set(["money-problem", "delivered", "closed"]);

/** Mock mode only — in API mode the server groups these. */
const MOCK_BUCKETS: Record<string, string[]> = {
  "needs-ok": ["pending", "preorder"],
  "to-pack": ["confirmed", "paid"],
  "to-send": ["packed"],
  "on-the-way": ["shipped"],
  "money-problem": ["pending_payment", "payment_failed"],
  delivered: ["delivered"],
  closed: ["cancelled", "refunded"],
};

/** "Today 4:12 pm" for something from today, the date otherwise. */
function whenPlaced(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (!sameDay) return formatAdminDate(iso);
  return `Today ${d
    .toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
    .toLowerCase()}`;
}

function describeItems(order: AdminOrder): string {
  const items = order.items ?? [];
  if (items.length === 0) return "—";
  if (items.length === 1) return `${items[0].qty} × ${items[0].name}`;
  return `${items[0].name} + ${items.length - 1} more`;
}

/** Only when it is NOT a plain physical order — otherwise it is noise on every row. */
function fulfilmentTag(order: AdminOrder): string | null {
  const types = new Set((order.items ?? []).map((i) => i.fulfillmentType));
  if (types.has("digital")) return "Code by email";
  if (types.has("preorder")) return "Waiting for release";
  return null;
}

type BulkReport = { done: number; failed: { id: string; reason: string }[]; verb: string };

export default function AdminOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const store = useAdminStore();
  const apiOn = isApiEnabled();

  // The tab lives in the URL so the back button and a bookmark both work. The
  // old ?payment=COD shortcut lands on the pile it was really asking for.
  const urlTab = searchParams.get("tab");
  const tab = TABS.some((t) => t.key === urlTab) ? (urlTab as string) : "needs-ok";
  const activeTab = TABS.find((t) => t.key === tab)!;
  const readOnly = READ_ONLY.has(tab);

  const [query, setQuery] = useSearchQueryParam();
  const [page, setPage] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [rows, setRows] = useState<AdminOrder[]>([]);
  const [buckets, setBuckets] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [report, setReport] = useState<BulkReport | null>(null);
  const [working, setWorking] = useState(false);

  function goToTab(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    params.delete("payment");
    router.replace(`/admin/orders?${params.toString()}`, { scroll: false });
  }

  const load = useCallback(async () => {
    if (!apiOn) {
      const statuses = MOCK_BUCKETS[tab] ?? [];
      setRows(store.orders.filter((o) => statuses.includes(o.status)));
      setBuckets(
        Object.fromEntries(
          Object.entries(MOCK_BUCKETS).map(([k, list]) => [
            k,
            store.orders.filter((o) => list.includes(o.status)).length,
          ]),
        ),
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // A phone number typed the way a customer says it goes as bare digits;
      // anything else is free text. Both are answered by the server — the browser
      // never re-filters, so what is on screen is what the shop actually has.
      const trimmed = query.trim();
      const asPhone = looksLikeMobileQuery(trimmed) ? mobileDigits(trimmed) : null;

      const res = await api.adminOrders({
        // A search spans every pile: at the counter he wants the order, not the
        // order if it happens to sit in the tab he left open.
        ...(trimmed ? {} : { bucket: tab }),
        ...(asPhone ? { mobile: asPhone } : trimmed ? { search: trimmed } : {}),
        per_page: 100,
      });
      setRows((Array.isArray(res.data) ? res.data : []).map(mapApiOrderToAdmin));
      setBuckets(res.buckets ?? {});
      setListError(null);
    } catch (err) {
      setRows([]);
      setListError(adminErrorMessage(err, "Could not load your orders."));
    } finally {
      setLoading(false);
    }
  }, [apiOn, tab, query, store.orders]);

  useEffect(() => {
    void load();
  }, [load]);

  // Selection must never outlive what is on screen. It used to survive a tab
  // change, so the bulk bar could act on rows he could no longer see.
  useEffect(() => {
    setSelectedKeys([]);
    setPage(1);
  }, [tab, query]);

  /**
   * One order at a time, collecting an outcome for each.
   *
   * Promise.all rejected on the first failure while the rest carried on and
   * succeeded on the server, leaving the screen showing the old status for
   * orders that had already changed. Successes merge as they land.
   */
  async function runBulk(ids: string[], action: { status: string; verb: string }) {
    if (!ids.length || working) return;
    setWorking(true);
    const done: string[] = [];
    const failed: { id: string; reason: string }[] = [];

    for (const id of ids) {
      try {
        if (apiOn) await api.patchOrderStatus(id, { status: action.status });
        done.push(id);
        setRows((prev) =>
          prev.map((o) =>
            o.id === id ? { ...o, status: action.status as AdminOrder["status"] } : o,
          ),
        );
      } catch (err) {
        failed.push({ id, reason: adminErrorMessage(err, "Could not update it.") });
      }
    }

    if (!apiOn && done.length) {
      bulkUpdateOrderStatus(done, action.status as "packed" | "shipped");
    }

    setReport({ done: done.length, failed, verb: action.verb });
    // Only the refused ones stay selected, so what still needs attention stays
    // visible instead of being cleared away.
    setSelectedKeys(failed.map((f) => f.id));
    setWorking(false);
    void load();
  }

  function exportCsv() {
    const header = "id,placedAt,customer,mobile,total,payment,status\n";
    const body = rows
      .map(
        (o) =>
          `${o.id},${o.placedAt},"${o.customerName.replace(/"/g, '""')}",${o.customerMobile},${o.total},${o.payment},${o.status}`,
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([header + body], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "ezurr-orders.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns: DataTableColumn<AdminOrder>[] = [
    {
      key: "customer",
      header: "Customer",
      render: (row) => (
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-[-0.02em]">
            {row.customerName}
          </div>
          <div className="ez-mono mt-0.5 text-[11px] text-[#86868B]">
            {formatMobileDisplay(row.customerMobile)}
          </div>
        </div>
      ),
    },
    {
      key: "order",
      header: "Order",
      className: "w-[140px]",
      render: (row) => (
        <div>
          <div className="ez-mono text-[10px] text-[#6E6E73]">#{row.id}</div>
          <div className="mt-0.5 text-[11px] text-[#86868B]">{whenPlaced(row.placedAt)}</div>
        </div>
      ),
    },
    {
      key: "what",
      header: "What",
      hideOnMobile: true,
      render: (row) => {
        const tag = fulfilmentTag(row);
        return (
          <div className="min-w-0">
            <div className="truncate text-[13px] text-[#1D1D1F]">{describeItems(row)}</div>
            {tag ? <div className="mt-0.5 text-[11px] text-[#86868B]">{tag}</div> : null}
          </div>
        );
      },
    },
    {
      key: "money",
      header: "Money",
      className: "w-[180px]",
      render: (row) => (
        <div>
          <div className="ez-mono text-xs font-medium">{row.total}</div>
          {/* Straight from the server (OrderMoneyService). Working this out here
              is how a list ends up saying "Paid" beside an unpaid order. */}
          {row.money?.sentence ? (
            <div className="mt-0.5 text-[11px] text-[#6E6E73]">{row.money.sentence}</div>
          ) : null}
        </div>
      ),
    },
    {
      key: "next",
      header: "Next",
      className: "w-[130px] text-right",
      render: (row) => {
        // The server decides this. The theme used to keep its own status→action
        // map, which had drifted: no payment_failed key, so a failed-payment
        // order claimed there was nothing to do.
        const primary = row.next?.primary;
        if (!primary) return <StatusBadge kind="order" status={row.status} />;
        return (
          <button
            type="button"
            disabled={working}
            onClick={(e) => {
              e.stopPropagation();
              void runBulk([row.id], {
                status: primary.status,
                verb: primary.label.toLowerCase(),
              });
            }}
            className="inline-flex h-7 items-center rounded-lg bg-[#1D1D1F] px-2.5 text-[11px] font-semibold text-white transition hover:bg-[#2C2C2E] disabled:opacity-50"
          >
            {primary.label}
          </button>
        );
      },
    },
  ];

  const bulkBar =
    !readOnly && selectedKeys.length > 0 && activeTab.action ? (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold">{selectedKeys.length} selected</span>
        <button
          type="button"
          disabled={working}
          onClick={() =>
            void runBulk(selectedKeys, {
              status: activeTab.action!.status,
              verb: activeTab.action!.verb,
            })
          }
          className="inline-flex h-8 items-center rounded-lg bg-[#1D1D1F] px-3 text-xs font-semibold text-white transition hover:bg-[#2C2C2E] disabled:opacity-50"
        >
          {working ? "Working…" : `Mark ${selectedKeys.length} ${activeTab.action.verb}`}
        </button>
        {tab === "to-pack" ? (
          <button
            type="button"
            onClick={() =>
              router.push(`/admin/orders/print?ids=${selectedKeys.join(",")}&type=packing_slip`)
            }
            className="inline-flex h-8 items-center rounded-lg border border-black/[0.08] bg-white px-3 text-xs font-semibold text-[#1D1D1F] transition hover:bg-[#FAFAFB]"
          >
            Print {selectedKeys.length} packing list{selectedKeys.length === 1 ? "" : "s"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setSelectedKeys([])}
          className="text-xs font-semibold text-[#6E6E73] hover:text-[#1D1D1F]"
        >
          Clear
        </button>
      </div>
    ) : null;

  return (
    <div>
      <AdminPageHeader
        title="Orders"
        description="Your work, in the order it needs doing."
        breadcrumbs={[{ label: "Fulfillment", href: "/admin/orders" }, { label: "Orders" }]}
      />

      {listError ? <AdminNotice tone="error">{listError}</AdminNotice> : null}

      {/* A batch report is a notice that stays, not a toast that vanishes — the
          part that did not go through is the part he has to act on. */}
      {report ? (
        <AdminNotice tone={report.failed.length ? "demo" : "info"}>
          {report.failed.length === 0 ? (
            <>
              {report.done} order{report.done === 1 ? "" : "s"} marked {report.verb}.
            </>
          ) : (
            <>
              <strong>
                {report.done} {report.verb}. {report.failed.length} couldn&apos;t be
              </strong>{" "}
              — {report.failed[0].reason}
              {report.failed.length > 1 ? ` (and ${report.failed.length - 1} more)` : ""}. Those are
              still selected.
            </>
          )}
        </AdminNotice>
      ) : null}

      <AdminPageTabs
        tabs={TABS.map((t) => ({ ...t, count: buckets[t.key] }))}
        active={tab}
        onChange={goToTab}
        ariaLabel="Order piles"
      />

      <ListToolbar
        search={{
          value: query,
          onChange: setQuery,
          placeholder: "Search by name, phone, or order number",
        }}
        actions={
          <IconButton label="Export CSV" onClick={exportCsv} size="md">
            <ExportIcon />
          </IconButton>
        }
        bulkBar={bulkBar}
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        density="compact"
        emptyMessage={
          query.trim()
            ? "Nothing matched that search."
            : readOnly
              ? "Nothing here."
              : "Nothing waiting — you're all caught up."
        }
        onRowClick={(row) => router.push(`/admin/orders/${row.id}`)}
        selectable={!readOnly}
        selectedKeys={selectedKeys}
        onToggleRow={(key) =>
          setSelectedKeys((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
          )
        }
        onToggleAll={() =>
          setSelectedKeys((prev) => (prev.length === rows.length ? [] : rows.map((r) => r.id)))
        }
        page={page}
        pageSize={25}
        onPageChange={setPage}
      />
    </div>
  );
}

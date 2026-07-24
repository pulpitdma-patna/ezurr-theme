"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AdminChart } from "@/components/admin/AdminChart";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { useApiSettings } from "@/hooks/useApiSettings";
import { ReportDateFilter } from "@/components/admin/reports/ReportDateFilter";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StockBadge } from "@/components/admin/StockBadge";
import { formatInr, parsePrice, type AdminCatalogRow, type AdminOrder } from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useReportFilters } from "@/hooks/useReportFilters";
import { getDerivedAlerts } from "@/lib/adminStore";
import { api, isApiEnabled } from "@/lib/apiClient";
import { mapApiOrderToAdmin, mapApiProductToAdminRow } from "@/lib/apiMappers";
import {
  eachDayInRange,
  formatDelta,
  formatRangeLabel,
  isDateInRange,
  percentChange,
  previousPeriodRange,
} from "@/lib/reports/dateRange";
import { formatShortDate } from "@/lib/reports/format";

const alertTones = {
  warning: {
    shell: "border-[#F5C2C0] bg-[#FFF5F5]",
    dot: "bg-[#F04438]",
    title: "text-[#B42318]",
    detail: "text-[#912018]",
    link: "text-[#B42318]",
  },
  info: {
    shell: "border-black/[0.08] bg-white",
    dot: "bg-[#6E6E73]",
    title: "text-[#1D1D1F]",
    detail: "text-[#6E6E73]",
    link: "text-[#424245]",
  },
  success: {
    shell: "border-[#A6D5B0] bg-[#EAF6ED]",
    dot: "bg-[#17B26A]",
    title: "text-[#2D6B3C]",
    detail: "text-[#067647]",
    link: "text-[#067647]",
  },
} as const;

function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="ez-mono text-[10px] font-medium uppercase tracking-[0.1em] text-[#6E6E73] transition hover:text-[var(--ez-accent-text)]"
    >
      {children}
    </Link>
  );
}

export default function AdminDashboardPage() {
  const store = useAdminStore();
  const apiOn = isApiEnabled();
  const [apiOrders, setApiOrders] = useState<AdminOrder[]>([]);
  const [apiProducts, setApiProducts] = useState<AdminCatalogRow[]>([]);
  const [dashError, setDashError] = useState<string | null>(null);
  const apiSettings = useApiSettings();

  const loadData = useCallback(async () => {
    if (!apiOn) return;
    const perPage = 100;
    try {
      setDashError(null);
      const firstO = await api.adminOrders({ page: 1, per_page: perPage });
      let allO = Array.isArray(firstO.data) ? firstO.data : [];
      const lastO = Number(firstO.last_page ?? 1);
      for (let p = 2; p <= lastO; p += 1) {
        const res = await api.adminOrders({ page: p, per_page: perPage });
        if (Array.isArray(res.data)) allO = allO.concat(res.data);
      }
      setApiOrders(allO.map((raw) => mapApiOrderToAdmin(raw)));

      const firstP = await api.adminProducts({ page: 1, per_page: perPage });
      let allP = Array.isArray(firstP.data) ? firstP.data : [];
      const lastP = Number(firstP.last_page ?? 1);
      for (let p = 2; p <= lastP; p += 1) {
        const res = await api.adminProducts({ page: p, per_page: perPage });
        if (Array.isArray(res.data)) allP = allP.concat(res.data);
      }
      setApiProducts(allP.map((row, i) => mapApiProductToAdminRow(row, i)));
    } catch (err) {
      setDashError(
        err instanceof Error
          ? `Could not load live dashboard data: ${err.message}`
          : "Could not load live dashboard data",
      );
    }
  }, [apiOn]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const orders = apiOn ? apiOrders : store.orders;
  const products = apiOn ? apiProducts : store.products;

  const filters = useReportFilters(orders, "7d");
  const alerts = getDerivedAlerts(apiOn ? { ...store, orders, products } : store);

  const periodOrders = useMemo(
    () =>
      orders.filter(
        (order) => order.status !== "cancelled" && isDateInRange(order.placedAt, filters.range),
      ),
    [orders, filters.range],
  );

  const priorRange = useMemo(() => previousPeriodRange(filters.range), [filters.range]);
  const priorOrders = useMemo(
    () =>
      orders.filter(
        (order) => order.status !== "cancelled" && isDateInRange(order.placedAt, priorRange),
      ),
    [orders, priorRange],
  );

  const series = useMemo(() => {
    const days = eachDayInRange(filters.range.start, filters.range.end);
    return days.map((date) => {
      const dayOrders = periodOrders.filter((order) => order.placedAt.slice(0, 10) === date);
      return {
        date,
        booked: dayOrders.reduce((sum, order) => sum + parsePrice(order.total), 0),
        orders: dayOrders.length,
      };
    });
  }, [periodOrders, filters.range]);

  const bookedSales = periodOrders.reduce((sum, order) => sum + parsePrice(order.total), 0);
  const priorBooked = priorOrders.reduce((sum, order) => sum + parsePrice(order.total), 0);
  const aov = periodOrders.length ? Math.round(bookedSales / periodOrders.length) : 0;

  const openStatuses = ["pending", "confirmed", "packed", "shipped", "preorder"] as const;
  const openOrders = orders.filter((order) =>
    openStatuses.includes(order.status as (typeof openStatuses)[number]),
  );
  const pendingCod = orders.filter(
    (order) => order.payment === "COD" && order.status === "pending",
  ).length;
  const customerCount = apiOn
    ? new Set(orders.map((o) => o.customerMobile).filter(Boolean)).size
    : store.customers.length;
  const threshold =
    (apiOn ? apiSettings.settings.lowStockThreshold : store.settings.lowStockThreshold) ?? 5;
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= threshold).length;
  const lowStock = products
    .filter((p) => p.stock > 0 && p.stock <= threshold)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 6);
  const recent = [...orders]
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
    .slice(0, 6);

  return (
    <div className="space-y-4 sm:space-y-5">
      <AdminPageHeader
        title="Dashboard"
        description="What needs attention today — COD, stock, and release holds."
        actions={
          <ReportDateFilter
            preset={filters.preset}
            onPresetChange={filters.setPreset}
            customStart={filters.customStart}
            customEnd={filters.customEnd}
            onCustomStart={filters.setCustomStart}
            onCustomEnd={filters.setCustomEnd}
            range={filters.range}
            presetOptions={filters.presetOptions}
          />
        }
      />

      {dashError ? <AdminNotice tone="error">{dashError}</AdminNotice> : null}

      <AdminPanel
        title="Needs attention"
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white px-2 py-0.5 ez-mono text-[8px] font-medium uppercase tracking-[0.12em] text-[#86868B]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--ez-accent)]" aria-hidden />
            Live ops
          </span>
        }
        flush
      >
        {alerts.length === 0 ? (
          <div className="flex items-center gap-3 px-3.5 py-3 sm:px-4">
            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF6ED] text-[#067647]"
              aria-hidden
            >
              ✓
            </span>
            <div>
              <p className="text-sm font-semibold tracking-[-0.02em] text-[#2D6B3C]">All clear</p>
              <p className="mt-0.5 text-xs text-[#067647]">
                No COD backlog, low stock, or release holds.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid divide-y divide-black/[0.05] sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
            {alerts.map((alert) => {
              const tone = alertTones[alert.tone];
              return (
                <div
                  key={alert.id}
                  className={`flex min-h-[88px] flex-col justify-between px-3.5 py-3 sm:px-4 ${tone.shell}`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tone.dot}`}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className={`text-sm font-semibold tracking-[-0.02em] ${tone.title}`}>
                        {alert.title}
                      </div>
                      <p className={`mt-0.5 text-xs leading-snug ${tone.detail}`}>{alert.detail}</p>
                    </div>
                  </div>
                  {alert.href ? (
                    <Link
                      href={alert.href}
                      className={`mt-2 inline-flex text-[11px] font-semibold ${tone.link} hover:underline hover:underline-offset-2`}
                    >
                      Open →
                    </Link>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </AdminPanel>

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Booked sales"
          value={formatInr(bookedSales)}
          detail={formatRangeLabel(filters.range)}
          tone="dark"
          delta={formatDelta(bookedSales, priorBooked)}
          deltaPositive={
            percentChange(bookedSales, priorBooked) === null
              ? null
              : (percentChange(bookedSales, priorBooked) ?? 0) >= 0
          }
        />
        <StatCard
          label="Orders in period"
          value={String(periodOrders.length)}
          detail={`AOV ${formatInr(aov)}`}
          delta={formatDelta(periodOrders.length, priorOrders.length)}
          deltaPositive={
            percentChange(periodOrders.length, priorOrders.length) === null
              ? null
              : (percentChange(periodOrders.length, priorOrders.length) ?? 0) >= 0
          }
        />
        <StatCard
          label="Open orders"
          value={String(openOrders.length).padStart(2, "0")}
          detail={
            pendingCod > 0
              ? `${pendingCod} COD pending · vs prior ${formatInr(priorBooked)}`
              : `Vs prior ${formatInr(priorBooked)} · ${customerCount} CRM`
          }
        />
        <StatCard
          label="Catalog pulse"
          value={String(products.length)}
          detail={`${lowStockCount} low stock SKUs`}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <AdminPanel
          title="Booked sales"
          action={
            <span className="ez-mono text-[9px] uppercase tracking-[0.12em] text-[#AEAEB2]">
              {formatRangeLabel(filters.range)}
            </span>
          }
        >
          <AdminChart
            values={series.map((d) => d.booked)}
            labels={series.map((d) => formatShortDate(d.date))}
            variant="bar"
            color="var(--ez-accent-text)"
            ariaLabel="Booked sales for selected period"
            formatValue={(v) => formatInr(v)}
          />
        </AdminPanel>

        <AdminPanel
          title="Orders"
          action={
            <span className="ez-mono text-[9px] uppercase tracking-[0.12em] text-[#AEAEB2]">
              Count
            </span>
          }
        >
          <AdminChart
            values={series.map((d) => d.orders)}
            labels={series.map((d) => formatShortDate(d.date))}
            variant="line"
            color="#424245"
            ariaLabel="Orders for selected period"
          />
        </AdminPanel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <AdminPanel
          title="Low stock"
          action={<PanelLink href="/admin/products">Inventory →</PanelLink>}
          flush
        >
          {lowStock.length === 0 ? (
            <AdminEmptyState compact title="No low stock SKUs." />
          ) : (
            <ul className="divide-y divide-black/[0.05]">
              {lowStock.map((row) => (
                <li key={row.key}>
                  <Link
                    href={`/admin/products/${encodeURIComponent(row.key)}/edit`}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 transition hover:bg-[#F7F7F8] sm:px-4"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium tracking-[-0.01em] text-[#1D1D1F]">
                        {row.name}
                      </div>
                      <div className="ez-mono mt-0.5 text-[10px] text-[#AEAEB2]">{row.sku}</div>
                    </div>
                    <StockBadge stock={row.stock} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>

        <AdminPanel
          title="Recent orders"
          action={<PanelLink href="/admin/orders">View all →</PanelLink>}
          flush
        >
          {recent.length === 0 ? (
            <AdminEmptyState compact title="No orders yet." />
          ) : (
            <ul className="divide-y divide-black/[0.05]">
              {recent.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 transition hover:bg-[#F7F7F8] sm:px-4"
                  >
                    <div className="min-w-0">
                      <div className="ez-mono text-[9px] uppercase tracking-[0.12em] text-[#86868B]">
                        {order.id}
                      </div>
                      <div className="mt-0.5 truncate text-sm font-semibold tracking-[-0.02em]">
                        {order.customerName}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-[#6E6E73]">
                        {order.city} · {order.items[0]?.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="ez-mono text-xs font-medium tabular-nums">{order.total}</span>
                      <StatusBadge kind="order" status={order.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>
      </div>
    </div>
  );
}

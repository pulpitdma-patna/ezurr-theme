"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminChart } from "@/components/admin/AdminChart";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
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
  warning: "border-[#F5C2C0] bg-[#FFF5F5] text-[#B42318]",
  info: "border-black/[0.08] bg-white text-[#1D1D1F]",
  success: "border-[#A6D5B0] bg-[#EAF6ED] text-[#2D6B3C]",
};

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
  // In API mode the low-stock threshold comes from the server-persisted
  // settings, not the local seed store.
  const threshold =
    (apiOn ? apiSettings.settings.lowStockThreshold : store.settings.lowStockThreshold) ?? 5;
  const lowStock = products
    .filter((p) => p.stock > 0 && p.stock <= threshold)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 6);
  const recent = [...orders]
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
    .slice(0, 6);

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        description="What needs attention today — COD, stock, and release holds."
        actions={
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
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
          </div>
        }
      />

      {dashError ? <AdminNotice tone="error">{dashError}</AdminNotice> : null}

      <section className="mb-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-[-0.02em]">Needs attention</h2>
          <span className="ez-mono text-[9px] uppercase tracking-[0.12em] text-[#AEAEB2]">
            Live ops
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {alerts.length === 0 ? (
            <div className="rounded-2xl border border-[#A6D5B0] bg-[#EAF6ED] px-4 py-3 text-sm text-[#2D6B3C] sm:col-span-2 xl:col-span-4">
              All clear — no COD backlog, low stock, or release holds.
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-2xl border px-4 py-3 shadow-[0_1px_2px_rgba(17,17,19,0.03)] ${alertTones[alert.tone]}`}
              >
                <div className="text-sm font-semibold tracking-[-0.02em]">{alert.title}</div>
                <p className="mt-0.5 text-xs opacity-80">{alert.detail}</p>
                {alert.href ? (
                  <Link
                    href={alert.href}
                    className="mt-2 inline-flex text-xs font-semibold underline-offset-2 hover:underline"
                  >
                    Open →
                  </Link>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Booked sales"
          value={formatInr(bookedSales)}
          detail={formatRangeLabel(filters.range)}
          tone="dark"
          delta={formatDelta(bookedSales, priorBooked)}
          deltaPositive={percentChange(bookedSales, priorBooked) === null ? null : (percentChange(bookedSales, priorBooked) ?? 0) >= 0}
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
          detail={`${products.filter((p) => p.stock > 0 && p.stock <= threshold).length} low stock SKUs`}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(17,17,19,0.03)]">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-[-0.02em]">Booked sales</h2>
            <span className="ez-mono text-[9px] uppercase tracking-[0.12em] text-[#AEAEB2]">
              {formatRangeLabel(filters.range)}
            </span>
          </div>
          <AdminChart
            values={series.map((d) => d.booked)}
            labels={series.map((d) => formatShortDate(d.date))}
            variant="bar"
            ariaLabel="Booked sales for selected period"
            formatValue={(v) => formatInr(v)}
          />
        </section>
        <section className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(17,17,19,0.03)]">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-[-0.02em]">Orders</h2>
            <span className="ez-mono text-[9px] uppercase tracking-[0.12em] text-[#AEAEB2]">
              Count
            </span>
          </div>
          <AdminChart
            values={series.map((d) => d.orders)}
            labels={series.map((d) => formatShortDate(d.date))}
            variant="line"
            color="#424245"
            ariaLabel="Orders for selected period"
          />
        </section>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-[-0.02em]">Low stock</h2>
            <Link href="/admin/products" className="text-xs font-semibold text-[#424245]">
              Inventory →
            </Link>
          </div>
          <ul className="divide-y divide-black/[0.05] overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(17,17,19,0.03)]">
            {lowStock.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-[#86868B]">No low stock SKUs.</li>
            ) : (
              lowStock.map((row) => (
                <li key={row.key}>
                  <Link
                    href={`/admin/products/${encodeURIComponent(row.key)}/edit`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[#F7F7F8]"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{row.name}</div>
                      <div className="ez-mono text-[10px] text-[#AEAEB2]">{row.sku}</div>
                    </div>
                    <StockBadge stock={row.stock} />
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-[-0.02em]">Recent orders</h2>
            <Link href="/admin/orders" className="text-xs font-semibold text-[#424245]">
              View all →
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(17,17,19,0.03)]">
            <ul className="divide-y divide-black/[0.05]">
              {recent.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 transition hover:bg-[#F7F7F8]"
                  >
                    <div className="min-w-0">
                      <div className="ez-mono text-[9px] uppercase tracking-[0.12em] text-[#86868B]">
                        {order.id}
                      </div>
                      <div className="mt-0.5 truncate text-sm font-semibold tracking-[-0.02em]">
                        {order.customerName}
                      </div>
                      <div className="mt-0.5 text-xs text-[#86868B]">
                        {order.city} · {order.items[0]?.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="ez-mono text-xs font-medium">{order.total}</span>
                      <StatusBadge kind="order" status={order.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

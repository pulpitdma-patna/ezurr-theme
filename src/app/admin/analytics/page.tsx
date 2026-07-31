"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminChart } from "@/components/admin/AdminChart";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import {
  api,
  isApiEnabled,
  type ApiReportSeriesPoint,
  type ApiReportSku,
  type ApiReportSummary,
} from "@/lib/apiClient";
import { ReportDateFilter } from "@/components/admin/reports/ReportDateFilter";
import { StatCard } from "@/components/admin/StatCard";
import { derivePlatformMix, deriveTopSkus, formatInr, parsePrice } from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useReportFilters } from "@/hooks/useReportFilters";
import {
  eachDayInRange,
  formatDelta,
  formatRangeLabel,
  isDateInRange,
  percentChange,
  previousPeriodRange,
} from "@/lib/reports/dateRange";

export default function AdminAnalyticsPage() {
  const apiOn = isApiEnabled();
  const store = useAdminStore();
  const filters = useReportFilters(store.orders, "7d");
  const priorRange = useMemo(() => previousPeriodRange(filters.range), [filters.range]);

  // The dates the owner actually picked, not just how many there are. Sending a
  // count made the server answer about the last N days ending today, so a range
  // in the past came back with today's numbers under yesterday's label.
  const window = useMemo(
    () => ({ from: filters.range.start, to: filters.range.end }),
    [filters.range],
  );

  // --- Live API data ---
  const [apiSummary, setApiSummary] = useState<ApiReportSummary | null>(null);
  const [apiSeries, setApiSeries] = useState<ApiReportSeriesPoint[]>([]);
  const [apiSkus, setApiSkus] = useState<ApiReportSku[]>([]);

  useEffect(() => {
    if (!apiOn) return;
    let cancelled = false;
    void Promise.all([api.reportSummary(window), api.reportSeries(window), api.reportTopSkus()])
      .then(([summary, series, skus]) => {
        if (cancelled) return;
        setApiSummary(summary);
        setApiSeries(series);
        setApiSkus(skus);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [apiOn, window]);

  // --- Mock fallback derivations ---
  const periodOrders = useMemo(
    () =>
      store.orders.filter(
        (order) => order.status !== "cancelled" && isDateInRange(order.placedAt, filters.range),
      ),
    [store.orders, filters.range],
  );
  const priorOrders = useMemo(
    () =>
      store.orders.filter(
        (order) => order.status !== "cancelled" && isDateInRange(order.placedAt, priorRange),
      ),
    [store.orders, priorRange],
  );

  const mockSeries = useMemo(
    () =>
      eachDayInRange(filters.range.start, filters.range.end).map((date) => {
        const dayOrders = periodOrders.filter((order) => order.placedAt.slice(0, 10) === date);
        return {
          date,
          revenue: dayOrders.reduce((sum, order) => sum + parsePrice(order.total), 0),
          orders: dayOrders.length,
        };
      }),
    [periodOrders, filters.range],
  );

  // --- Unified view ---
  const series = apiOn ? apiSeries : mockSeries;
  const revenue = apiOn ? apiSummary?.revenue ?? 0 : periodOrders.reduce((s, o) => s + parsePrice(o.total), 0);
  const priorRevenue = apiOn
    ? apiSummary?.prev_revenue ?? 0
    : priorOrders.reduce((s, o) => s + parsePrice(o.total), 0);
  const orders = apiOn ? apiSummary?.orders ?? 0 : periodOrders.length;
  const priorCount = apiOn ? 0 : priorOrders.length;
  const aov = apiOn ? apiSummary?.aov ?? 0 : orders ? Math.round(revenue / orders) : 0;

  const topSkus = apiOn
    ? apiSkus.map((s) => ({ sku: s.product_key, name: s.product_key, revenue: s.revenue, qty: s.qty }))
    : deriveTopSkus(periodOrders, store.products, 6);
  const platformMix = useMemo(
    () => (apiOn ? [] : derivePlatformMix(periodOrders, store.products).slice(0, 8)),
    [apiOn, periodOrders, store.products],
  );

  return (
    <div>
      {!apiOn ? (
        <AdminNotice tone="demo">
          Analytics shows local demo data — enable the store API for your live order book.
        </AdminNotice>
      ) : null}
      <AdminPageHeader
        title="Analytics"
        description="Booked sales overview from your order book — for deeper cuts open Reports."
        actions={
          <div className="flex flex-wrap items-center gap-2">
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
            <Link
              href="/admin/reports/sales"
              className="inline-flex h-9 items-center rounded-xl bg-[#1D1D1F] px-3 text-xs font-semibold text-white"
            >
              Open sales report
            </Link>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Booked sales"
          value={formatInr(revenue)}
          detail={formatRangeLabel(filters.range)}
          tone="dark"
          delta={formatDelta(revenue, priorRevenue)}
          deltaPositive={
            percentChange(revenue, priorRevenue) === null
              ? null
              : (percentChange(revenue, priorRevenue) ?? 0) >= 0
          }
        />
        <StatCard
          label="Orders"
          value={String(orders)}
          detail="Non-cancelled"
          delta={apiOn ? undefined : formatDelta(orders, priorCount)}
          deltaPositive={
            apiOn || percentChange(orders, priorCount) === null
              ? null
              : (percentChange(orders, priorCount) ?? 0) >= 0
          }
        />
        <StatCard label="AOV" value={formatInr(aov)} detail="Average order value" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-black/[0.08] bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">Booked sales by day</h2>
          <AdminChart
            values={series.map((d) => d.revenue)}
            labels={series.map((d) => d.date.slice(5))}
            variant="bar"
            ariaLabel="Booked sales by day"
            formatValue={(v) => formatInr(v)}
          />
        </section>
        <section className="rounded-lg border border-black/[0.08] bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">Orders by day</h2>
          <AdminChart
            values={series.map((d) => d.orders)}
            labels={series.map((d) => d.date.slice(5))}
            variant="line"
            color="#424245"
            ariaLabel="Orders by day"
          />
        </section>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-black/[0.08] bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">Top SKUs</h2>
          <ul className="divide-y divide-black/[0.05]">
            {topSkus.length === 0 ? (
              <li className="py-6 text-center text-sm text-[#86868B]">No order lines yet.</li>
            ) : (
              topSkus.map((row) => (
                <li key={row.sku} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{row.name}</div>
                    <div className="ez-mono text-[10px] text-[#86868B]">{row.sku}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="ez-mono text-xs font-semibold">{formatInr(row.revenue)}</div>
                    <div className="text-[11px] text-[#86868B]">{row.qty} units</div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
        {!apiOn ? (
          <section className="rounded-lg border border-black/[0.08] bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold">Platform mix</h2>
            {platformMix.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#86868B]">No platform data.</p>
            ) : (
              <AdminChart
                values={platformMix.map((row) => row.count)}
                labels={platformMix.map((row) => row.platform)}
                variant="bar"
                ariaLabel="Units by platform"
              />
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}

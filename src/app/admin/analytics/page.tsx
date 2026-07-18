"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AdminChart } from "@/components/admin/AdminChart";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
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
  const store = useAdminStore();
  const filters = useReportFilters(store.orders, "7d");
  const priorRange = useMemo(() => previousPeriodRange(filters.range), [filters.range]);

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

  const series = useMemo(() => {
    return eachDayInRange(filters.range.start, filters.range.end).map((date) => {
      const dayOrders = periodOrders.filter((order) => order.placedAt.slice(0, 10) === date);
      return {
        date,
        revenue: dayOrders.reduce((sum, order) => sum + parsePrice(order.total), 0),
        orders: dayOrders.length,
      };
    });
  }, [periodOrders, filters.range]);

  const revenue = periodOrders.reduce((s, o) => s + parsePrice(o.total), 0);
  const priorRevenue = priorOrders.reduce((s, o) => s + parsePrice(o.total), 0);
  const orders = periodOrders.length;
  const priorCount = priorOrders.length;
  const aov = orders ? Math.round(revenue / orders) : 0;

  const topSkus = useMemo(
    () => deriveTopSkus(periodOrders, store.products, 6),
    [periodOrders, store.products],
  );
  const platformMix = useMemo(
    () => derivePlatformMix(periodOrders, store.products).slice(0, 8),
    [periodOrders, store.products],
  );

  return (
    <div>
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
          delta={formatDelta(orders, priorCount)}
          deltaPositive={
            percentChange(orders, priorCount) === null
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
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ReportDateFilter } from "@/components/admin/reports/ReportDateFilter";
import { ReportView } from "@/components/admin/reports/ReportView";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useAutoBanner } from "@/hooks/useAutoBanner";
import { useReportFilters } from "@/hooks/useReportFilters";
import { useReportSavedViews } from "@/hooks/useReportSavedViews";
import { getReportMeta, isReportId } from "@/lib/reports/definitions";
import { deriveReport } from "@/lib/reports/derive";
import { downloadCsv, toCsv } from "@/lib/reports/exportCsv";
import {
  formatDelta,
  formatRangeLabel,
  percentChange,
  previousPeriodRange,
} from "@/lib/reports/dateRange";
import type { ReportId } from "@/lib/reports/types";
import { formatInr, parsePrice } from "@/data/admin";
import { StatCard } from "@/components/admin/StatCard";
import { api, isApiEnabled } from "@/lib/apiClient";

export default function AdminReportDetailPage() {
  const params = useParams<{ report: string }>();
  const reportParam = params.report;
  const valid = isReportId(reportParam);
  const reportId: ReportId = valid ? reportParam : "sales";

  const store = useAdminStore();
  const filters = useReportFilters(store.orders, "30d");
  const { views, saveView, removeView } = useReportSavedViews(valid ? reportId : undefined);
  const [toast, setToast] = useAutoBanner(2400);
  const [viewName, setViewName] = useState("");
  const apiOn = isApiEnabled();
  const [liveSummary, setLiveSummary] = useState<{
    revenue: number;
    orders: number;
    aov: number;
  } | null>(null);
  const [liveSeries, setLiveSeries] = useState<
    Array<{ date: string; revenue: number; orders: number }>
  >([]);
  const [liveSkus, setLiveSkus] = useState<
    Array<{ product_key: string; qty: number; revenue: number }>
  >([]);

  useEffect(() => {
    if (!apiOn) return;
    let cancelled = false;
    void Promise.all([api.reportSummary({ days: 30 }), api.reportSeries({ days: 30 }), api.reportTopSkus()])
      .then(([summary, series, skus]) => {
        if (cancelled) return;
        setLiveSummary({
          revenue: Number(summary.revenue ?? 0),
          orders: Number(summary.orders ?? 0),
          aov: Number(summary.aov ?? 0),
        });
        setLiveSeries(
          Array.isArray(series)
            ? series.map((r) => ({
                date: String(r.date),
                revenue: Number(r.revenue ?? 0),
                orders: Number(r.orders ?? 0),
              }))
            : [],
        );
        setLiveSkus(
          Array.isArray(skus)
            ? skus.map((r) => ({
                product_key: String(r.product_key),
                qty: Number(r.qty ?? 0),
                revenue: Number(r.revenue ?? 0),
              }))
            : [],
        );
      })
      .catch(() => {
        if (!cancelled) {
          setLiveSummary(null);
          setLiveSeries([]);
          setLiveSkus([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apiOn]);

  const meta = getReportMeta(reportId);
  // When the API is live, never derive the table from localStorage seed orders —
  // that painted demo sales under live KPI cards.
  const reportStore = useMemo(
    () =>
      apiOn
        ? {
            ...store,
            orders: [],
            products: [],
            customers: [],
            ledger: [],
          }
        : store,
    [apiOn, store],
  );
  const report = useMemo(
    () => deriveReport(reportStore, reportId, filters.range),
    [reportStore, reportId, filters.range],
  );
  const priorRange = useMemo(() => previousPeriodRange(filters.range), [filters.range]);
  const priorReport = useMemo(
    () => deriveReport(reportStore, reportId, priorRange),
    [reportStore, reportId, priorRange],
  );

  if (!valid) notFound();

  const compareKpis = report.kpis.slice(0, 2).map((kpi, index) => {
    const prior = priorReport.kpis[index];
    const currentNum = Number(String(kpi.value).replace(/[^\d.-]/g, "")) || 0;
    const priorNum = prior
      ? Number(String(prior.value).replace(/[^\d.-]/g, "")) || 0
      : 0;
    // Prefer parsing INR-looking values via parsePrice when ₹ present
    const current =
      String(kpi.value).includes("₹") || String(kpi.value).includes(",")
        ? parsePrice(String(kpi.value))
        : currentNum;
    const previous =
      prior && (String(prior.value).includes("₹") || String(prior.value).includes(","))
        ? parsePrice(String(prior.value))
        : priorNum;
    const pct = percentChange(current, previous);
    return {
      label: kpi.label,
      value: kpi.value,
      prior: prior?.value ?? "—",
      delta: formatDelta(current, previous),
      positive: pct === null ? null : pct >= 0,
    };
  });

  function exportCsv() {
    if (apiOn && liveSeries.length) {
      downloadCsv(
        `ezurr-live-${report.id}.csv`,
        toCsv(
          ["date", "revenue", "orders"],
          liveSeries.map((r) => [r.date, String(r.revenue), String(r.orders)]),
        ),
      );
      setToast("CSV exported from live series");
      return;
    }
    const headers = report.columns.map((column) => column.header);
    const rows = report.rows.map((row) =>
      report.columns.map((column) => row[column.key] ?? ""),
    );
    downloadCsv(
      `ezurr-${report.id}-${filters.range.start}_${filters.range.end}.csv`,
      toCsv(headers, rows),
    );
    setToast("CSV exported");
  }

  function handleSaveView() {
    const name = viewName.trim() || `${meta.title} view`;
    saveView({
      name,
      reportId,
      preset: filters.preset,
      customStart: filters.customStart,
      customEnd: filters.customEnd,
    });
    setViewName("");
    setToast("View saved");
  }

  return (
    <div>
      {apiOn ? (
        <AdminNotice tone="info">
          Live KPIs and top SKUs come from the API. Detailed report tables are
          empty until each report type is fully wired to live data.
        </AdminNotice>
      ) : null}
      {apiOn && liveSummary ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Revenue · 30d" value={formatInr(liveSummary.revenue)} />
          <StatCard label="Orders · 30d" value={String(liveSummary.orders)} />
          <StatCard label="AOV · 30d" value={formatInr(liveSummary.aov)} />
        </div>
      ) : null}
      {apiOn && liveSkus.length ? (
        <div className="mb-4 rounded-2xl border border-black/[0.06] bg-white p-4">
          <h2 className="text-sm font-semibold">Top SKUs (live)</h2>
          <ul className="mt-2 divide-y divide-black/[0.05] text-sm">
            {liveSkus.map((sku) => (
              <li key={sku.product_key} className="flex justify-between py-2">
                <span>{sku.product_key}</span>
                <span className="ez-mono text-[#6E6E73]">
                  {sku.qty} · {formatInr(sku.revenue)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <AdminPageHeader
        title={meta.title}
        description={meta.description}
        breadcrumbs={[
          { label: "Reports", href: "/admin/reports" },
          { label: meta.title },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/reports"
              className="inline-flex h-9 items-center rounded-lg border border-black/[0.1] bg-[#F7F7F8] px-3 text-xs font-semibold text-[#1D1D1F]"
            >
              All reports
            </Link>
          </div>
        }
      />

      <div className="mb-4 sticky top-14 z-20 -mx-0 flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-white/95 p-3 shadow-[0_1px_2px_rgba(17,17,19,0.03)] backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
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
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            placeholder="Save view name"
            className="h-9 rounded-lg border border-black/[0.08] bg-[#F7F7F8] px-3 text-xs outline-none focus:bg-white"
          />
          <button
            type="button"
            onClick={handleSaveView}
            className="h-9 rounded-lg bg-[#1D1D1F] px-3 text-xs font-semibold text-white"
          >
            Save view
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="h-9 rounded-lg border border-black/[0.1] bg-white px-3 text-xs font-semibold text-[#1D1D1F]"
          >
            Export CSV
          </button>
        </div>
      </div>

      {views.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {views.map((view) => (
            <button
              key={view.id}
              type="button"
              onClick={() => {
                filters.setPreset(view.preset);
                if (view.customStart) filters.setCustomStart(view.customStart);
                if (view.customEnd) filters.setCustomEnd(view.customEnd);
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                removeView(view.id);
                setToast("View removed");
              }}
              className="rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#424245] hover:text-[#1D1D1F]"
              title="Click to apply · right-click to remove"
            >
              {view.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        {compareKpis.map((kpi) => (
          <StatCard
            key={kpi.label}
            label={`${kpi.label} · vs prior`}
            value={kpi.value}
            detail={`Prior (${formatRangeLabel(priorRange)}): ${kpi.prior}`}
            delta={kpi.delta}
            deltaPositive={kpi.positive}
          />
        ))}
      </div>

      <ReportView
        key={`${report.id}-${filters.range.start}-${filters.range.end}`}
        report={report}
      />
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { GstReturnPanel } from "@/components/admin/GstReturnPanel";
import { StatCard } from "@/components/admin/StatCard";
import { formatInr } from "@/data/admin";
import { api, isApiEnabled } from "@/lib/apiClient";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useReportFilters } from "@/hooks/useReportFilters";
import { REPORT_DEFINITIONS } from "@/lib/reports/definitions";
import { formatRangeLabel, latestOrderAnchor } from "@/lib/reports/dateRange";

export default function AdminReportsHubPage() {
  const store = useAdminStore();
  const apiOn = isApiEnabled();
  const filterOrders = apiOn ? [] : store.orders;
  const { range } = useReportFilters(filterOrders, "30d");
  const anchor = apiOn ? "live" : latestOrderAnchor(store.orders);
  const [summary, setSummary] = useState<{
    revenue: number;
    orders: number;
    aov: number;
    revenue_delta_pct: number | null;
  } | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiOn) return;
    let cancelled = false;
    void api
      .reportSummary({ days: 30 })
      .then((s) => {
        if (!cancelled) {
          setSummary({
            revenue: Number(s.revenue ?? 0),
            orders: Number(s.orders ?? 0),
            aov: Number(s.aov ?? 0),
            revenue_delta_pct:
              s.revenue_delta_pct == null ? null : Number(s.revenue_delta_pct),
          });
          setLiveError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setLiveError(err.message || "Could not load live summary");
      });
    return () => {
      cancelled = true;
    };
  }, [apiOn]);

  return (
    <div>
      {apiOn ? (
        <AdminNotice tone="info">
          Headline KPIs load from the live API. Detail report layouts below still
          use the shared report shells — export from a detail page uses live series
          when available.
        </AdminNotice>
      ) : null}
      <AdminPageHeader
        title="Reports"
        description={
          apiOn
            ? "Live store reporting from the API."
            : "Derived from your local admin store — booked sales, ops queues, and honest data gaps."
        }
        actions={
          <span className="rounded-lg border border-black/[0.08] bg-white px-3 py-2 ez-mono text-[10px] text-[#6E6E73]">
            Default · {formatRangeLabel(range)} · anchor {anchor}
          </span>
        }
      />

      {/* The one job on this screen with a legal deadline, and the one the admin
          could not do at all: every figure existed per order and nothing summed
          them. */}
      <div className="mb-4">
        <GstReturnPanel />
      </div>

      {apiOn && liveError ? (
        <p className="mb-4 text-sm text-[#B42318]" role="alert">
          {liveError}
        </p>
      ) : null}

      {apiOn && summary ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <StatCard label="Revenue · 30d" value={formatInr(summary.revenue)} />
          <StatCard label="Orders · 30d" value={String(summary.orders)} />
          <StatCard
            label="AOV · 30d"
            value={`${formatInr(summary.aov)}${
              summary.revenue_delta_pct != null
                ? ` · ${summary.revenue_delta_pct > 0 ? "+" : ""}${summary.revenue_delta_pct}%`
                : ""
            }`}
          />
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {REPORT_DEFINITIONS.map((report) => (
          <Link
            key={report.id}
            href={report.href}
            className="group flex min-h-[160px] flex-col rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(17,17,19,0.03)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(17,17,19,0.08)]"
          >
            <div className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#AEAEB2]">
              {report.id}
            </div>
            <h2 className="mt-2 text-sm font-semibold tracking-[-0.02em] text-[#1D1D1F]">
              {report.title}
            </h2>
            <p className="mt-1.5 flex-1 text-xs leading-relaxed text-[#6E6E73]">
              {report.description}
            </p>
            <span className="mt-4 text-xs font-semibold text-[#424245] group-hover:text-[#1D1D1F]">
              Open report →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

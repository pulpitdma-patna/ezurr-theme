"use client";

import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { isApiEnabled } from "@/lib/apiClient";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useReportFilters } from "@/hooks/useReportFilters";
import { REPORT_DEFINITIONS } from "@/lib/reports/definitions";
import { formatRangeLabel, latestOrderAnchor } from "@/lib/reports/dateRange";

export default function AdminReportsHubPage() {
  const store = useAdminStore();
  const { range } = useReportFilters(store.orders, "30d");
  const anchor = latestOrderAnchor(store.orders);

  return (
    <div>
      {isApiEnabled() ? (
        <AdminNotice tone="demo">
          Reports are derived from local demo data — not your live server data yet.
        </AdminNotice>
      ) : null}
      <AdminPageHeader
        title="Reports"
        description="Derived from your live admin store — booked sales, ops queues, and honest data gaps."
        actions={
          <span className="rounded-lg border border-black/[0.08] bg-white px-3 py-2 ez-mono text-[10px] text-[#6E6E73]">
            Default · {formatRangeLabel(range)} · anchor {anchor}
          </span>
        }
      />

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

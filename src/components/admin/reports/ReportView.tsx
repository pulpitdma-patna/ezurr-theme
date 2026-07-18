"use client";

import { useState } from "react";
import { AdminChart } from "@/components/admin/AdminChart";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { StatCard } from "@/components/admin/StatCard";
import { formatReportValue } from "@/lib/reports/format";
import type { ReportResult, ReportRow } from "@/lib/reports/types";

export function ReportView({ report }: { report: ReportResult }) {
  const [page, setPage] = useState(1);
  const columns: DataTableColumn<ReportRow>[] = report.columns.map((column) => ({
    key: column.key,
    header: column.header,
    render: (row) => (
      <span className={column.key === "id" || column.key === "sku" ? "ez-mono text-xs" : undefined}>
        {String(row[column.key] ?? "—")}
      </span>
    ),
  }));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {report.kpis.map((kpi) => (
          <StatCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            detail={kpi.detail}
            tone={kpi.tone}
          />
        ))}
      </div>

      {report.charts.length > 0 ? (
        <div className={`grid gap-4 ${report.charts.length > 1 ? "lg:grid-cols-2" : ""}`}>
          {report.charts.map((chart) => (
            <section
              key={chart.title}
              className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(17,17,19,0.03)]"
            >
              <h2 className="mb-3 text-sm font-semibold tracking-[-0.02em]">{chart.title}</h2>
              <AdminChart
                values={chart.values}
                labels={chart.labels}
                variant={chart.variant ?? "bar"}
                ariaLabel={chart.title}
                formatValue={(value) =>
                  formatReportValue(value, chart.format === "inr" ? "inr" : "number")
                }
              />
            </section>
          ))}
        </div>
      ) : null}

      <section className="rounded-2xl border border-dashed border-black/[0.1] bg-[#FAFAFB] px-4 py-3">
        <div className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">Data notes</div>
        <ul className="mt-2 space-y-1.5">
          {report.notes.map((note) => (
            <li key={note} className="text-xs leading-relaxed text-[#6E6E73]">
              {note}
            </li>
          ))}
        </ul>
      </section>

      <DataTable
        columns={columns}
        rows={report.rows}
        rowKey={(row) =>
          String(row.id ?? row.sku ?? row.code ?? row.name ?? row.date ?? JSON.stringify(row))
        }
        emptyMessage="No rows for this period."
        page={page}
        pageSize={25}
        onPageChange={setPage}
      />
    </div>
  );
}

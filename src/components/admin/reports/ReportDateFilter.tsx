"use client";

import { AdminSelect } from "@/components/admin/AdminSelect";
import { formatRangeLabel, type DatePreset } from "@/lib/reports/dateRange";
import type { DateRange } from "@/lib/reports/dateRange";

const fieldClass =
  "h-9 rounded-lg border border-black/[0.07] bg-white px-2.5 text-xs font-semibold text-[#1D1D1F] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

export function ReportDateFilter({
  preset,
  onPresetChange,
  customStart,
  customEnd,
  onCustomStart,
  onCustomEnd,
  range,
  presetOptions,
}: {
  preset: DatePreset;
  onPresetChange: (value: DatePreset) => void;
  customStart: string;
  customEnd: string;
  onCustomStart: (value: string) => void;
  onCustomEnd: (value: string) => void;
  range: DateRange;
  presetOptions: { value: DatePreset; label: string }[];
}) {
  return (
    <div className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-black/[0.07] bg-[#FAFAFB] p-1 shadow-[0_1px_2px_rgba(17,17,19,0.04)]">
      {/* "Period" is an accounting word. He picks dates. */}
      <AdminSelect
        label="Dates"
        value={preset}
        onChange={(value) => onPresetChange(value as DatePreset)}
        options={presetOptions.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        className="h-9 border-0 bg-transparent shadow-none"
      />

      {preset === "custom" ? (
        <>
          <span aria-hidden className="hidden h-5 w-px bg-black/[0.08] sm:block" />
          <input
            type="date"
            value={customStart}
            onChange={(e) => onCustomStart(e.target.value)}
            className={fieldClass}
            aria-label="Start date"
          />
          <span className="ez-mono text-[10px] text-[#AEAEB2]">—</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => onCustomEnd(e.target.value)}
            className={fieldClass}
            aria-label="End date"
          />
        </>
      ) : (
        <>
          <span aria-hidden className="hidden h-5 w-px bg-black/[0.08] sm:block" />
          <span className="px-2.5 py-1.5 ez-mono text-[10px] uppercase tracking-[0.12em] text-[#6E6E73] sm:px-3">
            {formatRangeLabel(range)}
          </span>
        </>
      )}
    </div>
  );
}

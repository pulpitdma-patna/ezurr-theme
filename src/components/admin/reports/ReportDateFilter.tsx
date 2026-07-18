"use client";

import { AdminSelect } from "@/components/admin/AdminSelect";
import { formatRangeLabel, type DatePreset } from "@/lib/reports/dateRange";
import type { DateRange } from "@/lib/reports/dateRange";

const fieldClass =
  "h-10 rounded-xl border border-black/[0.07] bg-white px-3 text-xs font-semibold text-[#1D1D1F] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

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
    <div className="flex flex-wrap items-center gap-2">
      <AdminSelect
        label="Period"
        value={preset}
        onChange={(value) => onPresetChange(value as DatePreset)}
        options={presetOptions.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
      />
      {preset === "custom" ? (
        <>
          <input
            type="date"
            value={customStart}
            onChange={(e) => onCustomStart(e.target.value)}
            className={fieldClass}
            aria-label="Start date"
          />
          <input
            type="date"
            value={customEnd}
            onChange={(e) => onCustomEnd(e.target.value)}
            className={fieldClass}
            aria-label="End date"
          />
        </>
      ) : (
        <span className="ez-mono text-[10px] uppercase tracking-[0.12em] text-[#86868B]">
          {formatRangeLabel(range)}
        </span>
      )}
    </div>
  );
}

import type { AdminOrder } from "@/data/admin";

export type DatePreset =
  | "today"
  | "7d"
  | "30d"
  | "this_month"
  | "last_month"
  | "custom";

export type DateRange = {
  preset: DatePreset;
  start: string;
  end: string;
};

export const DATE_PRESET_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "custom", label: "Custom" },
];

function toDateKey(value: Date) {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Latest order placement date in the store, falling back to today. */
export function latestOrderAnchor(orders: AdminOrder[], fallback = new Date()): string {
  let latest = "";
  for (const order of orders) {
    const key = order.placedAt.slice(0, 10);
    if (key > latest) latest = key;
  }
  return latest || toDateKey(fallback);
}

export function resolveDateRange(
  preset: DatePreset,
  anchorDate: string,
  custom?: { start?: string; end?: string },
): DateRange {
  const anchor = parseDateKey(anchorDate);

  if (preset === "custom") {
    const end = custom?.end || anchorDate;
    const start = custom?.start || end;
    return {
      preset,
      start: start <= end ? start : end,
      end: start <= end ? end : start,
    };
  }

  if (preset === "today") {
    return { preset, start: anchorDate, end: anchorDate };
  }

  if (preset === "7d") {
    const start = new Date(anchor);
    start.setDate(anchor.getDate() - 6);
    return { preset, start: toDateKey(start), end: anchorDate };
  }

  if (preset === "30d") {
    const start = new Date(anchor);
    start.setDate(anchor.getDate() - 29);
    return { preset, start: toDateKey(start), end: anchorDate };
  }

  if (preset === "this_month") {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    return { preset, start: toDateKey(start), end: anchorDate };
  }

  const firstThisMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const lastMonthEnd = new Date(firstThisMonth);
  lastMonthEnd.setDate(0);
  const lastMonthStart = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1);
  return {
    preset: "last_month",
    start: toDateKey(lastMonthStart),
    end: toDateKey(lastMonthEnd),
  };
}

export function eachDayInRange(start: string, end: string): string[] {
  const days: string[] = [];
  const cursor = parseDateKey(start);
  const last = parseDateKey(end);
  while (cursor <= last) {
    days.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function isDateInRange(isoOrDate: string, range: DateRange) {
  const key = isoOrDate.slice(0, 10);
  return key >= range.start && key <= range.end;
}

export function formatRangeLabel(range: DateRange) {
  const fmt = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const start = fmt.format(parseDateKey(range.start));
  const end = fmt.format(parseDateKey(range.end));
  return start === end ? start : `${start} – ${end}`;
}

/** Preceding window of the same length ending the day before `range.start`. */
export function previousPeriodRange(range: DateRange): DateRange {
  const start = parseDateKey(range.start);
  const end = parseDateKey(range.end);
  const days = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 86400000) + 1,
  );
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (days - 1));
  return {
    preset: "custom",
    start: toDateKey(prevStart),
    end: toDateKey(prevEnd),
  };
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export function formatDelta(current: number, previous: number): string {
  const pct = percentChange(current, previous);
  if (pct === null) return current > 0 ? "New vs prior" : "Flat vs prior";
  if (pct === 0) return "Flat vs prior";
  return `${pct > 0 ? "+" : ""}${pct}% vs prior`;
}

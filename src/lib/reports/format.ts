import { formatInr } from "@/data/admin";

export function formatReportValue(value: number, kind: "inr" | "number" = "number") {
  if (kind === "inr") return formatInr(Math.round(value));
  return value.toLocaleString("en-IN");
}

export function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${iso.slice(0, 10)}T12:00:00`));
}

export function formatPercent(part: number, whole: number) {
  if (!whole) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

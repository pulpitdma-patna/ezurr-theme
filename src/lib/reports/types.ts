import type { DateRange } from "@/lib/reports/dateRange";

export type ReportId =
  | "sales"
  | "orders"
  | "products"
  | "customers"
  | "inventory"
  | "digital"
  | "marketing"
  | "tax-gst";

export type ReportKpi = {
  label: string;
  value: string;
  detail?: string;
  tone?: "dark" | "light";
};

export type ReportChart = {
  title: string;
  values: number[];
  labels: string[];
  variant?: "bar" | "line";
  format?: "inr" | "number";
};

export type ReportColumn = {
  key: string;
  header: string;
};

export type ReportRow = Record<string, string | number>;

export type ReportResult = {
  id: ReportId;
  title: string;
  description: string;
  kpis: ReportKpi[];
  charts: ReportChart[];
  columns: ReportColumn[];
  rows: ReportRow[];
  notes: string[];
  range: DateRange;
};

export type ReportDefinitionMeta = {
  id: ReportId;
  title: string;
  description: string;
  href: string;
};

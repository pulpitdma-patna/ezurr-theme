import type { ReportDefinitionMeta, ReportId } from "@/lib/reports/types";

export const REPORT_IDS: ReportId[] = [
  "sales",
  "orders",
  "products",
  "customers",
  "inventory",
  "digital",
  "marketing",
  "tax-gst",
];

export const REPORT_DEFINITIONS: ReportDefinitionMeta[] = [
  {
    id: "sales",
    title: "Sales",
    description: "Booked sales by day, payment mix, and average order value.",
    href: "/admin/reports/sales",
  },
  {
    id: "orders",
    title: "Orders",
    description: "Volume, status mix, COD backlog, and fulfillment pace.",
    href: "/admin/reports/orders",
  },
  {
    id: "products",
    title: "Products",
    description: "Top SKUs, category mix, and contribution from the order book.",
    href: "/admin/reports/products",
  },
  {
    id: "customers",
    title: "Customers",
    description: "Repeat buyers, city mix, and spend concentration.",
    href: "/admin/reports/customers",
  },
  {
    id: "inventory",
    title: "Inventory",
    description: "On-hand stock, low-stock risk, and recent ledger movement.",
    href: "/admin/reports/inventory",
  },
  {
    id: "digital",
    title: "Digital codes",
    description: "Vault availability, assignments, and redemption readiness.",
    href: "/admin/reports/digital",
  },
  {
    id: "marketing",
    title: "Marketing / coupons",
    description: "Coupon usage and estimated discount exposure from active codes.",
    href: "/admin/reports/marketing",
  },
  {
    id: "tax-gst",
    title: "Tax / GST readiness",
    description: "GSTIN coverage and honest gaps before formal tax export.",
    href: "/admin/reports/tax-gst",
  },
];

export function isReportId(value: string): value is ReportId {
  return REPORT_IDS.includes(value as ReportId);
}

export function getReportMeta(id: ReportId) {
  return REPORT_DEFINITIONS.find((item) => item.id === id)!;
}

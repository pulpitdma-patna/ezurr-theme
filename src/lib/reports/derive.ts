import {
  formatInr,
  maskDigitalCode,
  orderStatusLabels,
  parsePrice,
  type AdminOrder,
  type AdminOrderStatus,
} from "@/data/admin";
import type { AdminStoreState } from "@/lib/adminStore";
import {
  eachDayInRange,
  isDateInRange,
  type DateRange,
} from "@/lib/reports/dateRange";
import { getReportMeta } from "@/lib/reports/definitions";
import { formatPercent, formatReportValue, formatShortDate } from "@/lib/reports/format";
import type { ReportId, ReportResult, ReportRow } from "@/lib/reports/types";

function bookedOrders(orders: AdminOrder[]) {
  return orders.filter((order) => order.status !== "cancelled");
}

function ordersInRange(orders: AdminOrder[], range: DateRange) {
  return bookedOrders(orders).filter((order) => isDateInRange(order.placedAt, range));
}

function dailySeries(orders: AdminOrder[], range: DateRange) {
  const days = eachDayInRange(range.start, range.end);
  return days.map((date) => {
    const dayOrders = orders.filter((order) => order.placedAt.slice(0, 10) === date);
    return {
      date,
      orders: dayOrders.length,
      booked: dayOrders.reduce((sum, order) => sum + parsePrice(order.total), 0),
    };
  });
}

function deriveSales(store: AdminStoreState, range: DateRange): ReportResult {
  const rows = ordersInRange(store.orders, range);
  const series = dailySeries(rows, range);
  const booked = rows.reduce((sum, order) => sum + parsePrice(order.total), 0);
  const prepaid = rows.filter((order) => order.payment === "Prepaid");
  const cod = rows.filter((order) => order.payment === "COD");
  const aov = rows.length ? Math.round(booked / rows.length) : 0;

  return {
    id: "sales",
    title: "Sales",
    description: "Booked sales from non-cancelled orders in the selected period.",
    range,
    kpis: [
      { label: "Booked sales", value: formatInr(booked), detail: "Order totals · not collected cash", tone: "dark" },
      { label: "Orders", value: String(rows.length), detail: "Non-cancelled" },
      { label: "AOV", value: formatInr(aov), detail: "Average booked order" },
      { label: "Prepaid share", value: formatPercent(prepaid.length, rows.length), detail: `${cod.length} COD` },
    ],
    charts: [
      {
        title: "Booked sales by day",
        values: series.map((d) => d.booked),
        labels: series.map((d) => formatShortDate(d.date)),
        variant: "bar",
        format: "inr",
      },
      {
        title: "Orders by day",
        values: series.map((d) => d.orders),
        labels: series.map((d) => formatShortDate(d.date)),
        variant: "line",
        format: "number",
      },
    ],
    columns: [
      { key: "date", header: "Date" },
      { key: "orders", header: "Orders" },
      { key: "booked", header: "Booked sales" },
    ],
    rows: series.map((d) => ({
      date: d.date,
      orders: d.orders,
      booked: formatInr(d.booked),
    })),
    notes: [
      "Booked sales uses order totals. Cash collection is not modeled as settlement.",
      "Cancelled orders are excluded. Attribution / campaign source is not available in this store.",
    ],
  };
}

function deriveOrders(store: AdminStoreState, range: DateRange): ReportResult {
  const period = store.orders.filter((order) => isDateInRange(order.placedAt, range));
  const booked = period.filter((order) => order.status !== "cancelled");
  const byStatus = new Map<AdminOrderStatus, number>();
  for (const order of period) {
    byStatus.set(order.status, (byStatus.get(order.status) ?? 0) + 1);
  }
  const statusRows = [...byStatus.entries()]
    .map(([status, count]) => ({ status: orderStatusLabels[status], count }))
    .sort((a, b) => b.count - a.count);
  const pendingCod = store.orders.filter(
    (order) => order.payment === "COD" && order.status === "pending",
  ).length;
  const holds = store.orders.filter((order) => order.status === "preorder").length;

  return {
    id: "orders",
    title: "Orders",
    description: "Order volume and status mix for the selected period.",
    range,
    kpis: [
      { label: "Orders placed", value: String(period.length), tone: "dark" },
      { label: "Booked", value: String(booked.length), detail: "Excludes cancelled" },
      { label: "COD pending", value: String(pendingCod), detail: "Ops queue · live" },
      { label: "Release holds", value: String(holds), detail: "Live pre-order holds" },
    ],
    charts: [
      {
        title: "Status mix",
        values: statusRows.map((row) => row.count),
        labels: statusRows.map((row) => row.status),
        variant: "bar",
        format: "number",
      },
    ],
    columns: [
      { key: "id", header: "Order" },
      { key: "customer", header: "Customer" },
      { key: "status", header: "Status" },
      { key: "payment", header: "Payment" },
      { key: "total", header: "Total" },
      { key: "placedAt", header: "Placed" },
    ],
    rows: [...period]
      .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
      .map((order) => ({
        id: order.id,
        customer: order.customerName,
        status: orderStatusLabels[order.status],
        payment: order.payment,
        total: order.total,
        placedAt: order.placedAt.slice(0, 10),
      })),
    notes: [
      "COD pending and release holds are live ops counts, not limited to the date filter.",
      "No carrier SLA or delivery-time attribution is stored yet.",
    ],
  };
}

function deriveProducts(store: AdminStoreState, range: DateRange): ReportResult {
  const rows = ordersInRange(store.orders, range);
  const byKey = new Map(store.products.map((p) => [p.key, p]));
  const tallies = new Map<
    string,
    { name: string; sku: string; category: string; qty: number; revenue: number }
  >();
  for (const order of rows) {
    for (const item of order.items) {
      const product = byKey.get(item.productKey);
      const prev = tallies.get(item.productKey) ?? {
        name: item.name,
        sku: item.sku || product?.sku || item.productKey,
        category: product?.category ?? "—",
        qty: 0,
        revenue: 0,
      };
      prev.qty += item.qty;
      prev.revenue += parsePrice(item.price) * item.qty;
      tallies.set(item.productKey, prev);
    }
  }
  const ranked = [...tallies.values()].sort((a, b) => b.revenue - a.revenue);
  const top = ranked.slice(0, 12);

  return {
    id: "products",
    title: "Products",
    description: "SKU contribution from booked order lines in the period.",
    range,
    kpis: [
      { label: "SKUs sold", value: String(ranked.length), tone: "dark" },
      {
        label: "Units",
        value: formatReportValue(ranked.reduce((s, r) => s + r.qty, 0)),
      },
      {
        label: "Line booked",
        value: formatInr(ranked.reduce((s, r) => s + r.revenue, 0)),
        detail: "From order lines",
      },
      {
        label: "Top SKU share",
        value: formatPercent(top[0]?.revenue ?? 0, ranked.reduce((s, r) => s + r.revenue, 0)),
        detail: top[0]?.name,
      },
    ],
    charts: [
      {
        title: "Top SKUs by booked line value",
        values: top.slice(0, 8).map((row) => row.revenue),
        labels: top.slice(0, 8).map((row) => row.sku),
        variant: "bar",
        format: "inr",
      },
    ],
    columns: [
      { key: "name", header: "Product" },
      { key: "sku", header: "SKU" },
      { key: "category", header: "Category" },
      { key: "qty", header: "Qty" },
      { key: "revenue", header: "Booked" },
    ],
    rows: ranked.map((row) => ({
      name: row.name,
      sku: row.sku,
      category: row.category,
      qty: row.qty,
      revenue: formatInr(row.revenue),
    })),
    notes: ["Line booked sums item prices × qty. Basket-level discounts are not modeled."],
  };
}

function deriveCustomers(store: AdminStoreState, range: DateRange): ReportResult {
  const rows = ordersInRange(store.orders, range);
  const byCustomer = new Map<string, { name: string; city: string; orders: number; spent: number }>();
  for (const order of rows) {
    const key = order.customerId || order.customerMobile;
    const prev = byCustomer.get(key) ?? {
      name: order.customerName,
      city: order.city,
      orders: 0,
      spent: 0,
    };
    prev.orders += 1;
    prev.spent += parsePrice(order.total);
    byCustomer.set(key, prev);
  }
  const ranked = [...byCustomer.values()].sort((a, b) => b.spent - a.spent);
  const repeat = ranked.filter((row) => row.orders > 1).length;

  return {
    id: "customers",
    title: "Customers",
    description: "Buyers with booked orders in the selected period.",
    range,
    kpis: [
      { label: "Buyers", value: String(ranked.length), tone: "dark" },
      { label: "Repeat buyers", value: String(repeat), detail: "2+ orders in period" },
      {
        label: "Booked sales",
        value: formatInr(ranked.reduce((s, r) => s + r.spent, 0)),
      },
      {
        label: "CRM profiles",
        value: String(store.customers.length),
        detail: "Live customer book",
      },
    ],
    charts: [
      {
        title: "Top buyers by booked sales",
        values: ranked.slice(0, 8).map((row) => row.spent),
        labels: ranked.slice(0, 8).map((row) => row.name.split(" ")[0] ?? row.name),
        variant: "bar",
        format: "inr",
      },
    ],
    columns: [
      { key: "name", header: "Customer" },
      { key: "city", header: "City" },
      { key: "orders", header: "Orders" },
      { key: "spent", header: "Booked" },
    ],
    rows: ranked.map((row) => ({
      name: row.name,
      city: row.city,
      orders: row.orders,
      spent: formatInr(row.spent),
    })),
    notes: [
      "Acquisition channel / UTM attribution is not stored.",
      "CRM profile count is live and not limited to the date filter.",
    ],
  };
}

function deriveInventory(store: AdminStoreState, range: DateRange): ReportResult {
  const threshold = store.settings.lowStockThreshold ?? 5;
  const low = store.products.filter((p) => p.stock > 0 && p.stock <= threshold);
  const out = store.products.filter((p) => p.stock <= 0);
  const ledger = store.ledger.filter((entry) => isDateInRange(entry.at, range));
  const units = store.products.reduce((sum, p) => sum + p.stock, 0);

  return {
    id: "inventory",
    title: "Inventory",
    description: "On-hand stock risk and ledger activity in the period.",
    range,
    kpis: [
      { label: "Units on hand", value: formatReportValue(units), tone: "dark" },
      { label: "Low stock", value: String(low.length), detail: `≤ ${threshold}` },
      { label: "Sold out", value: String(out.length) },
      { label: "Ledger events", value: String(ledger.length), detail: "In range" },
    ],
    charts: [
      {
        title: "Lowest stock SKUs",
        values: [...store.products]
          .sort((a, b) => a.stock - b.stock)
          .slice(0, 8)
          .map((p) => p.stock),
        labels: [...store.products]
          .sort((a, b) => a.stock - b.stock)
          .slice(0, 8)
          .map((p) => p.sku),
        variant: "bar",
        format: "number",
      },
    ],
    columns: [
      { key: "sku", header: "SKU" },
      { key: "name", header: "Product" },
      { key: "stock", header: "Stock" },
      { key: "status", header: "Status" },
    ],
    rows: [...store.products]
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 40)
      .map((p) => ({
        sku: p.sku,
        name: p.name,
        stock: p.stock,
        status: p.status,
      })),
    notes: [
      "Stock levels are live snapshots. Ledger events respect the date range.",
      "Cost / valuation is not modeled.",
    ],
  };
}

function deriveDigital(store: AdminStoreState, range: DateRange, maskCodes = true): ReportResult {
  const codes = store.digitalCodes;
  const available = codes.filter((c) => c.status === "available").length;
  const assigned = codes.filter((c) => c.status === "assigned").length;
  const redeemed = codes.filter((c) => c.status === "redeemed").length;
  const redeemedInRange = codes.filter(
    (c) => c.redeemedAt && isDateInRange(c.redeemedAt, range),
  ).length;

  return {
    id: "digital",
    title: "Digital codes",
    description: "Vault health and period redemptions. Codes masked by default on export.",
    range,
    kpis: [
      { label: "Available", value: String(available), tone: "dark" },
      { label: "Assigned", value: String(assigned) },
      { label: "Redeemed", value: String(redeemed) },
      { label: "Redeemed in range", value: String(redeemedInRange) },
    ],
    charts: [
      {
        title: "Vault status",
        values: [available, assigned, redeemed],
        labels: ["Available", "Assigned", "Redeemed"],
        variant: "bar",
        format: "number",
      },
    ],
    columns: [
      { key: "code", header: "Code" },
      { key: "product", header: "Product" },
      { key: "status", header: "Status" },
      { key: "assignedTo", header: "Assigned" },
    ],
    rows: codes.map((code) => ({
      code: maskCodes ? maskDigitalCode(code.code) : code.code,
      product: code.productName,
      status: code.status,
      assignedTo: code.assignedTo ?? "—",
    })),
    notes: [
      "CSV export masks codes by default.",
      "Platform provider settlement is not linked in this demo store.",
    ],
  };
}

function deriveMarketing(store: AdminStoreState, range: DateRange): ReportResult {
  const coupons = store.coupons;
  const active = coupons.filter((c) => c.active).length;
  const uses = coupons.reduce((sum, c) => sum + c.uses, 0);
  // Coupon application on orders is not stored — report coupon book honestly.
  void range;

  return {
    id: "marketing",
    title: "Marketing / coupons",
    description: "Coupon book health. Order-level coupon attribution is not stored yet.",
    range,
    kpis: [
      { label: "Coupons", value: String(coupons.length), tone: "dark" },
      { label: "Active", value: String(active) },
      { label: "Recorded uses", value: formatReportValue(uses), detail: "From coupon book" },
      {
        label: "Avg % off",
        value: coupons.length
          ? `${Math.round(coupons.reduce((s, c) => s + c.percentOff, 0) / coupons.length)}%`
          : "0%",
      },
    ],
    charts: [
      {
        title: "Uses by coupon",
        values: coupons.map((c) => c.uses),
        labels: coupons.map((c) => c.code),
        variant: "bar",
        format: "number",
      },
    ],
    columns: [
      { key: "code", header: "Code" },
      { key: "percentOff", header: "% off" },
      { key: "uses", header: "Uses" },
      { key: "maxUses", header: "Max" },
      { key: "active", header: "Active" },
    ],
    rows: coupons.map((c) => ({
      code: c.code,
      percentOff: c.percentOff,
      uses: c.uses,
      maxUses: c.maxUses,
      active: c.active ? "Yes" : "No",
    })),
    notes: [
      "Orders do not store which coupon was applied, so period sales attribution is unavailable.",
      "Uses come from the coupon ledger counters, not from reconstructed order discounts.",
    ],
  };
}

function deriveTax(store: AdminStoreState, range: DateRange): ReportResult {
  const rows = ordersInRange(store.orders, range);
  const booked = rows.reduce((sum, order) => sum + parsePrice(order.total), 0);
  const gstin = store.settings.gstin?.trim() ?? "";

  return {
    id: "tax-gst",
    title: "Tax / GST readiness",
    description: "Honest readiness check — tax lines are not stored on orders yet.",
    range,
    kpis: [
      { label: "Booked sales", value: formatInr(booked), tone: "dark", detail: "Gross order totals" },
      { label: "GSTIN", value: gstin ? "Set" : "Missing", detail: gstin || "Add in Settings" },
      { label: "Taxable lines", value: "Not modeled", detail: "No CGST/SGST fields" },
      { label: "Export ready", value: gstin ? "Partial" : "Blocked", detail: "Needs tax breakdown" },
    ],
    charts: [
      {
        title: "Booked sales by day (gross)",
        values: dailySeries(rows, range).map((d) => d.booked),
        labels: dailySeries(rows, range).map((d) => formatShortDate(d.date)),
        variant: "line",
        format: "inr",
      },
    ],
    columns: [
      { key: "id", header: "Order" },
      { key: "total", header: "Gross total" },
      { key: "payment", header: "Payment" },
      { key: "placedAt", header: "Placed" },
      { key: "tax", header: "Tax" },
    ],
    rows: rows.map((order) => ({
      id: order.id,
      total: order.total,
      payment: order.payment,
      placedAt: order.placedAt.slice(0, 10),
      tax: "Not stored",
    })),
    notes: [
      "Order totals are treated as gross booked sales. Tax split is not available.",
      "HSN, place of supply, and invoice series are not modeled in this admin store.",
      gstin
        ? "GSTIN is present in settings — still insufficient for a formal GST export."
        : "Set a GSTIN in Settings before attempting accounting export.",
    ],
  };
}

export function deriveReport(
  store: AdminStoreState,
  id: ReportId,
  range: DateRange,
  options?: { maskDigitalCodes?: boolean },
): ReportResult {
  switch (id) {
    case "sales":
      return deriveSales(store, range);
    case "orders":
      return deriveOrders(store, range);
    case "products":
      return deriveProducts(store, range);
    case "customers":
      return deriveCustomers(store, range);
    case "inventory":
      return deriveInventory(store, range);
    case "digital":
      return deriveDigital(store, range, options?.maskDigitalCodes !== false);
    case "marketing":
      return deriveMarketing(store, range);
    case "tax-gst":
      return deriveTax(store, range);
    default: {
      const meta = getReportMeta(id);
      return {
        id,
        title: meta.title,
        description: meta.description,
        range,
        kpis: [],
        charts: [],
        columns: [],
        rows: [] as ReportRow[],
        notes: ["Report not implemented."],
      };
    }
  }
}

"use client";

import { useEffect, useState } from "react";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { formatInr } from "@/data/admin";
import { adminErrorMessage } from "@/lib/adminError";
import { api, isApiEnabled, type ApiGstReturn } from "@/lib/apiClient";

/**
 * What to hand the accountant, for one month, on one screen.
 *
 * Every figure here already existed per order — the invoice works out the
 * taxable value, the rate charged, and whether it is CGST+SGST or IGST by place
 * of supply. Nothing summed them. So the one job with a legal deadline meant
 * opening each order, typing its /documents URL by hand, reading the tax block
 * and adding up on paper; and the order screen meanwhile showed a flat 9% + 9%
 * that was not a calculation of anything.
 *
 * Summed on the server from the same service the invoice uses, so a return and
 * an invoice can never disagree.
 */

function monthRange(monthsAgo: number): { from: string; to: string; label: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return {
    from: iso(start),
    to: iso(end),
    label: start.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
  };
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-black/[0.05] px-4 py-2 last:border-b-0">
      <span className="text-[13px] text-[#6E6E73]">{label}</span>
      <span className="ez-mono text-[13px] font-semibold text-[#1D1D1F]">{value}</span>
    </div>
  );
}

export function GstReturnPanel() {
  const [monthsAgo, setMonthsAgo] = useState(0);
  const [data, setData] = useState<ApiGstReturn | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const month = monthRange(monthsAgo);

  useEffect(() => {
    if (!isApiEnabled()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .reportGst({ from: month.from, to: month.to })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(adminErrorMessage(err, "Could not work out this month's GST."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month.from, month.to]);

  function download() {
    if (!data) return;
    const rows = [
      ["Period", `${data.from} to ${data.to}`],
      ["Orders", String(data.orders)],
      ["Sales (including GST)", String(data.sales)],
      ["Taxable value", String(data.taxableValue)],
      ["CGST", String(data.cgst)],
      ["SGST", String(data.sgst)],
      ["IGST", String(data.igst)],
      ["Total GST", String(data.totalTax)],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `gst-${data.from}-to-${data.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminPanel
      title={`GST for ${month.label}`}
      meta={
        <select
          value={monthsAgo}
          onChange={(e) => setMonthsAgo(Number(e.target.value))}
          className="rounded-lg border border-black/[0.08] bg-white px-2 py-1 text-xs"
          aria-label="Month"
        >
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {monthRange(n).label}
            </option>
          ))}
        </select>
      }
      flush
    >
      {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}

      {loading ? (
        <p className="px-4 py-6 text-center text-[13px] text-[#6E6E73]">Adding it up…</p>
      ) : data ? (
        <>
          <Row label="Sales (including GST)" value={formatInr(data.sales)} />
          <Row label="Taxable value" value={formatInr(data.taxableValue)} />
          <Row label="CGST" value={formatInr(data.cgst)} />
          <Row label="SGST" value={formatInr(data.sgst)} />
          <Row label="IGST" value={formatInr(data.igst)} />
          <Row label="Total GST" value={formatInr(data.totalTax)} />

          {/* Named rather than folded in: an order whose delivery state could not
              be worked out is taxed as IGST, and the owner should know how many
              of those are inside the number they are about to file. */}
          {data.unresolvedPlaceOfSupply > 0 ? (
            <div className="px-4 py-2 text-[11px] text-[#8A5A00]">
              {data.unresolvedPlaceOfSupply} order
              {data.unresolvedPlaceOfSupply === 1 ? " has" : "s have"} no delivery state on record,
              so {data.unresolvedPlaceOfSupply === 1 ? "it is" : "they are"} counted as IGST.
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 border-t border-black/[0.06] px-4 py-3">
            <span className="text-[11px] text-[#86868B]">
              {data.orders} order{data.orders === 1 ? "" : "s"} in this month
            </span>
            <button
              type="button"
              onClick={download}
              disabled={data.orders === 0}
              className="inline-flex h-8 items-center rounded-lg bg-[#1D1D1F] px-3 text-xs font-semibold text-white transition hover:bg-[#2C2C2E] disabled:opacity-50"
            >
              Download for your accountant
            </button>
          </div>
        </>
      ) : (
        <p className="px-4 py-6 text-center text-[13px] text-[#6E6E73]">
          Connect the store server to see your GST.
        </p>
      )}
    </AdminPanel>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminChart } from "@/components/admin/AdminChart";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { GstReturnPanel } from "@/components/admin/GstReturnPanel";
import { StatCard } from "@/components/admin/StatCard";
import { ReportDateFilter } from "@/components/admin/reports/ReportDateFilter";
import {
  changeBadge,
  chooseBarSize,
  fillMissingDays,
  groupDays,
  partialBarNote,
  priorLine,
  totalsFromDays,
  type DaySales,
} from "@/components/admin/reports/moneyBuckets";
import { deriveTopSkus, formatInr, parsePrice } from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useReportFilters } from "@/hooks/useReportFilters";
import { adminErrorMessage } from "@/lib/adminError";
import { api, isApiEnabled, type ApiReportSku, type ApiReportSummary } from "@/lib/apiClient";
import { isDateInRange, previousPeriodRange } from "@/lib/reports/dateRange";
import { downloadCsv, toCsv } from "@/lib/reports/exportCsv";

/**
 * One money screen, because there used to be three over one set of numbers.
 *
 * "Analytics", this page, and every one of the eight report pages under it all
 * asked the server the same three questions. They then disagreed about the
 * answers: the report pages asked for the last thirty days no matter which
 * dates the picker above them said, this page put the change in TAKINGS inside
 * the average-order card, and the best-seller list — which has no dates at all,
 * it is the whole history of the shop — sat directly under a date picker on two
 * of them, reading as if it were about the week he had chosen. Underneath all
 * that, the eight report pages drew their tables from the offline demo shop, so
 * on a real shop they were eight tiles leading to eight empty screens.
 *
 * Three places to look is three places to disagree. This is the one place, and
 * it answers the three questions he actually asks — what came in, what is
 * selling, what do I owe — with the GST return that has a legal deadline
 * sitting beside them.
 */

/** A best-seller row, shaped the same whether it came from the shop or the demo. */
type SellerRow = { key: string; name: string; qty: number; revenue: number };

/** An answer from the shop, stamped with the dates it is an answer about. */
type Answer = { from: string; to: string; summary: ApiReportSummary; series: DaySales[] };

/**
 * What a panel says when it has no honest figures yet.
 *
 * An empty chart captioned "nothing sold in these dates" is a statement about
 * the shop, and while the answer is still on its way it is a false one — he
 * would think the day was dead when it was only slow to load.
 */
function Waiting({ failed }: { failed: boolean }) {
  return (
    <p className="py-6 text-center text-[13px] text-[#6E6E73]">
      {failed ? "Nothing to show yet." : "Adding it up…"}
    </p>
  );
}

function SellerList({ rows, failed = false }: { rows: SellerRow[] | null; failed?: boolean }) {
  if (rows === null) return <Waiting failed={failed} />;
  if (rows.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-[13px] text-[#6E6E73]">Nothing sold yet.</p>
    );
  }
  return (
    <ul>
      {rows.map((row) => (
        <li
          key={row.key}
          className="flex items-center justify-between gap-3 border-b border-black/[0.05] px-4 py-2.5 last:border-b-0"
        >
          <span className="min-w-0 flex-1 truncate text-[13px] text-[#1D1D1F]">{row.name}</span>
          <span className="shrink-0 text-right">
            <span className="block ez-mono text-[13px] font-semibold text-[#1D1D1F]">
              {formatInr(row.revenue)}
            </span>
            <span className="block text-[11px] text-[#6E6E73]">{row.qty} sold</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function AdminMoneyPage() {
  const apiOn = isApiEnabled();
  const store = useAdminStore();
  // With a real shop connected the local store is empty by design, so the date
  // picker must anchor on today rather than on the newest demo order.
  const filterOrders = useMemo(() => (apiOn ? [] : store.orders), [apiOn, store.orders]);
  const filters = useReportFilters(filterOrders, "7d");
  const { range } = filters;

  const [answer, setAnswer] = useState<Answer | null>(null);
  const [failure, setFailure] = useState<{ from: string; to: string; message: string } | null>(
    null,
  );
  // null until the shop has answered — an empty list means "you have sold
  // nothing", which is a different thing to say.
  const [sellers, setSellers] = useState<ApiReportSku[] | null>(null);
  const [sellersFailed, setSellersFailed] = useState(false);

  // The dates he actually picked, not just how many there are. Sending a count
  // asked the server about the last N days ending today, so a stretch in the
  // past came back with this week's numbers under last month's heading.
  const window = useMemo(() => ({ from: range.start, to: range.end }), [range.start, range.end]);

  useEffect(() => {
    if (!apiOn) return;
    let cancelled = false;
    void Promise.all([api.reportSummary(window), api.reportSeries(window)])
      .then(([summary, series]) => {
        if (cancelled) return;
        setAnswer({
          ...window,
          summary,
          series: Array.isArray(series) ? series : [],
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFailure({
          ...window,
          message: adminErrorMessage(err, "Could not add up your sales just now."),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [apiOn, window]);

  // Answers are matched back to the dates they were asked about. He changes the
  // dates faster than the shop can answer, and last week's takings under this
  // week's heading is the exact thing this screen exists to stop.
  const live = answer && answer.from === window.from && answer.to === window.to ? answer : null;
  const error =
    failure && failure.from === window.from && failure.to === window.to ? failure.message : null;

  // Best sellers are the whole history of the shop and take no dates, so they
  // are fetched once and never again when he changes the date picker.
  useEffect(() => {
    if (!apiOn) return;
    let cancelled = false;
    void api
      .reportTopSkus()
      .then((rows) => {
        if (!cancelled) setSellers(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        // NOT setSellers([]) — an empty list renders "Nothing sold yet.", which
        // is a statement about his shop, and this screen was rebuilt precisely
        // to stop telling him things that are not true. A request that failed
        // says so.
        if (!cancelled) setSellersFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [apiOn]);

  // --- Offline demo shop ---
  const demoOrders = useMemo(
    () => (apiOn ? [] : store.orders.filter((order) => order.status !== "cancelled")),
    [apiOn, store.orders],
  );
  const demoDays = useMemo(() => {
    const tally = new Map<string, DaySales>();
    for (const order of demoOrders) {
      const date = order.placedAt.slice(0, 10);
      const day = tally.get(date) ?? { date, revenue: 0, orders: 0 };
      day.revenue += parsePrice(order.total);
      day.orders += 1;
      tally.set(date, day);
    }
    return fillMissingDays([...tally.values()], range.start, range.end);
  }, [demoOrders, range.start, range.end]);
  const demoPriorRevenue = useMemo(() => {
    const prior = previousPeriodRange(range);
    return demoOrders
      .filter((order) => isDateInRange(order.placedAt, prior))
      .reduce((sum, order) => sum + parsePrice(order.total), 0);
  }, [demoOrders, range]);

  // --- One set of numbers, whichever shop they came from ---
  const days = useMemo(
    () => (apiOn ? fillMissingDays(live?.series ?? [], range.start, range.end) : demoDays),
    [apiOn, live, demoDays, range.start, range.end],
  );
  const totals = apiOn
    ? {
        revenue: live?.summary.revenue ?? 0,
        orders: live?.summary.orders ?? 0,
        average: live?.summary.aov ?? 0,
      }
    : totalsFromDays(demoDays);
  const priorRevenue = apiOn ? live?.summary.prev_revenue ?? 0 : demoPriorRevenue;
  // The shop reports which stretch it compared against; saying "the 30 days
  // before" when it used a different 30 days would be a guess dressed as a fact.
  const priorDays = apiOn ? live?.summary.days ?? days.length : days.length;
  const badge = changeBadge(totals.revenue, priorRevenue);

  const barSize = chooseBarSize(days.length);
  const bars = useMemo(() => groupDays(days, barSize), [days, barSize]);
  const barNote = partialBarNote(bars, barSize);
  const barLabels = bars.map((bar) => bar.label);

  const sellerRows: SellerRow[] | null = apiOn
    ? sellers?.map((row) => ({
        key: row.product_key,
        // The server sends the game's name now; the key is the last resort so a
        // row is never blank.
        name: row.title || row.product_key,
        qty: row.qty,
        revenue: row.revenue,
      })) ?? null
    : // Ranked by money, the way the shop ranks them, so the demo and a real
      // shop put the same product at the top of the same order book.
      [...deriveTopSkus(demoOrders, store.products, 100)]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
        .map((row) => ({ key: row.sku, name: row.name, qty: row.qty, revenue: row.revenue }));

  // Nothing is on screen until the figures are real: a card showing ₹0 while
  // the answer is still on its way is a number he could act on.
  const ready = !apiOn || live !== null;

  function download() {
    downloadCsv(
      `sales-${range.start}-to-${range.end}.csv`,
      toCsv(
        ["Date", "Sales", "Orders"],
        days.map((day) => [day.date, day.revenue, day.orders]),
      ),
    );
  }

  return (
    <div>
      {!apiOn ? (
        <AdminNotice tone="demo">
          These are practice figures from a sample shop. Connect your shop to see your own.
        </AdminNotice>
      ) : null}

      <AdminPageHeader
        title="Money"
        description="What came in, what is selling, and what you owe."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ReportDateFilter
              preset={filters.preset}
              onPresetChange={filters.setPreset}
              customStart={filters.customStart}
              customEnd={filters.customEnd}
              onCustomStart={filters.setCustomStart}
              onCustomEnd={filters.setCustomEnd}
              range={range}
              presetOptions={filters.presetOptions}
            />
            <button
              type="button"
              onClick={download}
              disabled={!ready || totals.orders === 0}
              className="inline-flex h-9 items-center rounded-lg border border-black/[0.1] bg-white px-3 text-xs font-semibold text-[#1D1D1F] transition hover:bg-[#F7F7F8] disabled:opacity-50"
            >
              Download day by day
            </button>
          </div>
        }
      />

      {error ? (
        <p className="mb-4 text-sm text-[#B42318]" role="alert">
          {error}
        </p>
      ) : null}

      {ready ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Sales"
              value={formatInr(totals.revenue)}
              detail={priorLine(priorRevenue, priorDays)}
              tone="dark"
              delta={badge?.text}
              deltaPositive={badge?.positive ?? null}
            />
            <StatCard
              label="Orders"
              value={String(totals.orders)}
              detail="Cancelled, refunded and unpaid ones are left out."
            />
            <StatCard
              label="Average order"
              value={formatInr(totals.average)}
              detail="What one order is worth on average."
            />
          </div>
          {/* Said out loud because a cash-on-delivery order counts the moment he
              accepts it: the figure above is what he has sold, which on a COD
              day is not the same as what is in the drawer. */}
          <p className="mt-2 text-[11px] leading-snug text-[#86868B]">
            Sales counts every order you accepted. Money for cash-on-delivery orders may still
            be on its way.
          </p>
        </>
      ) : error ? null : (
        <p className="rounded-xl border border-black/[0.06] bg-white px-4 py-6 text-center text-[13px] text-[#6E6E73]">
          Adding it up…
        </p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div>
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminPanel title={`Sales by ${barSize}`}>
                {ready ? (
                  <AdminChart
                    values={bars.map((bar) => bar.revenue)}
                    labels={barLabels}
                    variant="bar"
                    ariaLabel={`Sales by ${barSize}`}
                    formatValue={(value) => formatInr(value)}
                    emptyMessage="Nothing sold in these dates"
                  />
                ) : (
                  <Waiting failed={error !== null} />
                )}
              </AdminPanel>
              <AdminPanel title={`Orders by ${barSize}`}>
                {ready ? (
                  <AdminChart
                    values={bars.map((bar) => bar.orders)}
                    labels={barLabels}
                    variant="line"
                    color="#424245"
                    ariaLabel={`Orders by ${barSize}`}
                    emptyMessage="No orders in these dates"
                  />
                ) : (
                  <Waiting failed={error !== null} />
                )}
              </AdminPanel>
            </div>
            {/* A two-day tail bar standing next to full weeks reads as sales
                falling off a cliff. It is the calendar, not the shop. */}
            {ready && barNote ? (
              <p className="mt-2 text-[11px] text-[#6E6E73]">{barNote}</p>
            ) : null}
          </div>

          {/* The dates above do not apply here and saying so is the whole point:
              this list is every sale the shop has ever made, and next to a date
              picker it silently read as "what sold this week". He restocks off
              it. */}
          <AdminPanel
            title="Best sellers"
            meta={
              <span className="text-[11px] text-[#6E6E73]">
                Everything you have ever sold, not just the dates above.
              </span>
            }
            flush
          >
            <SellerList rows={sellerRows} failed={sellersFailed} />
          </AdminPanel>
        </div>

        <GstReturnPanel />
      </div>
    </div>
  );
}

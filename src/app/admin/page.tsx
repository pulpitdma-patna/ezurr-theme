"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatInr, type AdminOrderStatus } from "@/data/admin";
import { adminErrorMessage } from "@/lib/adminError";
import { api, isApiEnabled, type ApiToday } from "@/lib/apiClient";

/**
 * The first screen of the working day.
 *
 * It used to show eight numbers — four counting all time, four counting the last
 * seven days — under a single date control that moved only one of those groups,
 * with nothing on screen saying which. Two clocks on one wall, and neither
 * showing today. To draw them it fetched every order ever taken and all 298
 * products, roughly 3,300 records, before it could paint anything.
 *
 * Three blocks now, one column, one narrow call:
 *   1. what arrived since he last looked — a question the old screen could not ask
 *   2. what is waiting on him, with the action ON the row
 *   3. money today, separating what arrived from what the courier will collect
 */

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const sameDay = then.toDateString() === new Date().toDateString();
  const time = then
    .toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
    .toLowerCase();
  return sameDay
    ? time
    : `${then.toLocaleDateString("en-IN", { weekday: "short" })} ${time}`;
}

/** One line of work, with the thing to do on the same row. */
function WaitingRow({
  label,
  count,
  href,
  action,
  tone = "default",
}: {
  label: string;
  count?: number;
  href: string;
  action?: { label: string; href: string };
  tone?: "default" | "alert";
}) {
  if (count !== undefined && count === 0) return null;
  return (
    <li className="flex flex-wrap items-center gap-2 border-b border-black/[0.05] px-4 py-2.5 last:border-b-0">
      <span
        className={`flex-1 text-[13px] ${tone === "alert" ? "text-[#B42318]" : "text-[#1D1D1F]"}`}
      >
        {count !== undefined ? <strong>{count}</strong> : null} {label}
      </span>
      {action ? (
        <Link
          href={action.href}
          className="inline-flex h-7 items-center rounded-lg border border-black/[0.08] bg-white px-2.5 text-[11px] font-semibold text-[#1D1D1F] transition hover:bg-[#FAFAFB]"
        >
          {action.label}
        </Link>
      ) : null}
      <Link
        href={href}
        className="inline-flex h-7 items-center rounded-lg bg-[#1D1D1F] px-2.5 text-[11px] font-semibold text-white transition hover:bg-[#2C2C2E]"
      >
        Open
      </Link>
    </li>
  );
}

export default function AdminTodayPage() {
  const router = useRouter();
  const [data, setData] = useState<ApiToday | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isApiEnabled()) {
      setError("The store server is not connected, so there is nothing to show yet.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .today()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(adminErrorMessage(err, "Could not load today."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const w = data?.waiting;
  const m = data?.money;

  return (
    <div>
      <AdminPageHeader
        title="Today"
        description="What came in, what needs doing, and what the day is worth."
        breadcrumbs={[{ label: "Today" }]}
      />

      {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}

      {/* Practice mode is allowed to interrupt here and nowhere else on this
          screen: a shop whose customers cannot receive a sign-in code is broken
          in a way the owner should not have to go looking for. */}
      {data?.simulating.messaging ? (
        <AdminNotice tone="demo">
          <strong>Messages are in practice mode.</strong> Customers cannot receive a sign-in code
          or an order update — nothing is being sent.{" "}
          <Link href="/admin/integrations" className="underline">
            Turn it on
          </Link>
        </AdminNotice>
      ) : null}

      {loading ? (
        <div className="ez-mono py-10 text-center text-[10px] uppercase tracking-[0.16em] text-[#86868B]">
          Loading…
        </div>
      ) : null}

      {data ? (
        <div className="space-y-4">
          <AdminPanel
            title="New since you last looked"
            meta={data.since ? `Since ${timeAgo(data.since)}` : "Everything so far"}
            flush
          >
            {data.newOrders.length === 0 ? (
              // The empty state IS the answer — the sentence the old screen
              // could never print.
              <p className="px-4 py-6 text-center text-[13px] text-[#6E6E73]">
                Nothing new since {timeAgo(data.since) || "you started"}.
              </p>
            ) : (
              <ul>
                {data.newOrders.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/admin/orders/${o.id}`)}
                      className="flex w-full flex-wrap items-center gap-2 border-b border-black/[0.05] px-4 py-2.5 text-left last:border-b-0 hover:bg-[#FAFAFB]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold">
                          {o.customerName}
                        </span>
                        <span className="block truncate text-[11px] text-[#86868B]">{o.what}</span>
                      </span>
                      <span className="text-[12px] text-[#6E6E73]">{o.money.sentence}</span>
                      <StatusBadge kind="order" status={o.status as AdminOrderStatus} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>

          <AdminPanel title="Waiting on you" flush>
            {w &&
            w.needsOk + w.toPack + w.toSend + w.moneyProblem + w.outOfStock + w.lowStock === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-[#6E6E73]">
                Nothing waiting. Everything is up to date.
              </p>
            ) : (
              <ul>
                <WaitingRow
                  count={w?.needsOk}
                  label="orders to accept"
                  href="/admin/orders?tab=needs-ok"
                />
                <WaitingRow
                  count={w?.toPack}
                  label="orders to pack"
                  href="/admin/orders?tab=to-pack"
                />
                <WaitingRow
                  count={w?.toSend}
                  label="packed, waiting for the courier"
                  href="/admin/orders?tab=to-send"
                />
                <WaitingRow
                  count={w?.moneyProblem}
                  label="orders where the payment did not go through"
                  href="/admin/orders?tab=money-problem"
                  tone="alert"
                />
                <WaitingRow
                  count={w?.outOfStock}
                  label="products out of stock"
                  href="/admin/products?stock=out"
                  tone="alert"
                />
                <WaitingRow
                  count={w?.lowStock}
                  label="products running low"
                  href="/admin/products?stock=low"
                />
              </ul>
            )}
          </AdminPanel>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Money received today"
              value={formatInr(m?.receivedToday ?? 0)}
              detail="Actually in your account"
              tone="dark"
            />
            <StatCard
              label="Still to collect today"
              value={formatInr(m?.toCollectToday ?? 0)}
              detail="Cash on delivery, not yet collected"
            />
            <StatCard
              label="Orders today"
              value={String(m?.ordersToday ?? 0)}
            />
          </div>

          <p className="px-1 text-[12px] text-[#86868B]">
            This month so far {formatInr(m?.monthToDate ?? 0)} —{" "}
            <Link href="/admin/reports" className="underline">
              see reports
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}

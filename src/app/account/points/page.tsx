"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SectionHeading } from "@/components/home/SectionHeading";
import { useAccountStore } from "@/hooks/useAccountStore";
import { api, isApiEnabled } from "@/lib/apiClient";

type LedgerEntry = { id: string | number; label: string; delta: number; at: string };

const reasonLabel = (reason: string, orderId: string | null): string => {
  if (reason === "order_delivered") return orderId ? `Order ${orderId}` : "Order reward";
  if (reason === "redemption") return "Redeemed at checkout";
  return reason.replace(/_/g, " ");
};

export default function AccountPointsPage() {
  const apiOn = isApiEnabled();
  const account = useAccountStore();
  const [balance, setBalance] = useState<number | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);

  useEffect(() => {
    if (!apiOn) return;
    let cancelled = false;
    void api
      .accountPoints()
      .then((res) => {
        if (cancelled) return;
        setBalance(res.balance);
        setLedger(
          res.history.map((h) => ({
            id: h.id,
            label: reasonLabel(h.reason, h.order_public_id),
            delta: h.delta,
            at: h.created_at ?? new Date().toISOString(),
          })),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [apiOn]);

  const points = apiOn ? balance ?? 0 : account.points;
  const entries: LedgerEntry[] = apiOn
    ? ledger
    : account.pointsLedger.map((e) => ({ id: e.id, label: e.label, delta: e.delta, at: e.at }));

  return (
    <div>
      <SectionHeading
        titleAs="h1"
        eyebrow="Loyalty"
        title="Ezurr points."
        description={`You have ${points.toLocaleString("en-IN")} points · about ₹${Math.round(points / 10)} in reward value.`}
      />

      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl bg-[#1D1D1F] p-5 text-white sm:p-6">
          <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-white/45">
            Balance
          </span>
          <div className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
            {points.toLocaleString("en-IN")}
          </div>
          <p className="mt-2 text-xs text-white/55">Earn 1 point per ₹10 on delivered orders.</p>
        </article>
        <article className="rounded-2xl border border-black/[0.06] bg-[#F7F7F8] p-5 sm:p-6">
          <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
            How to use
          </span>
          <p className="mt-2 text-sm text-[#6E6E73]">
            Points accrue automatically when an order is delivered. Redemption at checkout is coming
            soon.
          </p>
          <Link href="/checkout" className="mt-4 inline-flex text-sm font-semibold text-[#1D1D1F]">
            Go to checkout →
          </Link>
        </article>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold tracking-[-0.03em]">Ledger</h2>
        {entries.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-black/[0.1] bg-[#F7F7F8] px-5 py-10 text-center text-sm text-[#6E6E73]">
            No points yet — they&apos;ll appear here once an order is delivered.
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-black/[0.06] rounded-2xl border border-black/[0.07]">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 px-4 py-3.5 text-sm"
              >
                <div>
                  <div className="font-semibold">{entry.label}</div>
                  <div className="ez-mono text-[10px] text-[#86868B]">
                    {new Date(entry.at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div
                  className={`ez-mono font-semibold ${
                    entry.delta >= 0 ? "text-[#2D6B3C]" : "text-[#B42318]"
                  }`}
                >
                  {entry.delta >= 0 ? "+" : ""}
                  {entry.delta}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

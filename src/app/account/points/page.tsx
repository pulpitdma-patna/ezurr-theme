"use client";

import Link from "next/link";
import { SectionHeading } from "@/components/home/SectionHeading";
import { useAccountStore } from "@/hooks/useAccountStore";

export default function AccountPointsPage() {
  const account = useAccountStore();

  return (
    <div>
      <SectionHeading
        titleAs="h1"
        eyebrow="Loyalty"
        title="Ezurr points."
        description={`You have ${account.points.toLocaleString("en-IN")} points · about ₹${Math.round(account.points / 10)} in reward value.`}
      />

      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl bg-[#1D1D1F] p-5 text-white sm:p-6">
          <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-white/45">
            Balance
          </span>
          <div className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
            {account.points.toLocaleString("en-IN")}
          </div>
          <p className="mt-2 text-xs text-white/55">Earn 1 point per ₹10 on prepaid orders (demo).</p>
        </article>
        <article className="rounded-2xl border border-black/[0.06] bg-[#F7F7F8] p-5 sm:p-6">
          <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
            How to use
          </span>
          <p className="mt-2 text-sm text-[#6E6E73]">
            Redeem at checkout when points checkout lands. This ledger is a local preview.
          </p>
          <Link href="/checkout" className="mt-4 inline-flex text-sm font-semibold text-[#1D1D1F]">
            Go to checkout →
          </Link>
        </article>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold tracking-[-0.03em]">Ledger</h2>
        <ul className="mt-4 divide-y divide-black/[0.06] rounded-2xl border border-black/[0.07]">
          {account.pointsLedger.map((entry) => (
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
      </section>
    </div>
  );
}

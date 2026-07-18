"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SectionHeading } from "@/components/home/SectionHeading";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useAuthSession } from "@/hooks/useAuthSession";
import { maskDigitalCode } from "@/data/admin";
import { normalizeMobile } from "@/lib/auth";

export default function AccountDigitalPage() {
  const { session } = useAuthSession();
  const store = useAdminStore();
  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const codes = useMemo(() => {
    const digits = normalizeMobile(session?.mobile ?? "");
    const myOrderIds = new Set(
      store.orders
        .filter((o) => normalizeMobile(o.customerMobile) === digits)
        .map((o) => o.id),
    );
    return store.digitalCodes.filter(
      (code) => code.assignedOrderId && myOrderIds.has(code.assignedOrderId),
    );
  }, [store.orders, store.digitalCodes, session?.mobile]);

  return (
    <div>
      <SectionHeading
        titleAs="h1"
        eyebrow="Entitlements"
        title="Digital vault."
        description="Game keys and digital codes assigned to your orders. Reveal only on a trusted device."
      />

      {codes.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-black/[0.1] bg-[#F7F7F8] px-5 py-12 text-center">
          <p className="text-sm font-semibold">No codes yet</p>
          <p className="mt-1 text-sm text-[#6E6E73]">
            Digital products assigned from HQ appear here after fulfillment.
          </p>
          <Link
            href="/account/orders"
            className="mt-4 inline-flex h-10 items-center rounded-full bg-[#1D1D1F] px-5 text-sm font-semibold text-white"
          >
            View orders
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {codes.map((code) => {
            const open = revealed === code.id;
            return (
              <li
                key={code.id}
                className="rounded-2xl border border-black/[0.07] px-4 py-4 sm:flex sm:items-center sm:justify-between sm:gap-4"
              >
                <div>
                  <div className="text-sm font-semibold">{code.productName}</div>
                  <div className="ez-mono mt-1 text-[11px] text-[#86868B]">
                    {code.assignedOrderId} · {code.platform}
                  </div>
                  <div className="ez-mono mt-2 text-sm font-semibold tracking-wide">
                    {open ? code.code : maskDigitalCode(code.code)}
                  </div>
                </div>
                <div className="mt-3 flex gap-2 sm:mt-0">
                  <button
                    type="button"
                    onClick={() => setRevealed((prev) => (prev === code.id ? null : code.id))}
                    className="h-9 rounded-full border border-black/10 px-4 text-xs font-semibold"
                  >
                    {open ? "Hide" : "Reveal"}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(code.code);
                        setCopied(code.id);
                        window.setTimeout(() => setCopied(null), 2000);
                      } catch {
                        /* ignore */
                      }
                    }}
                    className="h-9 rounded-full bg-[#1D1D1F] px-4 text-xs font-semibold text-white"
                  >
                    {copied === code.id ? "Copied" : "Copy"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

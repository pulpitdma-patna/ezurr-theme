"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { MicroBar } from "@/components/layout/MicroBar";
import { Header } from "@/components/layout/Header";
import { FooterFull } from "@/components/layout/Footer";
import { OrderTracker } from "@/components/orders/OrderTracker";
import { api } from "@/lib/apiClient";
import { mapApiTrackedOrder } from "@/lib/apiMappers";
import { normalizeMobile } from "@/lib/auth";
import type { AdminOrder } from "@/data/admin";

export function TrackOrderForm() {
  const params = useSearchParams();
  const [orderId, setOrderId] = useState(params.get("id") ?? "");
  const [mobile, setMobile] = useState("");
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Never auto-submit from a linked ?id= — the guest presses the button.
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = orderId.trim();
    const m = normalizeMobile(mobile);
    if (!id || m.length !== 10) {
      setError("Enter your order ID and 10-digit mobile.");
      return;
    }
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const raw = await api.trackOrder({ publicId: id, mobile: m });
      setOrder(mapApiTrackedOrder(raw));
    } catch {
      setError("We couldn't find an order for that ID and mobile. Double-check both and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MicroBar />
      <Header showSearch />
      <main className="ez-page mx-auto w-full max-w-[640px] flex-1 pt-10 sm:pt-14">
        <h1 className="ez-h1 m-0 font-bold">Track your order</h1>
        <p className="mt-2 text-[14px] text-[#6E6E73]">
          Enter your order ID and the mobile number used at checkout.
        </p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Order ID (e.g. EZ-…)"
            aria-label="Order ID"
            className="h-12 flex-1 rounded-full border border-[#E0E0E5] bg-white px-4 text-[15px] outline-none focus:border-[#111113]"
          />
          <input
            value={mobile}
            onChange={(e) => setMobile(normalizeMobile(e.target.value))}
            inputMode="numeric"
            placeholder="Mobile number"
            aria-label="Mobile number"
            className="h-12 flex-1 rounded-full border border-[#E0E0E5] bg-white px-4 text-[15px] outline-none focus:border-[#111113]"
          />
          <button
            type="submit"
            disabled={loading}
            className="ez-btn-primary h-12 shrink-0 rounded-full px-6 text-[15px] font-semibold disabled:opacity-50"
          >
            {loading ? "Tracking…" : "Track"}
          </button>
        </form>

        {error ? (
          <p className="mt-4 text-[13px] font-medium text-[#B42318]" role="alert">
            {error}
          </p>
        ) : null}

        {order ? (
          <section className="mt-8 rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-6">
            <OrderTracker order={order} />
          </section>
        ) : null}
      </main>
      <FooterFull />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { ListToolbar } from "@/components/admin/ListToolbar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useAdminToast } from "@/components/admin/AdminToast";
import { api, isApiEnabled } from "@/lib/apiClient";
import { formatInr } from "@/data/admin";
import { formatMobileDisplay } from "@/lib/auth";

type Session = {
  id: number;
  session_key: string;
  mobile: string | null;
  product_key: string | null;
  items: Array<{ productKey: string; title?: string; qty: number }>;
  total: number;
  status: string;
  last_activity_at: string | null;
  reminders_sent: number;
};

type OrderRow = { id: string; mobile: string; total: string; status: string; placedAt: string };

function ageLabel(iso: string | null): string {
  if (!iso) return "Not known";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} hr ago`;
  const days = Math.round(mins / 1440);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

/**
 * The stored word for where a basket stands. It used to be printed straight out
 * of the server in capitals — "ABANDONED", "RECOVERED" — which is the database
 * shouting at him, not a shop telling him what happened.
 */
const BASKET_WORDS: Record<string, string> = {
  active: "Still shopping",
  abandoned: "Walked away",
  recovered: "Came back and bought",
  placed: "Ordered",
  expired: "Too old to chase",
};

function basketWords(status: string): string {
  return BASKET_WORDS[status] ?? status;
}

export default function AdminRecoveryPage() {
  const apiOn = isApiEnabled();
  const toast = useAdminToast();
  const [tab, setTab] = useState<"carts" | "payments">("carts");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!apiOn) return;
    setError(null);
    try {
      const [carts, failed, pending] = await Promise.all([
        api.adminCheckoutSessions({ per_page: 100 }),
        api.adminOrders({ status: "payment_failed", per_page: 100 }),
        api.adminOrders({ status: "pending_payment", per_page: 100 }),
      ]);
      setSessions(((carts.data as unknown as Session[]) ?? []).filter((s) => s.mobile));
      const mapOrder = (o: Record<string, unknown>): OrderRow => ({
        id: String(o.public_id ?? o.id),
        mobile: String(o.mobile ?? ""),
        total: formatInr(Number(o.total ?? 0)),
        status: String(o.status ?? ""),
        placedAt: String(o.created_at ?? ""),
      });
      setOrders([
        ...((failed.data as Array<Record<string, unknown>>) ?? []).map(mapOrder),
        ...((pending.data as Array<Record<string, unknown>>) ?? []).map(mapOrder),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the baskets left behind.");
    }
  }, [apiOn]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const abandoned = sessions.filter((s) => s.status === "abandoned").length;
    const recovered = sessions.filter((s) => s.status === "recovered");
    const recoveredValue = recovered.reduce((sum, s) => sum + (s.total || 0), 0);
    return { abandoned, recovered: recovered.length, recoveredValue };
  }, [sessions]);

  async function sendRecovery(s: Session) {
    try {
      await api.recoverCheckoutSession(s.id);
      toast.push("Reminder is on its way", "success");
      await load();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : "The reminder did not go out", "warning");
    }
  }

  async function markRecovered(s: Session) {
    try {
      await api.patchCheckoutSession(s.id, "recovered");
      await load();
    } catch {
      toast.push("That did not save", "warning");
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Baskets left behind"
        description="Customers who filled a basket and walked away, and orders where the money never arrived. Nudge them."
      />

      {!apiOn ? (
        <AdminNotice tone="demo">
          Practice shop. Nobody real has left a basket behind here.
        </AdminNotice>
      ) : null}
      {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {[
          ["Left behind", String(stats.abandoned)],
          ["Came back and bought", String(stats.recovered)],
          ["Money that came back", formatInr(stats.recoveredValue)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-black/[0.07] bg-white px-4 py-3">
            <div className="ez-mono text-[10px] uppercase tracking-[0.12em] text-[#86868B]">{label}</div>
            <div className="mt-1 text-lg font-semibold text-[#1D1D1F]">{value}</div>
          </div>
        ))}
      </div>

      <ListToolbar
        resultLabel={
          tab === "carts"
            ? `${sessions.length} ${sessions.length === 1 ? "basket" : "baskets"}`
            : `${orders.length} ${orders.length === 1 ? "order" : "orders"}`
        }
        filters={
          <AdminSelect
            label="Show"
            value={tab}
            onChange={(value) => setTab(value as "carts" | "payments")}
            options={[
              { value: "carts", label: `Baskets left behind (${sessions.length})` },
              { value: "payments", label: `Money never arrived (${orders.length})` },
            ]}
          />
        }
      />

      <div className="overflow-x-auto rounded-2xl border border-black/[0.07] bg-white">
        {tab === "carts" ? (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-black/[0.06] bg-[#F8F8FA] text-[11px] uppercase tracking-[0.1em] text-[#86868B]">
              <tr>
                <th className="px-4 py-2.5">Phone</th>
                <th className="px-4 py-2.5">In the basket</th>
                <th className="px-4 py-2.5">Worth</th>
                <th className="px-4 py-2.5">Left</th>
                <th className="px-4 py-2.5">Where it stands</th>
                <th className="px-4 py-2.5 text-right">What you can do</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#86868B]">
                    Nobody has left a basket behind. A basket lands here when someone
                    fills it, gives you their number, and then leaves without paying.
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2.5 font-medium">{formatMobileDisplay(s.mobile ?? "")}</td>
                    <td className="px-4 py-2.5 text-[#6E6E73]">
                      {s.items?.length ?? 0} item{(s.items?.length ?? 0) === 1 ? "" : "s"}
                    </td>
                    <td className="ez-mono px-4 py-2.5">{formatInr(s.total || 0)}</td>
                    <td className="px-4 py-2.5 text-[#6E6E73]">{ageLabel(s.last_activity_at)}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-[11px] text-[#6E6E73]">
                        {basketWords(s.status)}
                        {s.reminders_sent > 0
                          ? ` · ${s.reminders_sent} ${s.reminders_sent === 1 ? "reminder" : "reminders"} sent`
                          : ""}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {s.status !== "recovered" && s.status !== "placed" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void sendRecovery(s)}
                            className="h-7 rounded-md bg-[#1D1D1F] px-2.5 text-[11px] font-semibold text-white"
                          >
                            Send a reminder
                          </button>
                          <button
                            type="button"
                            onClick={() => void markRecovered(s)}
                            className="ml-2 h-7 rounded-md border border-black/10 px-2.5 text-[11px] font-semibold"
                          >
                            They bought it
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] text-[#2D6B3C]">✓ they came back</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-black/[0.06] bg-[#F8F8FA] text-[11px] uppercase tracking-[0.1em] text-[#86868B]">
              <tr>
                <th className="px-4 py-2.5">Order</th>
                <th className="px-4 py-2.5">Phone</th>
                <th className="px-4 py-2.5">Worth</th>
                <th className="px-4 py-2.5">Where it stands</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[#86868B]">
                    Every payment has gone through. Orders show up here only when the
                    money did not arrive.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-2.5 font-medium">{o.id}</td>
                    <td className="px-4 py-2.5">{formatMobileDisplay(o.mobile)}</td>
                    <td className="ez-mono px-4 py-2.5">{o.total}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge kind="order" status={o.status as never} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

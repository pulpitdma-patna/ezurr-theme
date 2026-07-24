"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
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
  if (!iso) return "—";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
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
      setError(e instanceof Error ? e.message : "Could not load recovery data");
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
      toast.push("Recovery message queued", "success");
      await load();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : "Could not send recovery", "warning");
    }
  }

  async function markRecovered(s: Session) {
    try {
      await api.patchCheckoutSession(s.id, "recovered");
      await load();
    } catch {
      toast.push("Could not update", "warning");
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Recovery"
        description="Win back abandoned carts and rescue failed or unpaid orders."
      />

      {!apiOn ? (
        <AdminNotice tone="demo">Recovery requires the live store API.</AdminNotice>
      ) : null}
      {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {[
          ["Abandoned carts", String(stats.abandoned)],
          ["Recovered carts", String(stats.recovered)],
          ["Recovered value", formatInr(stats.recoveredValue)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-black/[0.07] bg-white px-4 py-3">
            <div className="ez-mono text-[10px] uppercase tracking-[0.12em] text-[#86868B]">{label}</div>
            <div className="mt-1 text-lg font-semibold text-[#1D1D1F]">{value}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        {(["carts", "payments"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`h-8 rounded-lg px-3 text-[11px] font-semibold ${
              tab === t ? "bg-[#1D1D1F] text-white" : "border border-black/[0.1] bg-white"
            }`}
          >
            {t === "carts" ? `Abandoned carts (${sessions.length})` : `Payment issues (${orders.length})`}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/[0.07] bg-white">
        {tab === "carts" ? (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-black/[0.06] bg-[#F8F8FA] text-[11px] uppercase tracking-[0.1em] text-[#86868B]">
              <tr>
                <th className="px-4 py-2.5">Mobile</th>
                <th className="px-4 py-2.5">Items</th>
                <th className="px-4 py-2.5">Value</th>
                <th className="px-4 py-2.5">Age</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#86868B]">
                    No captured carts yet.
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
                      <span className="ez-mono text-[10px] uppercase tracking-[0.1em] text-[#6E6E73]">
                        {s.status}
                        {s.reminders_sent > 0 ? ` · ${s.reminders_sent} sent` : ""}
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
                            Send recovery
                          </button>
                          <button
                            type="button"
                            onClick={() => void markRecovered(s)}
                            className="ml-2 h-7 rounded-md border border-black/10 px-2.5 text-[11px] font-semibold"
                          >
                            Mark recovered
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] text-[#2D6B3C]">✓ recovered</span>
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
                <th className="px-4 py-2.5">Mobile</th>
                <th className="px-4 py-2.5">Total</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[#86868B]">
                    No failed or unpaid orders.
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

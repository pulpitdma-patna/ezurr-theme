"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SectionHeading } from "@/components/home/SectionHeading";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useAuthSession } from "@/hooks/useAuthSession";
import { orderStatusLabels, type AdminOrder, type AdminOrderStatus } from "@/data/admin";
import { normalizeMobile } from "@/lib/auth";
import { api, isApiEnabled } from "@/lib/apiClient";
import { mapApiOrderToAdmin } from "@/lib/apiMappers";
import { CountdownInline } from "@/components/ui/Countdown";

type Filter = "all" | "progress" | "preorder" | "delivered";

function inProgress(status: AdminOrderStatus) {
  return ["pending", "confirmed", "packed", "shipped"].includes(status);
}

export default function OrdersPage() {
  const { session } = useAuthSession();
  const store = useAdminStore();
  const apiOn = isApiEnabled();
  const [filter, setFilter] = useState<Filter>("all");
  const [apiOrders, setApiOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(apiOn);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiOn) return;
    let cancelled = false;
    setLoading(true);
    void api
      .accountOrders({ page: 1 })
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res.data) ? res.data : [];
        setApiOrders(rows.map((row) => mapApiOrderToAdmin(row)));
        setError(null);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setApiOrders([]);
        setError(err.message || "Could not load orders");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiOn, session?.mobile]);

  const localMine = useMemo(() => {
    const digits = normalizeMobile(session?.mobile ?? "");
    return store.orders
      .filter((order) => normalizeMobile(order.customerMobile) === digits)
      .sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  }, [store.orders, session?.mobile]);

  const orders = apiOn ? apiOrders : localMine;

  const rows = useMemo(() => {
    return orders
      .filter((order) => {
        if (filter === "progress") return inProgress(order.status);
        if (filter === "preorder") return order.status === "preorder";
        if (filter === "delivered") return order.status === "delivered";
        return true;
      })
      .sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  }, [orders, filter]);

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All orders" },
    { id: "progress", label: "In progress" },
    { id: "preorder", label: "Pre-orders" },
    { id: "delivered", label: "Delivered" },
  ];

  return (
    <div>
      <SectionHeading
        titleAs="h1"
        eyebrow="Purchase history"
        title="Your orders."
        description="Track current deliveries and revisit past purchases."
      />

      {error ? (
        <p className="mb-4 text-sm text-[#B42318]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-2 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Order filters">
        {filters.map((item) => {
          const active = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(item.id)}
              className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold ${
                active ? "bg-[#1D1D1F] text-white" : "bg-[#F5F5F7] text-[#6E6E73]"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {filter === "preorder" ? (
        <div className="mt-4 rounded-2xl border border-[var(--ez-accent-panel-border)] bg-[var(--ez-accent-panel)] px-4 py-3 text-sm text-[#424245]">
          Pre-orders lock your price until release.{" "}
          <span className="font-semibold">
            Releases in <CountdownInline />
          </span>
        </div>
      ) : null}

      {loading ? (
        <p className="mt-8 text-sm text-[#86868B]">Loading orders…</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-sm text-[#86868B]">No orders yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-black/[0.06]">
          {rows.map((order) => (
            <li key={order.id} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#F7F7F8]">
                  {order.items[0]?.image ? (
                    <Image
                      src={order.items[0].image}
                      alt=""
                      fill
                      className="object-contain p-1"
                      sizes="64px"
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <div className="ez-mono text-[10px] uppercase tracking-[0.1em] text-[#86868B]">
                    {order.id}
                  </div>
                  <div className="text-sm font-semibold">
                    {order.items[0]?.name ?? "Order"} · {order.total}
                  </div>
                  <div className="mt-0.5 text-xs text-[#86868B]">
                    {orderStatusLabels[order.status]} ·{" "}
                    {new Date(order.placedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
              <Link
                href={`/account/orders/${order.id}`}
                className="shrink-0 text-sm font-semibold text-[#424245]"
              >
                View details →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

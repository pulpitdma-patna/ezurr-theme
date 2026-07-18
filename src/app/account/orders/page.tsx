"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { SectionHeading } from "@/components/home/SectionHeading";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useAuthSession } from "@/hooks/useAuthSession";
import { orderStatusLabels, type AdminOrder, type AdminOrderStatus } from "@/data/admin";
import { normalizeMobile } from "@/lib/auth";
import { CountdownInline } from "@/components/ui/Countdown";

type Filter = "all" | "progress" | "preorder" | "delivered";

function inProgress(status: AdminOrderStatus) {
  return ["pending", "confirmed", "packed", "shipped"].includes(status);
}

export default function OrdersPage() {
  const { session } = useAuthSession();
  const store = useAdminStore();
  const [filter, setFilter] = useState<Filter>("all");

  const mine = useMemo(() => {
    const digits = normalizeMobile(session?.mobile ?? "");
    return store.orders
      .filter((order) => normalizeMobile(order.customerMobile) === digits)
      .sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  }, [store.orders, session?.mobile]);

  const rows = useMemo(() => {
    return mine.filter((order) => {
      if (filter === "progress") return inProgress(order.status);
      if (filter === "preorder") return order.status === "preorder";
      if (filter === "delivered") return order.status === "delivered";
      return true;
    });
  }, [mine, filter]);

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
          . Cancel anytime before dispatch.
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-black/[0.1] bg-[#F7F7F8] px-5 py-12 text-center">
          <p className="text-sm font-semibold text-[#1D1D1F]">No orders in this view</p>
          <p className="mt-1 text-sm text-[#6E6E73]">
            {mine.length === 0
              ? "Orders placed with this mobile number will show up here."
              : "Try another filter."}
          </p>
          <Link
            href="/checkout"
            className="mt-4 inline-flex h-10 items-center rounded-full bg-[#1D1D1F] px-5 text-sm font-semibold text-white"
          >
            Start a pre-order
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: AdminOrder }) {
  const item = order.items[0];
  const action =
    order.status === "preorder"
      ? "View pre-order"
      : order.status === "delivered"
        ? "Buy again"
        : "Track order";

  return (
    <li className="rounded-2xl border border-black/[0.07] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span
            className={`inline-flex rounded-lg px-2 py-0.5 text-[10px] font-semibold ${
              order.status === "preorder"
                ? "bg-[var(--ez-accent-soft)] text-[var(--ez-accent-text)]"
                : order.status === "delivered"
                  ? "bg-[#F0F0F2] text-[#6E6E73]"
                  : "bg-[#EAF6ED] text-[#2D6B3C]"
            }`}
          >
            {orderStatusLabels[order.status]}
          </span>
          <div className="ez-mono mt-2 text-[10px] uppercase tracking-[0.12em] text-[#86868B]">
            {order.id} · {new Date(order.placedAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>
        </div>
        <div className="ez-mono text-sm font-semibold">{order.total}</div>
      </div>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#F7F7F8]">
          {item?.image ? (
            <Image src={item.image} alt="" fill className="object-contain p-1.5" sizes="80px" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold tracking-[-0.02em]">{item?.name ?? "Order"}</h2>
          <p className="mt-1 text-sm text-[#86868B]">
            {order.payment} · {order.city}
            {order.status === "preorder" ? " · Price locked" : ""}
          </p>
        </div>
        <Link
          href={
            order.status === "delivered" && item?.productKey
              ? `/product`
              : `/account/orders/${order.id}`
          }
          className="inline-flex h-10 items-center justify-center rounded-full bg-[#1D1D1F] px-5 text-sm font-semibold text-white"
        >
          {action}
        </Link>
      </div>
    </li>
  );
}

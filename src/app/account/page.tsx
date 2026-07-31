"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SectionHeading } from "@/components/home/SectionHeading";
import { useAccountStore } from "@/hooks/useAccountStore";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useAuthSession } from "@/hooks/useAuthSession";
import { formatInr, orderStatusLabels, type AdminOrder, type AdminOrderStatus } from "@/data/admin";
import { normalizeMobile } from "@/lib/auth";
import { api, isApiEnabled } from "@/lib/apiClient";

function firstName(name: string) {
  return name.split(/\s+/)[0] || name;
}

function ordersForMobile(orders: AdminOrder[], mobile: string) {
  const digits = normalizeMobile(mobile);
  return orders
    .filter((order) => normalizeMobile(order.customerMobile) === digits)
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt));
}

type LatestCard = {
  id: string;
  status: AdminOrderStatus;
  title: string;
  image?: string | null;
  detail: string;
  total: string;
};

function mapApiOrder(row: Record<string, unknown>): LatestCard | null {
  const id = typeof row.public_id === "string" ? row.public_id : null;
  if (!id) return null;
  const statusRaw = typeof row.status === "string" ? row.status : "pending";
  const status = (statusRaw in orderStatusLabels ? statusRaw : "pending") as AdminOrderStatus;
  const items = Array.isArray(row.items) ? row.items : [];
  const first = (items[0] ?? {}) as Record<string, unknown>;
  const title =
    (typeof first.title === "string" && first.title) ||
    (typeof first.name === "string" && first.name) ||
    "Order";
  const image =
    (typeof first.image === "string" && first.image) ||
    (typeof first.image_url === "string" && first.image_url) ||
    null;
  const addr = (row.shipping_address ?? {}) as Record<string, unknown>;
  const city = typeof addr.city === "string" ? addr.city : "";
  const tracking = typeof row.tracking === "string" ? row.tracking : "";
  const totalNum = Number(row.total ?? 0);

  return {
    id,
    status,
    title,
    image,
    detail: tracking ? `Tracking ${tracking}` : city || "Placed",
    total: formatInr(totalNum),
  };
}

export default function AccountPage() {
  const { session } = useAuthSession();
  const admin = useAdminStore();
  const account = useAccountStore();
  const name = session?.name ?? "Player";
  const mine = session ? ordersForMobile(admin.orders, session.mobile) : [];
  const demoLatest = mine[0] ?? null;
  const inFlight = mine.filter((o) =>
    ["pending", "confirmed", "packed", "shipped", "preorder"].includes(o.status),
  ).length;
  const apiOn = isApiEnabled();
  const [apiStats, setApiStats] = useState<{
    orders: number;
    points: number;
    wishlist: number;
  } | null>(null);
  const [apiLatest, setApiLatest] = useState<LatestCard | null | undefined>(undefined);

  useEffect(() => {
    if (!apiOn || !session) return;
    let cancelled = false;
    void Promise.all([
      api.accountOrders({ page: 1 }).then((r) => {
        const rows = Array.isArray(r.data) ? [...r.data] : [];
        rows.sort((a, b) => {
          const aRow = a as Record<string, unknown>;
          const bRow = b as Record<string, unknown>;
          const aAt = String(aRow.created_at ?? aRow.placed_at ?? "");
          const bAt = String(bRow.created_at ?? bRow.placed_at ?? "");
          return bAt.localeCompare(aAt);
        });
        const latest = rows[0] ? mapApiOrder(rows[0] as Record<string, unknown>) : null;
        const total = typeof r.total === "number" ? r.total : rows.length;
        return { orders: total, latest };
      }).catch(() => ({ orders: 0, latest: null as LatestCard | null })),
      api.accountPoints().then((r) => r.balance).catch(() => 0),
      api.accountWishlist().then((r) => r.length).catch(() => 0),
    ]).then(([orderInfo, points, wishlist]) => {
      if (cancelled) return;
      setApiStats({ orders: orderInfo.orders, points, wishlist });
      setApiLatest(orderInfo.latest);
    });
    return () => {
      cancelled = true;
    };
  }, [apiOn, session]);

  const apiLoading = apiOn && !!session && apiStats === null;
  const ordersCount = apiOn ? (apiStats?.orders ?? 0) : mine.length;
  const pointsValue = apiOn ? (apiStats?.points ?? 0) : account.points;
  const wishlistCount = apiOn ? (apiStats?.wishlist ?? 0) : account.wishlistKeys.length;
  const latest: LatestCard | null = apiOn
    ? (apiLatest ?? null)
    : demoLatest
      ? {
          id: demoLatest.id,
          status: demoLatest.status,
          title: demoLatest.items[0]?.name ?? "Order",
          image: demoLatest.items[0]?.image,
          detail: demoLatest.tracking ? `Tracking ${demoLatest.tracking}` : demoLatest.city,
          total: demoLatest.total,
        }
      : null;

  const stats = [
    {
      label: "Orders",
      value: apiLoading ? "—" : String(ordersCount).padStart(2, "0"),
      detail: apiLoading
        ? "Loading…"
        : !apiOn && inFlight
          ? `${inFlight} in progress`
          : "No open deliveries",
      href: "/account/orders",
      tone: "dark" as const,
    },
    {
      label: "Ezurr points",
      value: apiLoading ? "—" : pointsValue.toLocaleString("en-IN"),
      detail: apiLoading ? "Loading…" : `₹${Math.round(pointsValue / 10)} reward value`,
      href: "/account/points",
      tone: "light" as const,
    },
    {
      label: "Wishlist",
      value: apiLoading ? "—" : String(wishlistCount).padStart(2, "0"),
      detail: apiLoading ? "Loading…" : wishlistCount ? "Saved for later" : "Browse the catalog",
      href: "/account/wishlist",
      tone: "light" as const,
    },
  ];

  return (
    <div>
      <SectionHeading
        titleAs="h1"
        eyebrow="Your account"
        title={`Welcome back, ${firstName(name)}.`}
        description="Track orders, manage your details, and pick up where you left off."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`rounded-2xl p-5 transition hover:-translate-y-0.5 sm:p-6 ${
              stat.tone === "dark"
                ? "bg-[#1D1D1F] text-white"
                : "border border-black/[0.06] bg-[#F7F7F8]"
            }`}
          >
            <span
              className={`ez-mono text-[9px] uppercase tracking-[0.15em] ${
                stat.tone === "dark" ? "text-white/45" : "text-[#86868B]"
              }`}
            >
              {stat.label}
            </span>
            <div className="mt-3 text-3xl font-semibold tracking-[-0.045em]">{stat.value}</div>
            <p
              className={`mt-2 text-xs ${
                stat.tone === "dark" ? "text-white/55" : "text-[#86868B]"
              }`}
            >
              {stat.detail}
            </p>
          </Link>
        ))}
      </div>

      <section className="mt-10 rounded-2xl border border-black/[0.07] p-5 sm:p-7">
        <SectionHeading
          className="!mb-5 sm:!mb-6"
          eyebrow="Latest order"
          title={
            apiLoading
              ? "Loading orders…"
              : latest
                ? orderStatusLabels[latest.status] + "."
                : "No orders yet."
          }
          href="/account/orders"
          linkLabel="View all orders"
        />
        {apiLoading ? (
          <div className="mt-4 rounded-2xl border border-dashed border-black/[0.1] bg-[#F7F7F8] px-5 py-8 text-center text-sm text-[#6E6E73]">
            Fetching your latest order…
          </div>
        ) : latest ? (
          <div className="mt-6 grid gap-6 rounded-2xl bg-[#F7F7F8] p-4 sm:grid-cols-[110px_1fr_auto] sm:items-center sm:p-5">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-white">
              {latest.image ? (
                <Image
                  src={latest.image}
                  alt={latest.title}
                  fill
                  className="object-contain p-2"
                  sizes="110px"
                />
              ) : null}
            </div>
            <div>
              <div className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#3D7A4E]">
                {orderStatusLabels[latest.status]} · {latest.id}
              </div>
              <h3 className="mt-2 font-semibold tracking-[-0.02em]">{latest.title}</h3>
              <p className="mt-1 text-sm text-[#86868B]">
                {latest.detail} · {latest.total}
              </p>
            </div>
            <Link
              href={`/account/orders/${latest.id}`}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#1D1D1F] px-5 text-sm font-semibold text-white hover:!text-white"
            >
              Track order
            </Link>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-black/[0.1] bg-[#F7F7F8] px-5 py-8 text-center">
            <p className="text-sm text-[#6E6E73]">
              Place a pre-order or shop the catalog — orders tied to your mobile appear here.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link
                href="/checkout"
                className="inline-flex h-10 items-center rounded-full bg-[#1D1D1F] px-5 text-sm font-semibold text-white"
              >
                Pre-order GTA VI
              </Link>
              <Link
                href="/"
                className="inline-flex h-10 items-center rounded-full border border-black/10 px-5 text-sm font-semibold"
              >
                Browse store
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

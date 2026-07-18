"use client";

import Image from "next/image";
import Link from "next/link";
import { SectionHeading } from "@/components/home/SectionHeading";
import { useAccountStore } from "@/hooks/useAccountStore";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useAuthSession } from "@/hooks/useAuthSession";
import { orderStatusLabels, type AdminOrder } from "@/data/admin";
import { normalizeMobile } from "@/lib/auth";

function firstName(name: string) {
  return name.split(/\s+/)[0] || name;
}

function ordersForMobile(orders: AdminOrder[], mobile: string) {
  const digits = normalizeMobile(mobile);
  return orders
    .filter((order) => normalizeMobile(order.customerMobile) === digits)
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt));
}

export default function AccountPage() {
  const { session } = useAuthSession();
  const admin = useAdminStore();
  const account = useAccountStore();
  const name = session?.name ?? "Player";
  const mine = session ? ordersForMobile(admin.orders, session.mobile) : [];
  const latest = mine[0] ?? null;
  const inFlight = mine.filter((o) =>
    ["pending", "confirmed", "packed", "shipped", "preorder"].includes(o.status),
  ).length;
  const wishlistCount = account.wishlistKeys.length;

  const stats = [
    {
      label: "Orders",
      value: String(mine.length).padStart(2, "0"),
      detail: inFlight ? `${inFlight} in progress` : "No open deliveries",
      href: "/account/orders",
      tone: "dark" as const,
    },
    {
      label: "Ezurr points",
      value: account.points.toLocaleString("en-IN"),
      detail: `₹${Math.round(account.points / 10)} reward value`,
      href: "/account/points",
      tone: "light" as const,
    },
    {
      label: "Wishlist",
      value: String(wishlistCount).padStart(2, "0"),
      detail: wishlistCount ? "Saved for later" : "Browse the catalog",
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
          title={latest ? orderStatusLabels[latest.status] + "." : "No orders yet."}
          href="/account/orders"
          linkLabel="View all orders"
        />
        {latest ? (
          <div className="mt-6 grid gap-6 rounded-2xl bg-[#F7F7F8] p-4 sm:grid-cols-[110px_1fr_auto] sm:items-center sm:p-5">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-white">
              {latest.items[0]?.image ? (
                <Image
                  src={latest.items[0].image}
                  alt={latest.items[0].name}
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
              <h3 className="mt-2 font-semibold tracking-[-0.02em]">
                {latest.items[0]?.name ?? "Order"}
              </h3>
              <p className="mt-1 text-sm text-[#86868B]">
                {latest.tracking ? `Tracking ${latest.tracking}` : latest.city} · {latest.total}
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

      <section className="mt-10">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-[-0.04em]">Quick actions</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["/account/wishlist", "Wishlist", "Return to saved products"],
            ["/account/digital", "Digital vault", "Reveal game codes"],
            ["/account/profile", "Profile", "Update mobile and details"],
          ].map(([href, title, description]) => (
            <Link
              key={href}
              href={href}
              className="group rounded-2xl border border-black/[0.07] p-5 transition hover:-translate-y-1 hover:shadow-[var(--ez-card-shadow)]"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{title}</h3>
                <span className="transition group-hover:translate-x-1">→</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[#86868B]">{description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

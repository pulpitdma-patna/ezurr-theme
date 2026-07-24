"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { SectionHeading } from "@/components/home/SectionHeading";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useAuthSession } from "@/hooks/useAuthSession";
import { orderStatusLabels, type AdminOrder } from "@/data/admin";
import { normalizeMobile } from "@/lib/auth";
import { api, isApiEnabled } from "@/lib/apiClient";
import { mapApiOrderToAdmin } from "@/lib/apiMappers";
import { CountdownInline } from "@/components/ui/Countdown";
import { OrderTracker } from "@/components/orders/OrderTracker";

export default function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { session } = useAuthSession();
  const store = useAdminStore();
  const apiOn = isApiEnabled();
  const [apiOrder, setApiOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(apiOn);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiOn) return;
    let cancelled = false;
    setLoading(true);
    void api
      .accountOrder(id)
      .then((raw) => {
        if (!cancelled) {
          setApiOrder(mapApiOrderToAdmin(raw));
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setApiOrder(null);
          setError(err.message || "Order not found");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiOn, id, session?.mobile]);

  const localOrder = useMemo(() => {
    const digits = normalizeMobile(session?.mobile ?? "");
    const found = store.orders.find((o) => o.id === id);
    if (!found) return null;
    if (normalizeMobile(found.customerMobile) !== digits) return null;
    return found;
  }, [store.orders, id, session?.mobile]);

  const order = apiOn ? apiOrder : localOrder;

  if (apiOn && loading) {
    return <p className="text-sm text-[#86868B]">Loading order…</p>;
  }

  if (apiOn && (error || !order)) {
    return (
      <div>
        <SectionHeading titleAs="h1" eyebrow="Orders" title="Order not found." />
        {error ? (
          <p className="mb-4 text-sm text-[#B42318]" role="alert">
            {error}
          </p>
        ) : null}
        <Link href="/account/orders" className="text-sm font-semibold text-[#424245]">
          ← Back to orders
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <SectionHeading titleAs="h1" eyebrow="Orders" title="Order not found." />
        <Link href="/account/orders" className="text-sm font-semibold text-[#424245]">
          ← Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div>
      <SectionHeading
        titleAs="h1"
        eyebrow={order.id}
        title={orderStatusLabels[order.status] + "."}
        description={`Placed ${new Date(order.placedAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })} · ${order.payment}`}
      />

      {order.status === "preorder" ? (
        <div className="mb-5 rounded-2xl border border-[var(--ez-accent-panel-border)] bg-[var(--ez-accent-panel)] px-4 py-3 text-sm">
          Price locked at <span className="font-semibold">{order.total}</span>. Releases in{" "}
          <CountdownInline />. Cancel anytime before dispatch.
        </div>
      ) : null}

      <section className="mb-4 rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-6">
        <OrderTracker order={order} />
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-black/[0.07] bg-white p-5">
          <h2 className="text-sm font-semibold">Line items</h2>
          <ul className="mt-3 divide-y divide-black/[0.05]">
            {order.items.map((item) => (
              <li key={`${item.sku}-${item.name}`} className="flex gap-3 py-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#F7F7F8]">
                  {item.image ? (
                    <Image src={item.image} alt="" fill className="object-contain p-1" sizes="64px" />
                  ) : null}
                </div>
                <div>
                  <div className="text-sm font-semibold">{item.name}</div>
                  <div className="text-xs text-[#86868B]">
                    {item.qty} × {item.price}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-black/[0.07] bg-white p-5">
          <h2 className="text-sm font-semibold">Shipping</h2>
          <p className="mt-2 text-sm text-[#424245]">
            {order.addressLine1 ? `${order.addressLine1}, ` : ""}
            {order.city}
            {order.pincode ? ` · ${order.pincode}` : ""}
          </p>
          <div className="mt-4 border-t border-black/[0.06] pt-4">
            <div className="flex justify-between text-sm">
              <span>Total</span>
              <span className="font-semibold">{order.total}</span>
            </div>
          </div>
        </section>
      </div>

      <Link href="/account/orders" className="mt-6 inline-block text-sm font-semibold text-[#424245]">
        ← Back to orders
      </Link>
    </div>
  );
}

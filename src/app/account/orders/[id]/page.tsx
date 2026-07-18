"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useMemo, useState } from "react";
import { SectionHeading } from "@/components/home/SectionHeading";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useAuthSession } from "@/hooks/useAuthSession";
import { maskDigitalCode, orderStatusLabels } from "@/data/admin";
import { normalizeMobile } from "@/lib/auth";
import { CountdownInline } from "@/components/ui/Countdown";

export default function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { session } = useAuthSession();
  const store = useAdminStore();
  const [toast, setToast] = useState<string | null>(null);

  const order = useMemo(() => {
    const digits = normalizeMobile(session?.mobile ?? "");
    const found = store.orders.find((o) => o.id === id);
    if (!found) return null;
    if (normalizeMobile(found.customerMobile) !== digits) return null;
    return found;
  }, [store.orders, id, session?.mobile]);

  const codes = useMemo(
    () => store.digitalCodes.filter((c) => c.assignedOrderId === id),
    [store.digitalCodes, id],
  );

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

      {toast ? (
        <p className="mb-4 text-sm font-medium text-[#2D6B3C]" role="status">
          {toast}
        </p>
      ) : null}

      {order.status === "preorder" ? (
        <div className="mb-5 rounded-2xl border border-[var(--ez-accent-panel-border)] bg-[var(--ez-accent-panel)] px-4 py-3 text-sm">
          Price locked at <span className="font-semibold">{order.total}</span>. Releases in{" "}
          <CountdownInline />. Cancel anytime before dispatch.
        </div>
      ) : null}

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
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{item.name}</div>
                  <div className="ez-mono mt-0.5 text-[10px] text-[#86868B]">
                    Qty {item.qty} · {item.fulfillmentType}
                  </div>
                </div>
                <div className="ez-mono text-sm font-semibold">{item.price}</div>
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-3">
          <section className="rounded-2xl border border-black/[0.07] p-5">
            <h2 className="text-sm font-semibold">Shipping</h2>
            <p className="mt-2 text-sm text-[#6E6E73]">
              {order.addressLine1 ?? order.customerName}
              <br />
              {order.city} {order.pincode ?? ""}
            </p>
            {order.tracking ? (
              <p className="ez-mono mt-3 text-[11px] text-[#424245]">AWB {order.tracking}</p>
            ) : (
              <p className="mt-3 text-xs text-[#86868B]">Tracking assigned when the order ships.</p>
            )}
          </section>

          <section className="rounded-2xl border border-black/[0.07] p-5">
            <h2 className="text-sm font-semibold">Timeline</h2>
            <ol className="mt-3 space-y-2">
              {order.timeline.map((event) => (
                <li key={event.id} className="text-sm">
                  <div className="font-semibold">{event.label}</div>
                  <div className="ez-mono text-[10px] text-[#86868B]">
                    {new Date(event.at).toLocaleString("en-IN")}
                  </div>
                  {event.detail ? (
                    <div className="mt-0.5 text-xs text-[#6E6E73]">{event.detail}</div>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>

          <button
            type="button"
            onClick={() => {
              setToast("Invoice PDF is a demo stub — no file downloaded");
              window.setTimeout(() => setToast(null), 2500);
            }}
            className="h-10 w-full rounded-full border border-black/10 text-sm font-semibold"
          >
            Download invoice
          </button>
        </aside>
      </div>

      {codes.length > 0 ? (
        <section className="mt-5 rounded-2xl border border-black/[0.07] p-5">
          <h2 className="text-sm font-semibold">Digital codes on this order</h2>
          <ul className="mt-3 space-y-2">
            {codes.map((code) => (
              <li
                key={code.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-[#F7F7F8] px-3 py-2"
              >
                <span className="ez-mono text-xs">{maskDigitalCode(code.code)}</span>
                <Link href="/account/digital" className="text-xs font-semibold">
                  Open vault →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Link href="/account/orders" className="mt-6 inline-flex text-sm font-semibold text-[#424245]">
        ← All orders
      </Link>
    </div>
  );
}

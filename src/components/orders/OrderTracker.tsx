"use client";

import type { AdminOrder } from "@/data/admin";
import {
  ORDER_STEPS,
  orderStatusLabels,
  statusTone,
} from "@/data/admin";

/**
 * Customer-facing order tracker: a fulfilment stepper (pending → delivered), a
 * carrier tracking deep-link, and the detailed event timeline. Reused by the
 * signed-in order page and the public /track page.
 */
export function OrderTracker({ order }: { order: AdminOrder }) {
  const terminal = order.status === "cancelled" || order.status === "refunded";
  const activeIndex = ORDER_STEPS.indexOf(order.status);

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-center gap-3">
        <span className="ez-mono text-[10px] uppercase tracking-[0.16em] text-[#86868B]">
          Order {order.id}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusTone(order.status)}`}
        >
          {orderStatusLabels[order.status]}
        </span>
        {order.eta && !terminal ? (
          <span className="text-[12px] text-[#6E6E73]">
            Est. delivery {new Date(order.eta).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </span>
        ) : null}
      </div>

      {terminal ? (
        <div className="rounded-2xl border border-[#F0D2D2] bg-[#FDF5F5] px-4 py-3 text-[13px] font-medium text-[#B42318]">
          This order was {order.status}.
        </div>
      ) : (
        <ol className="flex items-start justify-between gap-1">
          {ORDER_STEPS.map((step, i) => {
            const done = activeIndex >= 0 && i <= activeIndex;
            const current = i === activeIndex;
            return (
              <li key={step} className="flex flex-1 flex-col items-center gap-2 text-center">
                <div className="flex w-full items-center">
                  <span
                    className={`h-0.5 flex-1 ${i === 0 ? "opacity-0" : done ? "bg-[#111113]" : "bg-[#E3E3E8]"}`}
                  />
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition ${
                      done
                        ? "border-[#111113] bg-[#111113] text-white"
                        : "border-[#D6D6DB] bg-white text-[#C7C7CC]"
                    } ${current ? "ring-4 ring-[#111113]/10" : ""}`}
                  >
                    {done && !current ? "✓" : i + 1}
                  </span>
                  <span
                    className={`h-0.5 flex-1 ${i === ORDER_STEPS.length - 1 ? "opacity-0" : activeIndex > i ? "bg-[#111113]" : "bg-[#E3E3E8]"}`}
                  />
                </div>
                <span
                  className={`text-[11px] font-medium leading-tight ${done ? "text-[#111113]" : "text-[#A1A1A6]"}`}
                >
                  {orderStatusLabels[step]}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {order.tracking ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E8E8ED] bg-[#FAFAFB] px-4 py-3.5">
          <div className="min-w-0">
            <div className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
              {order.carrierName ? order.carrierName : "Tracking number"}
            </div>
            <div className="mt-0.5 truncate text-[14px] font-semibold text-[#111113]">
              {order.tracking}
            </div>
          </div>
          {order.trackingUrl ? (
            <a
              href={order.trackingUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="ez-btn-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold"
            >
              Track shipment →
            </a>
          ) : null}
        </div>
      ) : null}

      {order.timeline.length > 0 ? (
        <div>
          <h3 className="ez-mono mb-3 text-[10px] uppercase tracking-[0.16em] text-[#86868B]">
            Timeline
          </h3>
          <ol className="flex flex-col gap-4">
            {[...order.timeline].reverse().map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#111113]" />
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold text-[#111113]">{e.label}</div>
                  {e.detail ? <div className="text-[12px] text-[#6E6E73]">{e.detail}</div> : null}
                  <div className="ez-mono text-[10px] uppercase tracking-[0.1em] text-[#A1A1A6]">
                    {new Date(e.at).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

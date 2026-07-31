"use client";

import Image from "next/image";
import type { AdminOrder } from "@/data/admin";
import type { ApiDigitalCode } from "@/lib/apiClient";
import { formatAdminDateTime, formatAdminTime } from "@/lib/adminFormat";
import { formatMobileDisplay } from "@/lib/auth";

/**
 * What is in this order, with the game codes on the line they belong to.
 *
 * There used to be a separate "Digital fulfillment" section a screen further
 * down — a hundred and twenty lines of it — so answering "did his code go out?"
 * meant matching a product name in one part of the page against a masked code in
 * another. The code is a fact about a line; it belongs on the line.
 *
 * Gone with it: the meta line above every product name, which in live mode read
 * `dualsense-controller · dualsense-controller · physical` — the web address,
 * the web address again, then the word "physical" — and an `Edit SKU` link that
 * opened the product editor from inside an order he was trying to pack.
 */

export type ResendState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; at: Date; mobile: string }
  | { kind: "failed"; message: string };

export function OrderItemsCard({
  order,
  codes,
  onResend,
  resend = { kind: "idle" },
}: {
  order: AdminOrder;
  /** Codes the server says belong to this order. Masked — see below. */
  codes: ApiDigitalCode[];
  onResend?: () => void;
  resend?: ResendState;
}) {
  const count = order.items.length;
  const sentCodes = codes.filter((c) => c.assigned_at);

  return (
    <section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
      <div className="border-b border-black/[0.05] px-4 py-2.5 text-xs font-semibold text-[#1D1D1F]">
        {count === 1 ? "1 thing in this order" : `${count} things in this order`}
      </div>
      <ul className="divide-y divide-black/[0.05]">
        {order.items.map((item) => {
          const lineCodes = codes.filter((c) => c.product_key === item.productKey);
          const lineSent = lineCodes.filter((c) => c.assigned_at);
          return (
            <li key={`${item.productKey}-${item.sku}`} className="p-4">
              <div className="grid gap-3 sm:grid-cols-[56px_1fr_auto] sm:items-center">
                <div className="relative aspect-square overflow-hidden rounded-md bg-[#F7F7F8]">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-contain p-1.5"
                      sizes="56px"
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold tracking-[-0.02em]">{item.name}</h2>
                  <p className="mt-0.5 text-[11px] text-[#86868B]">Qty {item.qty}</p>
                </div>
                <div className="ez-mono text-xs font-medium">{item.price}</div>
              </div>

              {item.fulfillmentType === "digital" ? (
                <div className="mt-2 rounded-xl bg-[#F7F7F8] px-3 py-2 text-[11px] text-[#424245]">
                  {lineSent.length > 0 ? (
                    <>
                      <div className="font-semibold text-[#1D1D1F]">
                        Code sent to {formatMobileDisplay(order.customerMobile)} ·{" "}
                        {formatAdminDateTime(lineSent[0].assigned_at as string)}
                      </div>
                      {/* Masked, and it stays masked. The server has never sent
                          the plaintext to the admin, and a key spelled out on a
                          shop laptop with a customer leaning over the counter is
                          a worse problem than the one it solves. What he
                          actually needs is for it to arrive — that is the button
                          below. */}
                      <ul className="ez-mono mt-1 space-y-0.5 text-[11px] text-[#6E6E73]">
                        {lineSent.map((code) => (
                          <li key={code.id}>{code.masked_code}</li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <span>The code goes out on its own once the payment clears.</span>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {sentCodes.length > 0 && onResend ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-black/[0.05] px-4 py-3">
          <button
            type="button"
            onClick={onResend}
            disabled={resend.kind === "sending"}
            className="h-9 rounded-xl border border-black/10 px-3 text-xs font-semibold disabled:opacity-50 hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
          >
            {resend.kind === "sending" ? "Sending the code again…" : "Send the code again"}
          </button>
          {/* Stated on the page and left there, not thrown in a toast that is
              gone before he has read it — he is on the phone to the customer. */}
          {resend.kind === "sent" ? (
            <span className="text-[11px] font-medium text-[#2D6B3C]">
              Sent again to {formatMobileDisplay(resend.mobile)} ·{" "}
              {formatAdminTime(resend.at).toLowerCase()}
            </span>
          ) : null}
          {resend.kind === "failed" ? (
            <span className="text-[11px] font-medium text-[#B42318]">
              Not sent — {resend.message}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

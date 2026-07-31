"use client";

import { useEffect, useRef, useState } from "react";
import { OrderStatusRail } from "@/components/admin/OrderStatusRail";
import type { AdminOrder } from "@/data/admin";
import { formatAdminDate } from "@/lib/adminFormat";

/**
 * The three things he came to this screen for, above everything else on it.
 *
 * The order screen used to open with a status word, a print explainer and a
 * column of equally-weighted buttons — Confirm COD, Mark packed, Reject COD,
 * Send back ₹4,499 — every one of them the same size, the destructive ones
 * included. Deciding which to press meant reading all of them, and the question
 * he actually arrived with ("has this been paid for, or do I take cash at the
 * door?") was answered nowhere.
 *
 * So: one money sentence, one rail, one button. Everything that cannot be
 * undone moves behind the ⋯ — never side by side with the thing he presses
 * twenty times a day.
 */

export type OrderAction = {
  key: string;
  label: string;
  danger?: boolean;
  onSelect: () => void;
};

/** Said in place of a button when the order has nowhere left to go. */
export function nothingMoreToDo(order: AdminOrder): string {
  switch (order.status) {
    case "delivered":
      return `Delivered on ${formatAdminDate(order.placedAt)}. Nothing more to do.`;
    case "cancelled":
      return "This order was cancelled. Nothing more to do.";
    case "refunded":
      return "The money went back. Nothing more to do.";
    default:
      return "Nothing more to do here.";
  }
}

/**
 * What the money on this order is doing, in one line.
 *
 * Always the server's sentence when there is one — the same OrderMoneyService
 * figure the list row and the bill were built from, so the three can never
 * disagree. The fallback is for the demo shop, which has no server to ask.
 */
function moneyLine(order: AdminOrder): string {
  // `detail` ships on the wire beside `sentence` (OrderMoneyService::detail) and
  // is read through a cast only because AdminOrder["money"] lives in a file this
  // pass does not own. Adding `detail: string` to that type deletes this line.
  const detail = (order.money as { detail?: string } | undefined)?.detail;
  if (detail) return detail;
  if (order.money?.sentence) return order.money.sentence;
  return order.payment === "COD"
    ? `Cash on delivery — collect ${order.total} at the door`
    : `Paid online — ${order.total}`;
}

export function OrderAnswerBar({
  order,
  primary,
  more = [],
  codeSent,
  busy,
  note,
}: {
  order: AdminOrder;
  primary: OrderAction | null;
  more?: OrderAction[];
  codeSent?: boolean;
  busy?: boolean;
  /** An inline reason shown where an action would be, when there isn't one. */
  note?: string | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocument(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocument);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocument);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div className="z-20 mb-4 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(17,17,19,0.03)] lg:sticky lg:top-20">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr_auto] lg:items-center">
        <p className="text-sm font-semibold tracking-[-0.02em] text-[#1D1D1F]">{moneyLine(order)}</p>

        <OrderStatusRail order={order} codeSent={codeSent} />

        <div className="flex items-center justify-start gap-2 lg:justify-end">
          {primary ? (
            <button
              type="button"
              disabled={busy}
              onClick={primary.onSelect}
              className="h-10 min-w-[8rem] rounded-xl bg-[#1D1D1F] px-4 text-xs font-semibold text-white transition hover:bg-[#2C2C2E] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
            >
              {primary.label}
            </button>
          ) : (
            <p className="text-xs text-[#6E6E73]">{note ?? nothingMoreToDo(order)}</p>
          )}

          {more.length > 0 ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="More actions"
                onClick={() => setMenuOpen((open) => !open)}
                className="h-10 w-10 rounded-xl border border-black/10 text-sm font-semibold text-[#1D1D1F] hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
              >
                ⋯
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-xl border border-black/[0.08] bg-white py-1 shadow-[0_12px_32px_rgba(17,17,19,0.14)]"
                >
                  {more.map((action) => (
                    <button
                      key={action.key}
                      type="button"
                      role="menuitem"
                      disabled={busy}
                      onClick={() => {
                        setMenuOpen(false);
                        action.onSelect();
                      }}
                      className={`block w-full px-3 py-2 text-left text-xs font-semibold disabled:opacity-50 hover:bg-[#FAFAFB] ${
                        action.danger ? "text-[#B42318]" : "text-[#1D1D1F]"
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {primary && note ? <p className="mt-2 text-[11px] text-[#86868B]">{note}</p> : null}
    </div>
  );
}

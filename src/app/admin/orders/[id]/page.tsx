"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { OrderAnswerBar, type OrderAction } from "@/components/admin/OrderAnswerBar";
import { OrderAutosaveField } from "@/components/admin/OrderAutosaveField";
import { OrderItemsCard, type ResendState } from "@/components/admin/OrderItemsCard";
import {
  OrderCustomerCard,
  OrderMoneyCard,
  OrderPrintCard,
} from "@/components/admin/OrderSideCards";
import { OrderTimeline } from "@/components/admin/OrderTimeline";
import {
  formatInr,
  type AdminOrder,
  type AdminOrderStatus,
} from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { refundOrder, updateOrderNotes, updateOrderStatus, updateOrderTracking } from "@/lib/adminStore";
import { adminErrorMessage } from "@/lib/adminError";
import { api, isApiEnabled, type ApiDigitalCode } from "@/lib/apiClient";
import { resendOrderCodes } from "@/lib/adminOrderCodes";
import { mapApiOrderToAdmin } from "@/lib/apiMappers";
import { formatAdminDate, formatAdminDateTime } from "@/lib/adminFormat";
import { can } from "@/lib/adminPermissions";

/**
 * One order, restructured around the question he opens it with.
 *
 * It used to open with a status word, a paragraph explaining our print CSS, a
 * packing-slip mock-up of the items, a fabricated tax panel, and a column of
 * five equally-weighted buttons — one of which sent money out of the shop. The
 * first thing on it was never the first thing he needed.
 *
 * Now: one sentence about the money, one rail showing what has happened and what
 * has not, one button for the next move, and everything irreversible behind the
 * ⋯ beside it. The four cards on the right each answer one question.
 */

/**
 * Demo-mode fallback only — the server sends `next.allowed` on every order and
 * that is what the screen uses when the API is on. Kept because mock mode has no
 * server to ask, and deliberately NOT relied on: it is missing `payment_failed`,
 * which is exactly the drift that made a failed-payment order look finished.
 */
const nextActions: Partial<Record<AdminOrderStatus, AdminOrderStatus[]>> = {
  payment_failed: ["cancelled"],
  pending_payment: ["cancelled"],
  pending: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  paid: ["packed", "cancelled"],
  packed: ["shipped"],
  shipped: ["delivered"],
  preorder: ["confirmed", "cancelled"],
  delivered: [],
};

/** Mock-mode only. In API mode the button label comes from `next.primary`. */
const MOCK_PRIMARY: Partial<Record<AdminOrderStatus, { status: AdminOrderStatus; label: string }>> = {
  pending: { status: "confirmed", label: "Accept" },
  preorder: { status: "confirmed", label: "Accept" },
  confirmed: { status: "packed", label: "Packed" },
  paid: { status: "packed", label: "Packed" },
  packed: { status: "shipped", label: "Sent" },
  shipped: { status: "delivered", label: "Delivered" },
};

/**
 * The server writes history for itself: "Status set to packed". He is not the
 * server. The words here are the same ones on the rail, so the step that lit up
 * and the line that recorded it say the same thing.
 */
const HISTORY_WORDS: Record<string, string> = {
  pending: "Waiting for your OK",
  pending_payment: "Waiting for payment",
  payment_failed: "Payment failed",
  confirmed: "Accepted",
  paid: "Paid",
  packed: "Packed",
  shipped: "Sent",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Money sent back",
  preorder: "Waiting for release",
};

function historyLabel(label: string): string {
  const match = /^Status set to (\w+)$/.exec(label);
  return match ? (HISTORY_WORDS[match[1]] ?? label) : label;
}

type Notice = { tone: "info" | "demo" | "error"; text: string };

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const store = useAdminStore();
  const apiOn = isApiEnabled();
  const [apiOrder, setApiOrder] = useState<AdminOrder | null>(null);
  const [numericOrderId, setNumericOrderId] = useState<number | null>(null);
  const [codes, setCodes] = useState<ApiDigitalCode[]>([]);
  const [labelUrl, setLabelUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(apiOn);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [working, setWorking] = useState(false);
  const [resend, setResend] = useState<ResendState>({ kind: "idle" });
  const [courierLive, setCourierLive] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!apiOn) return;
    setLoading(true);
    try {
      const raw = await api.adminOrder(id);
      setApiOrder(mapApiOrderToAdmin(raw));
      const nid = Number(raw.id);
      setNumericOrderId(Number.isFinite(nid) && nid > 0 ? nid : null);
      // The courier's own label, kept by the API since the pickup was booked —
      // it used to be returned once and forgotten, so the label survived only as
      // long as the screen he booked it from.
      const meta = (raw.meta as Record<string, unknown> | null) ?? null;
      setLabelUrl(typeof meta?.label_url === "string" ? meta.label_url : null);
      setLoadError(null);
    } catch (err) {
      setApiOrder(null);
      setNumericOrderId(null);
      setLoadError(adminErrorMessage(err, "Could not open this order."));
    } finally {
      setLoading(false);
    }
  }, [apiOn, id]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (!apiOn || numericOrderId == null) {
      setCodes([]);
      return;
    }
    let cancelled = false;
    void api
      .adminDigitalCodes({ order_id: numericOrderId, per_page: 100 })
      .then((res) => {
        if (!cancelled) setCodes(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) setCodes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [apiOn, numericOrderId]);

  const localOrder = useMemo(
    () => store.orders.find((o) => o.id === id) ?? null,
    [store.orders, id],
  );
  const order = apiOn ? apiOrder : localOrder;
  const status = order?.status;

  // Only asked at the stage where booking a pickup is a thing he could do, and
  // silence means no courier: the button then says `Sent` and he types the
  // number, which is what every shop without an integration does anyway.
  useEffect(() => {
    if (!apiOn || !status || !["confirmed", "paid", "packed"].includes(status)) return;
    let cancelled = false;
    void api
      .integrations()
      .then((res) => {
        // By id, not by category. The category field existed for tabs that were
        // removed long ago and is no longer sent at all; there is exactly one
        // courier company, so naming it is both simpler and more exact than
        // asking which bucket it was filed under.
        const courier = (res.data ?? []).find((i) => i.id === "shiprocket" && i.enabled);
        if (!cancelled) setCourierLive(courier?.driver === "live");
      })
      .catch(() => {
        if (!cancelled) setCourierLive(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiOn, status]);

  if (apiOn && loading) {
    return (
      <div>
        <AdminPageHeader
          title={id}
          description="Opening this order…"
          breadcrumbs={[{ label: "Orders", href: "/admin/orders" }, { label: id }]}
        />
        <div className="h-40 animate-pulse rounded-2xl border border-black/[0.06] bg-white" />
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <AdminPageHeader
          title="This order isn't here"
          description={loadError ?? "Nothing in the shop has that order number."}
          breadcrumbs={[{ label: "Orders", href: "/admin/orders" }, { label: id }]}
          actions={
            <Link
              href="/admin/orders"
              className="inline-flex h-8 items-center rounded-md border border-black/10 bg-white px-3 text-xs font-semibold"
            >
              All orders
            </Link>
          }
        />
      </div>
    );
  }

  const money = order.money;
  const refundable = money?.refundable ?? 0;
  const allowed = (order.next?.allowed as AdminOrderStatus[] | undefined)
    ?? nextActions[order.status]
    ?? [];
  const serverPrimary = order.next?.primary ?? null;
  const primaryStatus = (serverPrimary?.status ?? MOCK_PRIMARY[order.status]?.status ?? null) as
    | AdminOrderStatus
    | null;
  const primaryLabel = serverPrimary?.label ?? MOCK_PRIMARY[order.status]?.label ?? null;
  const codeSent = codes.some((c) => c.assigned_at);

  async function persistStatus(next: AdminOrderStatus) {
    if (working) return;
    setWorking(true);
    if (apiOn) {
      try {
        await api.patchOrderStatus(id, { status: next });
        setNotice({ tone: "info", text: `Marked ${HISTORY_WORDS[next]?.toLowerCase() ?? next}.` });
        await loadOrder();
      } catch (err) {
        setNotice({ tone: "error", text: adminErrorMessage(err, "That didn't go through.") });
      }
    } else {
      updateOrderStatus(id, next, next === "delivered" ? { cashCollected: true } : undefined);
      setNotice({ tone: "info", text: `Marked ${HISTORY_WORDS[next]?.toLowerCase() ?? next}.` });
    }
    setWorking(false);
  }

  /** Book the pickup and move the order in one press — one job, one button. */
  async function bookCourier() {
    if (working) return;
    setWorking(true);
    try {
      const res = await api.adminCreateShipment(id);
      if (typeof res.label_url === "string" && res.label_url) setLabelUrl(res.label_url);
      setNotice(
        res.simulated
          ? {
              tone: "demo",
              // H3: the sentence says what really happened, in the same sentence.
              text: `Courier ${res.awb || "booking"} written down, but the courier account is in practice mode — no pickup has actually been booked.`,
            }
          : { tone: "info", text: `Pickup booked. Courier tracking number ${res.awb}.` },
      );
      await loadOrder();
    } catch (err) {
      setNotice({ tone: "error", text: adminErrorMessage(err, "The courier didn't take it.") });
    }
    setWorking(false);
  }

  const bookAndSend = courierLive && primaryStatus === "shipped";
  const primary: OrderAction | null = primaryStatus && primaryLabel
    ? {
        key: primaryStatus,
        label: bookAndSend
          ? "Book courier pickup & mark sent"
          : primaryStatus === "delivered" && order.payment === "COD"
            ? "Delivered — cash collected"
            : primaryLabel,
        onSelect: () => (bookAndSend ? void bookCourier() : void persistStatus(primaryStatus)),
      }
    : null;

  const more: OrderAction[] = [];
  if (courierLive && ["confirmed", "paid"].includes(order.status)) {
    more.push({ key: "courier", label: "Book courier pickup", onSelect: () => void bookCourier() });
  }
  // Money before status: RefundService excludes the cash-on-delivery leg, so a
  // pure cash order has nothing to send back however far along it is. Checked at
  // render, not on press, so he is never offered a button that will refuse him.
  if (refundable > 0 && can("orders.refund")) {
    more.push({
      key: "refund",
      label: `Send back ${formatInr(refundable)}`,
      danger: true,
      onSelect: () => setConfirmRefund(true),
    });
  }
  if (allowed.includes("cancelled")) {
    more.push({
      key: "cancel",
      label: order.payment === "COD" ? "Turn down this order" : "Cancel order",
      danger: true,
      onSelect: () => setConfirmCancel(true),
    });
  }

  const barNote =
    order.status === "pending_payment"
      ? "Waiting for the money to come in. Nothing to do here yet."
      : order.status === "payment_failed"
        ? "The payment didn't go through. Turn the order down if the customer isn't paying another way."
        : null;

  // Said out loud rather than hidden: an action that is missing for a reason he
  // can act on should tell him the reason. A control that quietly is not there
  // reads as a screen with a bug in it.
  const moneyNotes: string[] = [];
  if (refundable > 0 && !can("orders.refund")) {
    moneyNotes.push("Only the owner can send money back.");
  }
  if (refundable === 0 && money && money.amountPaid === 0) {
    moneyNotes.push("Cash order — nothing was paid online, so there's nothing to send back here.");
  }
  if (!allowed.includes("cancelled") && ["packed", "shipped"].includes(order.status)) {
    const instead = refundable > 0 ? " Send the money back instead." : "";
    moneyNotes.push(
      order.status === "shipped"
        ? `This one has already gone out, so it can't be cancelled.${instead}`
        : `This one is packed and can only move forward now.${instead}`,
    );
  }

  async function saveTracking(next: string) {
    if (!apiOn) {
      updateOrderTracking(id, next);
      return;
    }
    try {
      await api.patchOrderStatus(id, { status: order!.status, tracking: next });
      await loadOrder();
    } catch (err) {
      throw new Error(adminErrorMessage(err, "It didn't save."));
    }
  }

  async function saveNote(next: string) {
    if (!apiOn) {
      updateOrderNotes(id, next);
      return;
    }
    try {
      await api.patchOrderStatus(id, { status: order!.status, notes: next });
      await loadOrder();
    } catch (err) {
      throw new Error(adminErrorMessage(err, "It didn't save."));
    }
  }

  async function sendCodesAgain() {
    setResend({ kind: "sending" });
    try {
      const res = await resendOrderCodes(id);
      setResend({ kind: "sent", at: new Date(res.at), mobile: res.mobile });
      await loadOrder();
    } catch (err) {
      setResend({
        kind: "failed",
        message: adminErrorMessage(err, "The code didn't go out again."),
      });
    }
  }

  return (
    <div>
      <AdminPageHeader
        title={order.id}
        description={`Placed ${formatAdminDateTime(order.placedAt)}`}
        breadcrumbs={[{ label: "Orders", href: "/admin/orders" }, { label: order.id }]}
        actions={
          <Link
            href="/admin/orders"
            className="inline-flex h-8 items-center rounded-md border border-black/10 bg-white px-3 text-xs font-semibold"
          >
            All orders
          </Link>
        }
      />

      {/* Kept on the page, never a toast: what happened to money and to a
          customer has to still be here when he looks up from the counter. */}
      {notice ? <AdminNotice tone={notice.tone}>{notice.text}</AdminNotice> : null}
      {loadError ? <AdminNotice tone="error">{loadError}</AdminNotice> : null}

      <OrderAnswerBar
        order={order}
        primary={primary}
        more={more}
        codeSent={codeSent}
        busy={working}
        note={barNote}
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <OrderItemsCard
            order={order}
            codes={codes}
            resend={resend}
            onResend={apiOn ? () => void sendCodesAgain() : undefined}
          />

          <section className="rounded-2xl border border-black/[0.06] bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold tracking-[-0.02em]">History</h2>
            <OrderTimeline
              events={order.timeline.map((event) => ({
                ...event,
                label: historyLabel(event.label),
              }))}
            />
          </section>
        </div>

        <aside className="space-y-3">
          <OrderCustomerCard order={order} />
          <OrderMoneyCard order={order} notes={moneyNotes} />

          <div className="space-y-3 rounded-2xl border border-black/[0.06] bg-white p-4">
            <h2 className="text-xs font-semibold tracking-[-0.01em] text-[#1D1D1F]">Delivery</h2>
            {order.carrierName ? (
              <p className="text-xs text-[#6E6E73]">{order.carrierName}</p>
            ) : null}
            <OrderAutosaveField
              label="Courier tracking number"
              value={order.tracking ?? ""}
              placeholder="e.g. 4419xxxxxx"
              onSave={saveTracking}
            />
            {order.trackingUrl ? (
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex text-xs font-semibold text-[#424245] hover:underline"
              >
                Track this parcel →
              </a>
            ) : null}
            {order.eta ? (
              <p className="text-xs text-[#6E6E73]">Expected {formatAdminDate(order.eta)}</p>
            ) : null}
          </div>

          <OrderPrintCard order={order} labelUrl={labelUrl} />

          <div className="rounded-2xl border border-black/[0.06] bg-white p-4">
            <OrderAutosaveField
              label="Note to self"
              value={order.notes ?? ""}
              multiline
              helper="Only you can see this. The customer never does."
              onSave={saveNote}
            />
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title={`Cancel order ${order.id}?`}
        // `stockDeducted` is never set by the API mapper, so in live mode this
        // always printed "No stock was reserved yet" — while the server restocked
        // every item. It said the opposite of what happened, every time.
        description="The items go back into your stock straight away. Anything already paid online is NOT sent back — use Send the money back for that."
        confirmLabel="Cancel order"
        cancelLabel="Keep this order"
        danger
        onConfirm={() => {
          setConfirmCancel(false);
          void persistStatus("cancelled");
        }}
        onCancel={() => setConfirmCancel(false)}
      />

      <ConfirmDialog
        open={confirmRefund}
        title={`Send ${formatInr(refundable)} back to ${order.customerName}?`}
        description={`${formatInr(refundable)} goes back to the card or UPI it was paid with, usually in 3–5 working days. A full refund also puts the items back into your stock and closes the order.`}
        confirmLabel={`Send back ${formatInr(refundable)}`}
        cancelLabel="Don't send"
        danger
        onConfirm={() => {
          setConfirmRefund(false);
          if (!apiOn) {
            refundOrder(order.id);
            setNotice({ tone: "demo", text: "Refund written down in the practice shop only." });
            return;
          }
          setWorking(true);
          void api
            .adminRefundOrder(id)
            .then(async (res) => {
              setNotice(
                res.simulated
                  ? {
                      tone: "demo",
                      text: `No payment provider is live yet — the refund is written down, but no money has left your account. ${order.customerName} has not been paid back.`,
                    }
                  : {
                      tone: "info",
                      text: res.full
                        ? `${formatInr(refundable)} is on its way back to ${order.customerName}.`
                        : `Part of the money is on its way back to ${order.customerName}.`,
                    },
              );
              await loadOrder();
            })
            .catch((err) =>
              setNotice({
                tone: "error",
                text: adminErrorMessage(err, "The money did not go back."),
              }),
            )
            .finally(() => setWorking(false));
        }}
        onCancel={() => setConfirmRefund(false)}
      />
    </div>
  );
}

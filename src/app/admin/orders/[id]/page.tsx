"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { OrderTimeline } from "@/components/admin/OrderTimeline";
import { OrderTaxInvoicePanel } from "@/components/admin/OrderTaxInvoicePanel";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  formatInr,
  maskDigitalCode,
  orderStatusLabels,
  parsePrice,
  type AdminOrder,
  type AdminOrderStatus,
} from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useAutoBanner } from "@/hooks/useAutoBanner";
import {
  assignDigitalCodeToOrder,
  refundOrder,
  updateOrderNotes,
  updateOrderStatus,
  updateOrderTracking,
} from "@/lib/adminStore";
import { api, isApiEnabled } from "@/lib/apiClient";
import { mapApiOrderToAdmin } from "@/lib/apiMappers";
import { formatAdminDateTime } from "@/lib/adminFormat";
import { formatMobileDisplay } from "@/lib/auth";
import { can } from "@/lib/adminPermissions";

const nextActions: Partial<Record<AdminOrderStatus, AdminOrderStatus[]>> = {
  pending_payment: ["cancelled"],
  pending: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  paid: ["packed", "cancelled"],
  packed: ["shipped"],
  shipped: ["delivered"],
  preorder: ["confirmed", "cancelled"],
  delivered: [],
};

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const store = useAdminStore();
  const apiOn = isApiEnabled();
  const [apiOrder, setApiOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(apiOn);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    if (!apiOn) return;
    setLoading(true);
    try {
      const raw = await api.adminOrder(id);
      setApiOrder(mapApiOrderToAdmin(raw));
      setLoadError(null);
    } catch (err) {
      setApiOrder(null);
      setLoadError(err instanceof Error ? err.message : "Could not load order");
    } finally {
      setLoading(false);
    }
  }, [apiOn, id]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const localOrder = useMemo(() => store.orders.find((o) => o.id === id) ?? null, [store.orders, id]);
  const order = apiOn ? apiOrder : localOrder;
  const [metaId, setMetaId] = useState(order?.id ?? null);
  const [tracking, setTracking] = useState(order?.tracking ?? "");
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [savedMsg, setSavedMsg] = useAutoBanner();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<AdminOrderStatus | null>(null);
  const [revealedCode, setRevealedCode] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (order && order.id !== metaId) {
    setMetaId(order.id);
    setTracking(order.tracking ?? "");
    setNotes(order.notes ?? "");
  }

  useEffect(() => {
    if (!copiedId) return;
    const t = window.setTimeout(() => setCopiedId(null), 2000);
    return () => window.clearTimeout(t);
  }, [copiedId]);

  if (apiOn && loading) {
    return (
      <div>
        <AdminPageHeader
          title={id}
          description="Loading order…"
          breadcrumbs={[
            { label: "Orders", href: "/admin/orders" },
            { label: id },
          ]}
        />
        <div className="h-40 animate-pulse rounded-2xl border border-black/[0.06] bg-white" />
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <AdminPageHeader
          title="Order not found"
          description={loadError ?? "That order ID is not in the admin store."}
          breadcrumbs={[
            { label: "Orders", href: "/admin/orders" },
            { label: id },
          ]}
          actions={
            <Link
              href="/admin/orders"
              className="inline-flex h-8 items-center rounded-md border border-black/10 bg-white px-3 text-xs font-semibold"
            >
              Back
            </Link>
          }
        />
      </div>
    );
  }

  const actions = nextActions[order.status] ?? [];
  const digitalLines = order.items.filter((item) => item.fulfillmentType === "digital");
  const assignedCodes = store.digitalCodes.filter((c) => c.assignedOrderId === order.id);
  const availableForLines = store.digitalCodes.filter((code) => {
    if (code.status !== "available") return false;
    return digitalLines.some(
      (line) =>
        code.productKey === line.productKey ||
        code.productName.toLowerCase().includes(line.name.toLowerCase().slice(0, 12)),
    );
  });

  function persistStatus(next: AdminOrderStatus) {
    if (apiOn) {
      void api
        .patchOrderStatus(id, { status: next })
        .then(() => {
          setSavedMsg(`Status → ${orderStatusLabels[next]}`);
          return loadOrder();
        })
        .catch((err) =>
          setSavedMsg(err instanceof Error ? `Could not update: ${err.message}` : "Could not update"),
        );
      return;
    }
    updateOrderStatus(id, next, next === "delivered" ? { cashCollected: true } : undefined);
    setSavedMsg(`Status → ${orderStatusLabels[next]}`);
  }

  function applyStatus(next: AdminOrderStatus) {
    if (next === "cancelled") {
      setPendingStatus(next);
      setConfirmCancel(true);
      return;
    }
    persistStatus(next);
  }

  function confirmCancelAction() {
    if (pendingStatus) {
      persistStatus(pendingStatus);
    }
    setConfirmCancel(false);
    setPendingStatus(null);
  }

  function saveMeta(event: React.FormEvent) {
    event.preventDefault();
    if (apiOn && order) {
      void api
        .patchOrderStatus(id, { status: order.status, tracking, notes })
        .then(() => {
          setSavedMsg("Tracking & notes saved");
          return loadOrder();
        })
        .catch((err) =>
          setSavedMsg(err instanceof Error ? `Could not save: ${err.message}` : "Could not save"),
        );
      return;
    }
    updateOrderTracking(id, tracking);
    updateOrderNotes(id, notes);
    setSavedMsg("Tracking & notes saved");
  }

  async function copyCode(codeId: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(codeId);
      setSavedMsg("Code copied");
    } catch {
      setSavedMsg("Could not copy — reveal and copy manually");
    }
  }

  return (
    <div className="admin-print-packing">
      <AdminPageHeader
        title={order.id}
        description={`Placed ${formatAdminDateTime(order.placedAt)} · ${order.city}`}
        breadcrumbs={[
          { label: "Orders", href: "/admin/orders" },
          { label: order.id },
        ]}
        actions={
          <div className="admin-print-hide flex flex-wrap items-center gap-2">
            <StatusBadge kind="order" status={order.status} />
            <Link
              href="/admin/orders"
              className="inline-flex h-8 items-center rounded-md border border-black/10 bg-white px-3 text-xs font-semibold"
            >
              All orders
            </Link>
          </div>
        }
      />

      <div className="admin-print-hide mb-3 rounded-xl border border-dashed border-black/[0.1] bg-[#FAFAFB] px-3 py-2 text-[11px] text-[#6E6E73]">
        Print packing slip hides navigation and status actions — only lines, ship-to, and totals remain.
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <section className="admin-print-slip overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
            <div className="flex items-center justify-between border-b border-black/[0.05] bg-[#F7F7F8] px-4 py-2.5">
              <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
                Packing slip · {order.id}
              </span>
              <span className="text-[11px] text-[#86868B]">{formatAdminDateTime(order.placedAt)}</span>
            </div>
            <div className="border-b border-black/[0.05] px-4 py-2.5 text-xs text-[#6E6E73]">
              Line items · {order.items.length}
            </div>
            <ul className="divide-y divide-black/[0.05]">
              {order.items.map((item) => (
                <li
                  key={`${item.productKey}-${item.sku}`}
                  className="grid gap-3 p-4 sm:grid-cols-[64px_1fr_auto] sm:items-center"
                >
                  <div className="admin-print-hide relative aspect-square overflow-hidden rounded-md bg-[#F7F7F8]">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-contain p-1.5"
                        sizes="64px"
                      />
                    ) : null}
                  </div>
                  <div>
                    <div className="ez-mono text-[9px] uppercase tracking-[0.12em] text-[#86868B]">
                      {item.brand} · {item.sku} · {item.fulfillmentType}
                    </div>
                    <h2 className="mt-0.5 text-sm font-semibold tracking-[-0.02em]">{item.name}</h2>
                    <p className="mt-0.5 text-[11px] text-[#86868B]">
                      Qty {item.qty}
                      {item.productKey ? (
                        <span className="admin-print-hide">
                          {" · "}
                          <Link
                            href={`/admin/products/${encodeURIComponent(item.productKey)}/edit`}
                            className="font-semibold text-[#424245] hover:underline"
                          >
                            Edit SKU
                          </Link>
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="ez-mono text-xs font-medium">{item.price}</div>
                </li>
              ))}
            </ul>
          </section>

          {digitalLines.length > 0 ? (
            <section className="admin-print-hide rounded-2xl border border-black/[0.06] bg-white p-4">
              <h2 className="mb-1 text-sm font-semibold tracking-[-0.02em]">Digital fulfillment</h2>
              <p className="mb-3 text-xs text-[#86868B]">
                Assign vault codes to this order. Digital lines do not decrement physical stock.
              </p>
              {apiOn ? (
                <AdminNotice tone="demo">
                  The code vault runs on local demo data — assignments are not saved to the API yet.
                </AdminNotice>
              ) : null}

              {assignedCodes.length > 0 ? (
                <ul className="mb-3 space-y-2">
                  {assignedCodes.map((code) => (
                    <li
                      key={code.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-black/[0.06] bg-[#F7F7F8] px-3 py-2"
                    >
                      <div>
                        <div className="ez-mono text-[11px] font-medium">
                          {revealedCode === code.id ? code.code : maskDigitalCode(code.code)}
                        </div>
                        <div className="text-[11px] text-[#86868B]">{code.productName}</div>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedCode((prev) => (prev === code.id ? null : code.id))
                          }
                          className="h-7 rounded-md border border-black/10 px-2 text-[11px] font-semibold"
                        >
                          {revealedCode === code.id ? "Hide" : "Reveal"}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyCode(code.id, code.code)}
                          className="h-7 rounded-md border border-black/10 px-2 text-[11px] font-semibold"
                        >
                          {copiedId === code.id ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}

              {availableForLines.length > 0 ? (
                <ul className="space-y-2">
                  {availableForLines.map((code) => (
                    <li
                      key={code.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-black/[0.1] px-3 py-2"
                    >
                      <div>
                        <div className="ez-mono text-[11px]">{maskDigitalCode(code.code)}</div>
                        <div className="text-[11px] text-[#86868B]">{code.productName}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (apiOn) {
                            setSavedMsg("Code vault isn't wired to the API yet — not saved");
                            return;
                          }
                          assignDigitalCodeToOrder(code.id, order.id);
                          setSavedMsg("Code assigned to order");
                        }}
                        className="h-7 rounded-md bg-[#1D1D1F] px-2.5 text-[11px] font-semibold text-white"
                      >
                        Assign
                      </button>
                    </li>
                  ))}
                </ul>
              ) : assignedCodes.length === 0 ? (
                <p className="text-sm text-[#86868B]">
                  No matching available codes.{" "}
                  <Link href="/admin/digital-codes" className="font-semibold text-[#424245]">
                    Open vault →
                  </Link>
                </p>
              ) : null}
            </section>
          ) : null}

          <section className="admin-print-hide rounded-2xl border border-black/[0.06] bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold tracking-[-0.02em]">Timeline</h2>
            <OrderTimeline events={order.timeline} />
          </section>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <div className="admin-print-hide rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(17,17,19,0.03)]">
            <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
              Status actions
            </span>
            {actions.length > 0 ? (
              <div className="mt-3 flex flex-col gap-1.5">
                {actions.map((next) => (
                  <button
                    key={next}
                    type="button"
                    onClick={() => applyStatus(next)}
                    className={`h-9 rounded-xl px-3 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] ${
                      next === "cancelled"
                        ? "border border-[#F5C2C0] text-[#B42318] hover:bg-[#FFF5F5]"
                        : "bg-[#1D1D1F] text-white hover:bg-[#2C2C2E]"
                    }`}
                  >
                    {next === "confirmed" && order.payment === "COD"
                      ? "Confirm COD"
                      : next === "cancelled" && order.payment === "COD"
                        ? "Reject COD"
                        : next === "delivered" && order.payment === "COD"
                          ? "Deliver · collect cash"
                          : `Mark ${orderStatusLabels[next].toLowerCase()}`}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-[#86868B]">No further fulfillment actions.</p>
            )}
            {(["paid", "confirmed", "shipped", "delivered"] as AdminOrderStatus[]).includes(
              order.status,
            ) ? (
              <button
                type="button"
                onClick={() => {
                  if (!can("orders.refund")) {
                    setSavedMsg("Your role cannot refund");
                    return;
                  }
                  setConfirmRefund(true);
                }}
                className="mt-2 h-9 w-full rounded-xl border border-[#F5C2C0] text-xs font-semibold text-[#B42318] hover:bg-[#FFF5F5]"
              >
                Record refund
              </button>
            ) : null}
            {apiOn &&
            (["confirmed", "paid", "packed"] as AdminOrderStatus[]).includes(order.status) ? (
              <button
                type="button"
                onClick={() => {
                  void api
                    .adminCreateShipment(id)
                    .then(() => {
                      setSavedMsg("Shipment created");
                      return loadOrder();
                    })
                    .catch((err) =>
                      setSavedMsg(
                        err instanceof Error
                          ? `Shipment failed: ${err.message}`
                          : "Shipment failed",
                      ),
                    );
                }}
                className="mt-2 h-9 w-full rounded-xl border border-black/10 text-xs font-semibold"
              >
                Create shipment
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => window.print()}
              className="mt-2 h-9 w-full rounded-xl border border-black/10 text-xs font-semibold"
            >
              Print packing slip
            </button>
          </div>

          <div className="admin-print-slip rounded-2xl border border-black/[0.06] bg-white p-4">
            <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
              Customer
            </span>
            <div className="mt-2 text-sm font-semibold tracking-[-0.02em]">{order.customerName}</div>
            <div className="ez-mono mt-1 text-[11px] text-[#86868B]">
              {formatMobileDisplay(order.customerMobile)}
            </div>
            <div className="mt-2 text-xs text-[#6E6E73]">{order.city}</div>
            <div className="mt-3 rounded-xl bg-[#F7F7F8] px-3 py-2 text-xs text-[#424245]">
              <div className="ez-mono mb-1 text-[9px] uppercase tracking-[0.12em] text-[#86868B]">
                Ship to
              </div>
              <div>{order.addressLine1 ?? `${order.customerName}`}</div>
              <div>{order.addressLine2 ?? order.city}</div>
              <div className="ez-mono mt-0.5">{order.pincode ?? "—"} · {order.city}</div>
            </div>
            {order.customerId ? (
              <Link
                href={`/admin/customers/${order.customerId}`}
                className="admin-print-hide mt-3 inline-flex text-xs font-semibold text-[#424245]"
              >
                View customer →
              </Link>
            ) : null}
          </div>

          <div className="admin-print-slip rounded-2xl border border-black/[0.06] bg-white p-4">
            <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
              Payment
            </span>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <span className="text-xl font-semibold tracking-[-0.04em]">{order.total}</span>
              <span className="text-xs text-[#6E6E73]">{order.payment}</span>
            </div>
            {order.payment === "COD" && order.cashCollected ? (
              <p className="mt-2 text-[11px] font-medium text-[#2D6B3C]">Cash collected</p>
            ) : null}
            {order.status === "refunded" ? (
              <p className="mt-2 text-[11px] font-medium text-[#9F1239]">
                Refunded {formatInr(order.refundAmount ?? parsePrice(order.total))}
              </p>
            ) : null}
            {order.stockDeducted ? (
              <p className="mt-1 text-[11px] text-[#86868B]">Stock reserved in ledger</p>
            ) : null}
          </div>

          <div className="admin-print-hide">
            <OrderTaxInvoicePanel order={order} />
          </div>

          <form
            onSubmit={saveMeta}
            className="admin-print-hide space-y-3 rounded-2xl border border-black/[0.06] bg-white p-4"
          >
            <Field label="Tracking">
              <input
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                className="w-full rounded-xl border border-black/[0.08] bg-[#F7F7F8] px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
                placeholder="Carrier AWB"
              />
            </Field>
            <Field label="Notes">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-black/[0.08] bg-[#F7F7F8] px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
              />
            </Field>
            <button
              type="submit"
              className="h-9 w-full rounded-xl border border-black/10 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
            >
              Save tracking / notes
            </button>
          </form>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel this order?"
        description={
          order.stockDeducted
            ? "Stock reserved for physical lines will be restocked via the ledger."
            : "This order will be marked cancelled. No stock was reserved yet."
        }
        confirmLabel="Cancel order"
        danger
        onConfirm={confirmCancelAction}
        onCancel={() => {
          setConfirmCancel(false);
          setPendingStatus(null);
        }}
      />
      <ConfirmDialog
        open={confirmRefund}
        title="Refund via payment provider?"
        description={`Refunds ${order.total} through Razorpay/Cashfree and restocks when the refund is full. Partial amounts can be sent from the API.`}
        confirmLabel="Refund"
        danger
        onConfirm={() => {
          if (apiOn) {
            void api
              .adminRefundOrder(id)
              .then((res) => {
                setSavedMsg(
                  res.full
                    ? res.simulated
                      ? "Full refund recorded (simulated)"
                      : "Full refund submitted to the provider"
                    : "Partial refund recorded",
                );
                return loadOrder();
              })
              .catch((err) =>
                setSavedMsg(
                  err instanceof Error ? `Could not refund: ${err.message}` : "Could not refund",
                ),
              );
          } else {
            refundOrder(order.id);
            setSavedMsg("Refund recorded (local demo)");
          }
          setConfirmRefund(false);
        }}
        onCancel={() => setConfirmRefund(false)}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="ez-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#86868B]">
        {label}
      </span>
      {children}
    </label>
  );
}

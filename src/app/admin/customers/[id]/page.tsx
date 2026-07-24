"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  formatInr,
  type AdminCustomer,
  type AdminCustomerStatus,
  type AdminOrderStatus,
} from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useAutoBanner } from "@/hooks/useAutoBanner";
import { updateCustomer } from "@/lib/adminStore";
import { api, isApiEnabled, type ApiCustomerDetail } from "@/lib/apiClient";
import { formatMobileDisplay } from "@/lib/auth";

type OrderRow = { id: string; placedAt: string; total: string; status: string };

export default function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const apiOn = isApiEnabled();
  const store = useAdminStore();
  const [remote, setRemote] = useState<ApiCustomerDetail | null>(null);

  useEffect(() => {
    if (!apiOn) return;
    let cancelled = false;
    void api
      .adminCustomer(Number(id))
      .then((c) => {
        if (!cancelled) setRemote(c);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [apiOn, id]);

  const storeCustomer = useMemo(
    () => store.customers.find((c) => c.id === id) ?? null,
    [store.customers, id],
  );

  // Unified read view: API when live, else the local store.
  const customer: AdminCustomer | null = apiOn
    ? remote
      ? {
          id: String(remote.id),
          name: remote.name,
          mobile: remote.mobile ?? "",
          orders: remote.orders_count,
          spent: formatInr(remote.lifetime_value),
          lastOrderAt: remote.last_order_at ?? "—",
          city: "—",
          status: remote.lifetime_value >= 50000 ? "vip" : remote.orders_count > 0 ? "active" : "new",
          tags: remote.tags,
        }
      : null
    : storeCustomer;

  const orders: OrderRow[] = apiOn
    ? (remote?.orders ?? []).map((o) => ({
        id: o.public_id,
        placedAt: o.created_at ?? "",
        total: formatInr(o.total),
        status: o.status,
      }))
    : store.orders
        .filter((o) => o.customerId === id || o.customerMobile === storeCustomer?.mobile)
        .map((o) => ({ id: o.id, placedAt: o.placedAt, total: o.total, status: o.status }));
  const [notesId, setNotesId] = useState(customer?.id ?? null);
  const [notes, setNotes] = useState(customer?.notes ?? "");
  const [tagDraft, setTagDraft] = useState("");
  const [msg, setMsg] = useAutoBanner();
  const [banOpen, setBanOpen] = useState(false);

  if (customer && customer.id !== notesId) {
    setNotesId(customer.id);
    setNotes(customer.notes ?? "");
  }

  if (!customer) {
    return (
      <div>
        <AdminPageHeader
          title={apiOn && !remote ? "Loading customer…" : "Customer not found"}
          breadcrumbs={[
            { label: "Customers", href: "/admin/customers" },
            { label: id },
          ]}
          actions={
            <Link
              href="/admin/customers"
              className="inline-flex h-8 items-center rounded-md border border-black/10 bg-white px-3 text-xs font-semibold"
            >
              Back
            </Link>
          }
        />
      </div>
    );
  }

  function setStatus(status: AdminCustomerStatus) {
    updateCustomer(id, {
      status,
      banned: status === "banned",
    });
    setMsg(`Status → ${status}`);
  }

  function saveNotes(event: React.FormEvent) {
    event.preventDefault();
    updateCustomer(id, { notes });
    setMsg("Notes saved");
  }

  const isBanned = customer.status === "banned";

  return (
    <div>
      <AdminPageHeader
        title={customer.name}
        description={`${customer.id} · ${formatMobileDisplay(customer.mobile)} · ${customer.city}`}
        breadcrumbs={[
          { label: "Customers", href: "/admin/customers" },
          { label: customer.name },
        ]}
        actions={
          <>
            <StatusBadge kind="customer" status={customer.status} />
            <Link
              href="/admin/customers"
              className="inline-flex h-8 items-center rounded-md border border-black/10 bg-white px-3 text-xs font-semibold"
            >
              All customers
            </Link>
          </>
        }
      />

      {apiOn ? (
        <AdminNotice tone="demo">
          Profile &amp; orders are live from the API. VIP/ban/notes/tags edits are
          not yet persisted server-side (local only).
        </AdminNotice>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <section className="rounded-lg border border-black/[0.08] bg-white">
          <div className="border-b border-black/[0.05] bg-[#F7F7F8] px-4 py-2.5">
            <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
              Orders · {orders.length}
            </span>
          </div>
          <ul className="divide-y divide-black/[0.05]">
            {orders.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-[#86868B]">No orders linked.</li>
            ) : (
              orders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 hover:bg-[#F7F7F8]"
                  >
                    <div>
                      <div className="ez-mono text-[10px] font-semibold">{order.id}</div>
                      <div className="mt-0.5 text-xs text-[#86868B]">
                        {new Date(order.placedAt).toLocaleDateString("en-IN")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="ez-mono text-xs">{order.total}</span>
                      <StatusBadge kind="order" status={order.status as AdminOrderStatus} />
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        <aside className="space-y-3">
          <div className="rounded-lg border border-black/[0.08] bg-white p-4">
            <div className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
              Lifetime
            </div>
            <div className="mt-2 text-xl font-semibold tracking-[-0.04em]">{customer.spent}</div>
            <div className="mt-1 text-xs text-[#6E6E73]">{customer.orders} orders</div>
            <div className="mt-1 text-xs text-[#86868B]">Last · {customer.lastOrderAt}</div>
          </div>

          <div className="rounded-lg border border-black/[0.08] bg-white p-4">
            <div className="ez-mono mb-3 text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
              Tags
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(customer.tags ?? []).length === 0 ? (
                <span className="text-xs text-[#86868B]">No tags yet</span>
              ) : (
                (customer.tags ?? []).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      updateCustomer(customer.id, {
                        tags: (customer.tags ?? []).filter((t) => t !== tag),
                      });
                      setMsg(`Removed tag · ${tag}`);
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-[#F0F0F2] px-2.5 py-1 text-[11px] font-semibold text-[#424245] hover:bg-[#E8E8ED]"
                    title="Remove tag"
                  >
                    {tag}
                    <span aria-hidden>×</span>
                  </button>
                ))
              )}
            </div>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const next = tagDraft.trim().toLowerCase().replace(/\s+/g, "-");
                if (!next) return;
                const tags = [...new Set([...(customer.tags ?? []), next])];
                updateCustomer(customer.id, { tags });
                setTagDraft("");
                setMsg(`Added tag · ${next}`);
              }}
            >
              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                placeholder="Add tag"
                className="h-8 min-w-0 flex-1 rounded-md border border-black/[0.08] bg-[#F7F7F8] px-2.5 text-xs outline-none"
              />
              <button
                type="submit"
                className="h-8 shrink-0 rounded-md bg-[#1D1D1F] px-3 text-xs font-semibold text-white"
              >
                Add
              </button>
            </form>
          </div>

          <div className="rounded-lg border border-black/[0.08] bg-white p-4">
            <div className="ez-mono mb-3 text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
              Actions
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setStatus("vip")}
                className="h-8 rounded-md bg-[#1D1D1F] text-xs font-semibold text-white"
              >
                Mark VIP
              </button>
              <button
                type="button"
                onClick={() => setStatus("active")}
                className="h-8 rounded-md border border-black/10 text-xs font-semibold"
              >
                Mark active
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isBanned) setStatus("active");
                  else setBanOpen(true);
                }}
                className="h-8 rounded-md border border-[#F5C2C0] text-xs font-semibold text-[#B42318]"
              >
                {isBanned ? "Unban" : "Ban customer"}
              </button>
            </div>
          </div>

          <form
            onSubmit={saveNotes}
            className="space-y-2 rounded-lg border border-black/[0.08] bg-white p-4"
          >
            <label className="flex flex-col gap-1.5">
              <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
                Notes
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-black/[0.08] bg-[#F7F7F8] px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
              />
            </label>
            <button
              type="submit"
              className="h-8 w-full rounded-md border border-black/10 text-xs font-semibold"
            >
              Save notes
            </button>
          </form>
        </aside>
      </div>

      <ConfirmDialog
        open={banOpen}
        title="Ban this customer?"
        description="They will be marked banned in the CRM. You can unban later."
        confirmLabel="Ban customer"
        danger
        onConfirm={() => {
          setStatus("banned");
          setBanOpen(false);
        }}
        onCancel={() => setBanOpen(false)}
      />
    </div>
  );
}

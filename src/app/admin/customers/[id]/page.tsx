"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useAdminToast } from "@/components/admin/AdminToast";
import {
  formatInr,
  type AdminCustomer,
  type AdminOrderStatus,
} from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useStaffRole } from "@/hooks/useStaffRole";
import { formatAdminDate } from "@/lib/adminFormat";
import { can } from "@/lib/adminPermissions";
import { updateCustomer } from "@/lib/adminStore";
import { api, isApiEnabled, type ApiCustomerDetail } from "@/lib/apiClient";
import { formatMobileDisplay } from "@/lib/auth";
import { mapApiCustomer, VIP_TAG } from "../customerModel";

type OrderRow = { id: string; placedAt: string; total: string; status: string };
type CustomerPatch = { tags?: string[]; notes?: string | null; banned?: boolean };

export default function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const apiOn = isApiEnabled();
  const store = useAdminStore();
  const toast = useAdminToast();
  const { role } = useStaffRole();
  const canWrite = can("customers.write", role);
  const [remote, setRemote] = useState<ApiCustomerDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Every control writes the same record, so one in-flight flag is enough to
  // stop a second click racing the first.
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!apiOn) return;
    let cancelled = false;
    void api
      .adminCustomer(Number(id))
      .then((c) => {
        if (!cancelled) {
          setRemote(c);
          setLoadError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message || "Could not load this customer");
      });
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
      ? mapApiCustomer(remote)
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
  const [banOpen, setBanOpen] = useState(false);

  if (customer && customer.id !== notesId) {
    setNotesId(customer.id);
    setNotes(customer.notes ?? "");
  }

  if (!customer) {
    return (
      <div>
        <AdminPageHeader
          title={apiOn && !remote && !loadError ? "Loading customer…" : "Customer not found"}
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
        {loadError ? <AdminNotice tone="error">{loadError}</AdminNotice> : null}
      </div>
    );
  }

  /**
   * Single write path for every CRM control. It reports what actually happened:
   * a failed PATCH leaves the record alone and says so, instead of the old
   * local-only mock that always looked like it had worked.
   */
  function apply(patch: CustomerPatch, done: string) {
    if (!canWrite) {
      toast.push("Read-only role — ask an owner or manager", "warning");
      return;
    }
    if (!apiOn) {
      updateCustomer(id, patch as Partial<AdminCustomer>);
      toast.push(done, "success");
      return;
    }
    setSaving(true);
    void api
      .updateCustomer(Number(id), patch)
      .then((next) => {
        setRemote(next);
        toast.push(done, "success");
      })
      .catch((err) =>
        toast.push(
          err instanceof Error ? `Not saved — ${err.message}` : "Not saved — the change was rejected",
          "danger",
        ),
      )
      .finally(() => setSaving(false));
  }

  const tags = customer.tags ?? [];
  const isVip = tags.includes(VIP_TAG);
  const isBanned = customer.status === "banned";
  const controlsDisabled = saving || !canWrite;

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

      {apiOn && !canWrite ? (
        <AdminNotice tone="info">
          Your role can view customers but not edit them — tags, notes and ban are read-only here.
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
                        {formatAdminDate(order.placedAt)}
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
            <div className="mt-1 text-xs text-[#86868B]">
              Last · {formatAdminDate(customer.lastOrderAt, "No orders yet")}
            </div>
          </div>

          <div className="rounded-lg border border-black/[0.08] bg-white p-4">
            <div className="ez-mono mb-3 text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
              Tags
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.length === 0 ? (
                <span className="text-xs text-[#86868B]">No tags yet</span>
              ) : (
                tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    disabled={controlsDisabled}
                    onClick={() =>
                      apply({ tags: tags.filter((t) => t !== tag) }, `Removed tag · ${tag}`)
                    }
                    className="inline-flex items-center gap-1 rounded-full bg-[#F0F0F2] px-2.5 py-1 text-[11px] font-semibold text-[#424245] hover:bg-[#E8E8ED] disabled:opacity-40"
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
                setTagDraft("");
                apply({ tags: [...new Set([...tags, next])] }, `Added tag · ${next}`);
              }}
            >
              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                placeholder="Add tag"
                disabled={controlsDisabled}
                className="h-8 min-w-0 flex-1 rounded-md border border-black/[0.08] bg-[#F7F7F8] px-2.5 text-xs outline-none disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={controlsDisabled}
                className="h-8 shrink-0 rounded-md bg-[#1D1D1F] px-3 text-xs font-semibold text-white disabled:opacity-40"
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
              {/*
                VIP is the `vip` tag and Banned is the `banned` column — the two
                states an operator can actually set. "Active" and "New" are read
                off order history, so there is no button for them.
              */}
              <button
                type="button"
                disabled={controlsDisabled}
                onClick={() =>
                  isVip
                    ? apply({ tags: tags.filter((t) => t !== VIP_TAG) }, "VIP removed")
                    : apply({ tags: [...new Set([...tags, VIP_TAG])] }, "Marked VIP")
                }
                className="h-8 rounded-md bg-[#1D1D1F] text-xs font-semibold text-white disabled:opacity-40"
              >
                {isVip ? "Remove VIP" : "Mark VIP"}
              </button>
              <button
                type="button"
                disabled={controlsDisabled}
                onClick={() => {
                  if (isBanned) apply({ banned: false }, "Customer unbanned");
                  else setBanOpen(true);
                }}
                className="h-8 rounded-md border border-[#F5C2C0] text-xs font-semibold text-[#B42318] disabled:opacity-40"
              >
                {isBanned ? "Unban" : "Ban customer"}
              </button>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              apply({ notes: notes.trim() || null }, "Notes saved");
            }}
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
                disabled={controlsDisabled}
                className="w-full rounded-md border border-black/[0.08] bg-[#F7F7F8] px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] disabled:opacity-40"
              />
            </label>
            <button
              type="submit"
              disabled={controlsDisabled}
              className="h-8 w-full rounded-md border border-black/10 text-xs font-semibold disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save notes"}
            </button>
          </form>
        </aside>
      </div>

      <ConfirmDialog
        open={banOpen}
        title="Ban this customer?"
        // Deliberately narrow: `banned` is a CRM flag today. It does not block
        // sign-in or checkout, so promising more here would be the same lie the
        // no-op buttons used to tell.
        description="They will be flagged as banned across the admin panel. This does not by itself block them from signing in or ordering. You can unban later."
        confirmLabel="Ban customer"
        danger
        onConfirm={() => {
          setBanOpen(false);
          apply({ banned: true }, "Customer banned");
        }}
        onCancel={() => setBanOpen(false)}
      />
    </div>
  );
}

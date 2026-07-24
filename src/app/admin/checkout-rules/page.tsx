"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { CheckoutRuleBuilder } from "@/components/admin/CheckoutRuleBuilder";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ListToolbar } from "@/components/admin/ListToolbar";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useAutoBanner } from "@/hooks/useAutoBanner";
import {
  deleteCheckoutRule,
  toggleCheckoutRule,
  upsertCheckoutRule,
} from "@/lib/adminStore";
import { api, isApiEnabled } from "@/lib/apiClient";
import type { AdminCheckoutRule } from "@/lib/checkoutRules";
import { mockExperimentStats, resolveCheckoutPolicy } from "@/lib/checkoutRules";
import { formatInr } from "@/data/admin";

const actionLabels: Record<string, string> = {
  allow_payment_methods: "Allow methods",
  hide_payment_method: "Hide method",
  set_prepaid_discount_pct: "Prepaid %",
  set_cod_max: "COD max",
  set_shipping: "Shipping",
  require_field: "Require field",
  hide_field: "Hide field",
  set_banner: "Banner",
  block_checkout: "Block",
  allow_gateways: "Gateways",
  hide_gateway: "Hide gateway",
  prefer_gateway: "Prefer gateway",
  set_tax_rate: "Tax rate",
  set_tax_inclusive_message: "Tax copy",
  exempt_tax: "Tax exempt",
  set_carrier: "Carrier",
  set_rate_table: "Rate table",
  hide_carrier: "Hide carrier",
  set_deposit_pct: "Deposit %",
  enable_pay_later: "Pay later",
  split_payment: "Split pay",
};

function blankRule(): AdminCheckoutRule {
  const now = new Date().toISOString();
  return {
    id: "",
    name: "",
    description: "",
    enabled: true,
    priority: 100,
    conditions: [],
    actions: [{ type: "set_banner", value: "" }],
    createdAt: now,
    updatedAt: now,
  };
}

export default function AdminCheckoutRulesPage() {
  const { checkoutRules, settings } = useAdminStore();
  const [query, setQuery] = useState("");
  const [enabledFilter, setEnabledFilter] = useState<"all" | "on" | "off">("all");
  const [editing, setEditing] = useState<AdminCheckoutRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useAutoBanner(2600);
  const [apiSync, setApiSync] = useState<"off" | "ok" | "err">("off");

  useEffect(() => {
    if (!isApiEnabled()) return;
    void api
      .checkoutRules()
      .then((res) => {
        for (const rule of res.data ?? []) {
          upsertCheckoutRule(rule as AdminCheckoutRule);
        }
        setApiSync("ok");
      })
      .catch(() => setApiSync("err"));
  }, []);

  const rules = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...checkoutRules]
      .filter((rule) => {
        if (enabledFilter === "on" && !rule.enabled) return false;
        if (enabledFilter === "off" && rule.enabled) return false;
        return (
          !needle ||
          rule.name.toLowerCase().includes(needle) ||
          rule.description.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => a.priority - b.priority);
  }, [checkoutRules, enabledFilter, query]);

  const enabledCount = checkoutRules.filter((r) => r.enabled).length;
  const samplePolicy = resolveCheckoutPolicy(settings, checkoutRules, {
    subtotal: 5999,
    pincode: "560001",
    fulfillmentType: "preorder",
  });

  async function saveRule(rule: AdminCheckoutRule) {
    const isNew = !rule.id;
    if (isApiEnabled()) {
      try {
        // New rules must NOT carry an id, so upsertCheckoutRule POSTs to store()
        // instead of PUTting a non-existent public_id (which 404'd).
        const saved = await api.upsertCheckoutRule(rule);
        upsertCheckoutRule(saved as AdminCheckoutRule);
        setApiSync("ok");
        setEditing(null);
        setToast(isNew ? "Rule created" : "Rule updated");
      } catch {
        setApiSync("err");
        setToast("Could not save rule");
      }
      return;
    }
    // Mock mode: assign a local id for the localStorage store.
    upsertCheckoutRule({ ...rule, id: rule.id || `cr-${Date.now()}` });
    setEditing(null);
    setToast(isNew ? "Rule created" : "Rule updated");
  }

  async function toggleRule(rule: AdminCheckoutRule) {
    const next = !rule.enabled;
    toggleCheckoutRule(rule.id, next); // optimistic local flip
    if (isApiEnabled()) {
      try {
        const saved = await api.upsertCheckoutRule({ ...rule, enabled: next });
        upsertCheckoutRule(saved as AdminCheckoutRule);
        setApiSync("ok");
        setToast(next ? "Enabled" : "Paused");
      } catch {
        toggleCheckoutRule(rule.id, rule.enabled); // revert on failure
        setApiSync("err");
        setToast("Could not update rule");
      }
      return;
    }
    setToast(next ? "Enabled" : "Paused");
  }

  async function deleteRule(id: string) {
    const target = checkoutRules.find((r) => r.id === id);
    deleteCheckoutRule(id); // optimistic local removal
    setDeleteId(null);
    if (isApiEnabled()) {
      try {
        await api.deleteCheckoutRule(id);
        setApiSync("ok");
        setToast("Rule deleted");
      } catch {
        if (target) upsertCheckoutRule(target); // restore on failure
        setApiSync("err");
        setToast("Could not delete rule");
      }
      return;
    }
    setToast("Rule deleted");
  }

  return (
    <div>
      <AdminPageHeader
        title="Checkout rules"
        description="Control payment methods, COD limits, shipping labels, and checkout messaging from cart context."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {toast ? (
              <span
                role="status"
                className="inline-flex h-8 items-center rounded-full border border-[#A6D5B0] bg-[#EAF6ED] px-3 text-[11px] font-semibold text-[#2D6B3C]"
              >
                {toast}
              </span>
            ) : null}
            {apiSync === "ok" ? (
              <span className="inline-flex h-8 items-center rounded-full border border-black/[0.08] bg-white px-3 text-[11px] font-semibold text-[#6E6E73]">
                Laravel synced
              </span>
            ) : null}
            <Link
              href="/admin/checkout-rules/templates"
              className="inline-flex h-9 items-center rounded-lg border border-black/[0.1] bg-white px-3 text-xs font-semibold"
            >
              Templates
            </Link>
            <button
              type="button"
              onClick={() => setEditing(blankRule())}
              className="inline-flex h-9 items-center rounded-lg bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white"
            >
              New rule
            </button>
          </div>
        }
      />

      {apiSync === "err" ? (
        <AdminNotice tone="error">
          Couldn&apos;t sync rules from the server — showing local data. Changes may not persist.
        </AdminNotice>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Rules", value: String(checkoutRules.length) },
          { label: "Enabled", value: String(enabledCount) },
          {
            label: "Sample methods",
            value: samplePolicy.methods.join(" · ").toUpperCase() || "—",
          },
          {
            label: "Sample COD max",
            value: formatInr(samplePolicy.codMax),
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-black/[0.06] bg-white px-4 py-3"
          >
            <p className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
              {stat.label}
            </p>
            <p className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[#1D1D1F]">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <ListToolbar
        resultLabel={`${rules.length} rules`}
        search={{
          value: query,
          onChange: setQuery,
          placeholder: "Search rules…",
        }}
        filters={
          <select
            value={enabledFilter}
            onChange={(e) =>
              setEnabledFilter(e.target.value as "all" | "on" | "off")
            }
            className="h-9 rounded-lg border border-black/[0.1] bg-white px-2.5 text-xs font-semibold"
          >
            <option value="all">All</option>
            <option value="on">Enabled</option>
            <option value="off">Paused</option>
          </select>
        }
      />

      {rules.length === 0 ? (
        <AdminEmptyState
          title="No checkout rules"
          description="Create a rule or start from a template."
          action={
            <Link
              href="/admin/checkout-rules/templates"
              className="inline-flex h-9 items-center rounded-lg bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white"
            >
              Browse templates
            </Link>
          }
        />
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-black/[0.07] bg-white">
          <ul className="divide-y divide-black/[0.05]">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(rule)}
                      className="text-sm font-semibold text-[#1D1D1F] hover:underline"
                    >
                      {rule.name}
                    </button>
                    <span className="ez-mono rounded-full bg-[#F5F5F7] px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[#6E6E73]">
                      P{rule.priority}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        rule.enabled
                          ? "bg-[#EAF6ED] text-[#2D6B3C]"
                          : "bg-[#F5F5F7] text-[#86868B]"
                      }`}
                    >
                      {rule.enabled ? "On" : "Off"}
                    </span>
                    {rule.experimentId ? (
                      <span className="rounded-full bg-[#EEF0FF] px-2 py-0.5 text-[10px] font-semibold text-[#3B4CCA]">
                        A/B · {rule.variant ?? "control"}
                      </span>
                    ) : null}
                    {rule.conditionMode === "script" ? (
                      <span className="rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[10px] font-semibold text-[#B54708]">
                        Script
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-[#6E6E73]">{rule.description}</p>
                  <p className="mt-1.5 text-[11px] text-[#A1A1A6]">
                    {rule.conditionMode === "script"
                      ? "Script condition"
                      : rule.conditions.length === 0
                        ? "Always"
                        : `${rule.conditions.length} condition${rule.conditions.length === 1 ? "" : "s"}`}
                    {" · "}
                    {rule.actions
                      .map((a) => actionLabels[a.type] ?? a.type)
                      .join(", ")}
                  </p>
                  {rule.experimentId && rule.variant ? (
                    <p className="mt-1 text-[10px] text-[#86868B]">
                      {(() => {
                        const stats = mockExperimentStats(rule.experimentId, rule.variant);
                        return `Mock CVR ${stats.ratePct}% · ${stats.conversions}/${stats.sessions} sessions`;
                      })()}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleRule(rule)}
                    className="h-8 rounded-lg border border-black/[0.1] px-2.5 text-[11px] font-semibold"
                  >
                    {rule.enabled ? "Pause" : "Enable"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(rule)}
                    className="h-8 rounded-lg border border-black/[0.1] px-2.5 text-[11px] font-semibold"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(rule.id)}
                    className="h-8 rounded-lg border border-red-200 px-2.5 text-[11px] font-semibold text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-5 text-sm text-[#6E6E73]">
        Defaults live in{" "}
        <Link href="/admin/settings#checkout" className="font-semibold text-[#1D1D1F] underline">
          Settings → Checkout
        </Link>
        . Rules layer on top at runtime.
      </p>

      {editing ? (
        <CheckoutRuleBuilder
          rule={editing}
          onClose={() => setEditing(null)}
          onSave={saveRule}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete checkout rule?"
        description="This cannot be undone. The storefront will stop applying this rule immediately."
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) void deleteRule(deleteId);
          else setDeleteId(null);
        }}
      />
    </div>
  );
}

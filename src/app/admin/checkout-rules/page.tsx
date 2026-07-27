"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { CheckoutRuleBuilder } from "@/components/admin/CheckoutRuleBuilder";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  IconButton,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  TrashIcon,
} from "@/components/admin/IconButton";
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
import { adminErrorMessage } from "@/lib/adminError";
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

const primaryBtnClass =
  "inline-flex h-9 items-center rounded-xl bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#2C2C2E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

const secondaryBtnClass =
  "inline-flex h-9 items-center rounded-xl border border-black/[0.08] bg-white px-3.5 text-xs font-semibold text-[#1D1D1F] shadow-[0_1px_2px_rgba(17,17,19,0.03)] transition hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

const compactSelectClass = "h-9 rounded-lg shadow-none";

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
  const [, setToast] = useAutoBanner(2600);
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
  const pausedCount = checkoutRules.length - enabledCount;
  const samplePolicy = resolveCheckoutPolicy(settings, checkoutRules, {
    subtotal: 5999,
    pincode: "560001",
    fulfillmentType: "preorder",
  });
  const sampleMethods =
    samplePolicy.methods.join(" · ").toUpperCase() || "—";
  const hasActiveFilters =
    query.trim().length > 0 || enabledFilter !== "all";

  async function saveRule(rule: AdminCheckoutRule) {
    const isNew = !rule.id;
    if (isApiEnabled()) {
      try {
        const saved = await api.upsertCheckoutRule(rule);
        upsertCheckoutRule(saved as AdminCheckoutRule);
        setApiSync("ok");
        setEditing(null);
        setToast(isNew ? "Rule created" : "Rule updated");
      } catch (err) {
        setApiSync("err");
        setToast(adminErrorMessage(err, "Could not save rule"));
      }
      return;
    }
    upsertCheckoutRule({ ...rule, id: rule.id || `cr-${Date.now()}` });
    setEditing(null);
    setToast(isNew ? "Rule created" : "Rule updated");
  }

  async function toggleRule(rule: AdminCheckoutRule) {
    const next = !rule.enabled;
    toggleCheckoutRule(rule.id, next);
    if (isApiEnabled()) {
      try {
        const saved = await api.upsertCheckoutRule({ ...rule, enabled: next });
        upsertCheckoutRule(saved as AdminCheckoutRule);
        setApiSync("ok");
        setToast(next ? "Enabled" : "Paused");
      } catch (err) {
        toggleCheckoutRule(rule.id, rule.enabled);
        setApiSync("err");
        setToast(adminErrorMessage(err, "Could not update rule"));
      }
      return;
    }
    setToast(next ? "Enabled" : "Paused");
  }

  async function deleteRule(id: string) {
    const target = checkoutRules.find((r) => r.id === id);
    deleteCheckoutRule(id);
    setDeleteId(null);
    if (isApiEnabled()) {
      try {
        await api.deleteCheckoutRule(id);
        setApiSync("ok");
        setToast("Rule deleted");
      } catch (err) {
        if (target) upsertCheckoutRule(target);
        setApiSync("err");
        setToast(adminErrorMessage(err, "Could not delete rule"));
      }
      return;
    }
    setToast("Rule deleted");
  }

  function clearFilters() {
    setQuery("");
    setEnabledFilter("all");
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Checkout rules"
        description="Control payment methods, COD limits, shipping labels, and checkout messaging from cart context."
        breadcrumbs={[
          { label: "Online store", href: "/admin/cms" },
          { label: "Checkout rules" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {apiSync === "ok" ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.06] bg-[#FAFAFB] px-2.5 py-1 ez-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[#86868B]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2D6B3C]" aria-hidden />
                Laravel synced
              </span>
            ) : null}
            <Link href="/admin/checkout-rules/templates" className={secondaryBtnClass}>
              Templates
            </Link>
            <button
              type="button"
              onClick={() => setEditing(blankRule())}
              className={primaryBtnClass}
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

      <section className="overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(17,17,19,0.03)]">
        <div className="border-b border-black/[0.05] bg-[#FAFAFB]">
          <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 sm:px-4">
            <div className="flex flex-wrap items-center gap-2">
              <MetricTile label="Rules" value={String(checkoutRules.length)} accent />
              <MetricTile label="Enabled" value={String(enabledCount)} />
              <MetricTile label="Paused" value={String(pausedCount)} />
              <MetricTile label="Sample methods" value={sampleMethods} wide />
              <MetricTile label="COD max" value={formatInr(samplePolicy.codMax)} />
            </div>
            <Link
              href="/admin/checkout-rules/templates"
              className="ez-mono text-[9px] font-medium uppercase tracking-[0.1em] text-[#6E6E73] transition hover:text-[#1D1D1F]"
            >
              Templates →
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 border-b border-black/[0.05] bg-[#FAFAFB] px-3 py-2.5 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="relative min-w-0 flex-1 lg:max-w-sm">
              <span
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#AEAEB2]"
                aria-hidden
              >
                <SearchGlyph />
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search rules…"
                className="h-9 w-full rounded-lg border border-black/[0.07] bg-white pl-8 pr-3 text-sm shadow-[0_1px_2px_rgba(17,17,19,0.03)] outline-none placeholder:text-[#AEAEB2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
              />
            </div>
            <span className="hidden shrink-0 ez-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[#86868B] sm:inline">
              {rules.length} rules
            </span>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <AdminSelect
              label="State"
              value={enabledFilter}
              onChange={(value) => setEnabledFilter(value as "all" | "on" | "off")}
              options={[
                { value: "all", label: "All" },
                { value: "on", label: "Enabled" },
                { value: "off", label: "Paused" },
              ]}
              className={compactSelectClass}
            />
          </div>
        </div>

        <div className="p-3.5 sm:p-4">
          {rules.length === 0 ? (
            <AdminEmptyState
              title={hasActiveFilters ? "No rules match" : "No checkout rules"}
              description={
                hasActiveFilters
                  ? "Try another state or search — or start from a template."
                  : "Create a rule or start from a template."
              }
              action={
                hasActiveFilters ? (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="h-9 rounded-xl border border-black/[0.1] bg-[#F7F7F8] px-3.5 text-xs font-semibold"
                    >
                      Clear filters
                    </button>
                    <Link href="/admin/checkout-rules/templates" className={primaryBtnClass}>
                      Browse templates
                    </Link>
                  </div>
                ) : (
                  <Link href="/admin/checkout-rules/templates" className={primaryBtnClass}>
                    Browse templates
                  </Link>
                )
              }
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-black/[0.05]">
              <ul className="divide-y divide-black/[0.05]">
                {rules.map((rule) => (
                  <RuleRow
                    key={rule.id}
                    rule={rule}
                    onEdit={() => setEditing(rule)}
                    onToggle={() => void toggleRule(rule)}
                    onDelete={() => setDeleteId(rule.id)}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <p className="text-sm text-[#6E6E73]">
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

function RuleRow({
  rule,
  onEdit,
  onToggle,
  onDelete,
}: {
  rule: AdminCheckoutRule;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const conditionText =
    rule.conditionMode === "script"
      ? "Script condition"
      : rule.conditions.length === 0
        ? "Always"
        : `${rule.conditions.length} condition${rule.conditions.length === 1 ? "" : "s"}`;
  const actionText = rule.actions
    .map((a) => actionLabels[a.type] ?? a.type)
    .join(", ");

  return (
    <li className="group flex flex-col gap-3 px-3.5 py-3.5 transition hover:bg-[#FAFAFB] sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="truncate text-[13px] font-semibold tracking-[-0.02em] text-[#1D1D1F] transition hover:text-[#424245]"
          >
            {rule.name}
          </button>
          <span className="ez-mono rounded-md bg-[#F0F0F2] px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.1em] text-[#86868B]">
            P{rule.priority}
          </span>
          <StatusPill enabled={rule.enabled} />
          {rule.experimentId ? (
            <span className="rounded-md bg-[#EEF0FF] px-1.5 py-0.5 text-[10px] font-semibold text-[#3B4CCA]">
              A/B · {rule.variant ?? "control"}
            </span>
          ) : null}
          {rule.conditionMode === "script" ? (
            <span className="rounded-md bg-[#FFF4E5] px-1.5 py-0.5 text-[10px] font-semibold text-[#B54708]">
              Script
            </span>
          ) : null}
        </div>
        {rule.description ? (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-[#86868B]">{rule.description}</p>
        ) : null}
        <p className="mt-1.5 ez-mono text-[10px] text-[#AEAEB2]">
          {conditionText} · {actionText}
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

      <div className="flex shrink-0 items-center gap-1 sm:opacity-90 sm:group-hover:opacity-100">
        <IconButton
          label={rule.enabled ? `Pause ${rule.name}` : `Enable ${rule.name}`}
          onClick={onToggle}
        >
          {rule.enabled ? <PauseIcon /> : <PlayIcon />}
        </IconButton>
        <IconButton label={`Edit ${rule.name}`} onClick={onEdit}>
          <PencilIcon />
        </IconButton>
        <IconButton
          label={`Delete ${rule.name}`}
          onClick={onDelete}
          className="border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50 hover:text-red-800"
        >
          <TrashIcon />
        </IconButton>
      </div>
    </li>
  );
}

function StatusPill({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
        enabled ? "bg-[#EAF6ED] text-[#2D6B3C]" : "bg-[#F0F0F2] text-[#86868B]"
      }`}
    >
      {enabled ? "On" : "Off"}
    </span>
  );
}

function MetricTile({
  label,
  value,
  accent,
  wide,
}: {
  label: string;
  value: string;
  accent?: boolean;
  wide?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${
        accent ? "border-black/[0.06] bg-white" : "border-black/[0.05] bg-white/70"
      } ${wide ? "max-w-[14rem]" : ""}`}
    >
      <span className="ez-mono text-[8px] font-medium uppercase tracking-[0.12em] text-[#86868B]">
        {label}
      </span>
      <span
        className={`truncate text-[13px] font-semibold tracking-[-0.03em] text-[#1D1D1F] ${
          wide ? "" : "tabular-nums"
        }`}
        title={value}
      >
        {value}
      </span>
    </span>
  );
}

function SearchGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9.2 9.2L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

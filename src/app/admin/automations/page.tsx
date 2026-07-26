"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { formatAdminDateTime } from "@/lib/adminFormat";
import { api, isApiEnabled, type ApiAutomation } from "@/lib/apiClient";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AutomationBuilder } from "@/components/admin/AutomationBuilder";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import type {
  AdminAutomationRule,
  AdminAutomationRun,
  AutomationTrigger,
} from "@/data/admin";
import { automationTemplates } from "@/data/automationTemplates";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useAutoBanner } from "@/hooks/useAutoBanner";
import {
  deleteAutomation,
  testAutomation,
  toggleAutomation,
  upsertAutomation,
} from "@/lib/adminStore";

const triggerLabels: Record<AutomationTrigger, string> = {
  order_status_changed: "Order status",
  stock_low: "Low stock",
  customer_created: "Customer created",
  preorder_released: "Pre-order released",
  payment_authorized: "Payment authorized",
  payment_captured: "Payment captured",
  payment_failed: "Payment failed",
};

const triggerOptions = [
  { value: "all", label: "All triggers" },
  ...Object.entries(triggerLabels).map(([value, label]) => ({ value, label })),
];

const actionLabels: Record<string, string> = {
  notify_internal: "Notify team",
  add_customer_tag: "Add tag",
  update_order_status: "Update status",
  send_email: "Email",
  send_whatsapp: "WhatsApp",
  send_webhook: "Webhook",
};

const runStatusMeta: Record<
  AdminAutomationRun["status"],
  { label: string; className: string }
> = {
  completed: { label: "Completed", className: "bg-[#EAF6ED] text-[#2D6B3C]" },
  skipped: { label: "Skipped", className: "bg-[#FFF1E5] text-[#9A3412]" },
  failed: { label: "Failed", className: "bg-[#FFF5F5] text-[#B42318]" },
};

const primaryBtnClass =
  "inline-flex h-9 items-center rounded-xl bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#2C2C2E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

const secondaryBtnClass =
  "inline-flex h-9 items-center rounded-xl border border-black/[0.08] bg-white px-3.5 text-xs font-semibold text-[#1D1D1F] shadow-[0_1px_2px_rgba(17,17,19,0.03)] transition hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

const compactSelectClass = "h-9 rounded-lg shadow-none";

function blankRule(): AdminAutomationRule {
  const now = new Date().toISOString();
  return {
    id: "",
    name: "",
    description: "",
    trigger: "order_status_changed",
    enabled: true,
    conditions: [],
    actions: [{ type: "notify_internal", value: "" }],
    createdAt: now,
    updatedAt: now,
  };
}

function apiToRule(a: ApiAutomation): AdminAutomationRule {
  return {
    id: a.id ?? "",
    name: a.name,
    description: a.description ?? "",
    trigger: a.trigger as AutomationTrigger,
    enabled: a.enabled,
    conditions: (a.conditions ?? []) as AdminAutomationRule["conditions"],
    actions: (a.actions ?? []) as AdminAutomationRule["actions"],
    createdAt: a.createdAt ?? "",
    updatedAt: a.updatedAt ?? "",
  };
}

export default function AdminAutomationsPage() {
  const store = useAdminStore();
  const apiOn = isApiEnabled();
  const [apiAutomations, setApiAutomations] = useState<AdminAutomationRule[]>([]);
  const [apiRuns, setApiRuns] = useState<AdminAutomationRun[]>([]);

  const loadAutomations = useCallback(async () => {
    if (!apiOn) return;
    try {
      const [rules, runs] = await Promise.all([api.automations(), api.automationRuns()]);
      setApiAutomations((rules.data ?? []).map(apiToRule));
      setApiRuns(
        (runs.data ?? []).map((r) => ({
          id: r.id,
          ruleId: r.ruleId ?? "",
          ruleName: r.ruleName,
          trigger: r.trigger as AutomationTrigger,
          at: r.at,
          status: r.status as AdminAutomationRun["status"],
          summary: r.summary ?? "",
          delivery: (r.delivery ?? undefined) as AdminAutomationRun["delivery"],
        })),
      );
    } catch {
      setApiAutomations([]);
      setApiRuns([]);
    }
  }, [apiOn]);

  useEffect(() => {
    void loadAutomations();
  }, [loadAutomations]);

  const automations = apiOn ? apiAutomations : store.automations;
  const automationRuns = apiOn ? apiRuns : store.automationRuns;

  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "runs" ? "runs" : "rules";
  const [tab, setTab] = useState<"rules" | "runs">(initialTab);
  const [seenTabParam, setSeenTabParam] = useState(searchParams.get("tab"));
  if (searchParams.get("tab") !== seenTabParam) {
    setSeenTabParam(searchParams.get("tab"));
    setTab(searchParams.get("tab") === "runs" ? "runs" : "rules");
  }
  const [query, setQuery] = useState("");
  const [trigger, setTrigger] = useState("all");
  const [enabledFilter, setEnabledFilter] = useState<"all" | "on" | "off">("all");
  const [editing, setEditing] = useState<AdminAutomationRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useAutoBanner(2600);

  const rules = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return automations.filter((rule) => {
      if (trigger !== "all" && rule.trigger !== trigger) return false;
      if (enabledFilter === "on" && !rule.enabled) return false;
      if (enabledFilter === "off" && rule.enabled) return false;
      return (
        !needle ||
        rule.name.toLowerCase().includes(needle) ||
        rule.description.toLowerCase().includes(needle)
      );
    });
  }, [automations, enabledFilter, query, trigger]);

  const runs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return automationRuns.filter((run) => {
      if (trigger !== "all" && run.trigger !== trigger) return false;
      return (
        !needle ||
        run.ruleName.toLowerCase().includes(needle) ||
        run.summary.toLowerCase().includes(needle)
      );
    });
  }, [automationRuns, query, trigger]);

  const enabledCount = automations.filter((rule) => rule.enabled).length;
  const pausedCount = automations.length - enabledCount;
  const completedRuns = automationRuns.filter((run) => run.status === "completed").length;
  const blockedRuns = automationRuns.filter(
    (run) => run.status === "skipped" || run.delivery === "blocked",
  ).length;

  function openNew() {
    setEditing(blankRule());
  }

  function toApiPayload(rule: AdminAutomationRule): ApiAutomation {
    return {
      id: rule.id || undefined,
      name: rule.name,
      description: rule.description,
      trigger: rule.trigger,
      enabled: rule.enabled,
      priority: 100,
      conditions: rule.conditions,
      actions: rule.actions,
    };
  }

  async function saveRule(rule: AdminAutomationRule) {
    if (apiOn) {
      try {
        await api.upsertAutomation(toApiPayload(rule));
        setEditing(null);
        setToast(rule.id ? "Rule updated" : "Rule created");
        await loadAutomations();
      } catch {
        setToast("Could not save automation");
      }
      return;
    }
    const id = rule.id || `auto-${Date.now()}`;
    upsertAutomation({ ...rule, id });
    setEditing(null);
    setToast(rule.id ? "Rule updated" : "Rule created");
  }

  async function handleToggle(rule: AdminAutomationRule, enabled: boolean) {
    if (apiOn) {
      try {
        await api.upsertAutomation({ ...toApiPayload(rule), enabled });
        await loadAutomations();
      } catch {
        setToast("Could not update automation");
      }
    } else {
      toggleAutomation(rule.id, enabled);
    }
    setToast(enabled ? "Enabled" : "Paused");
  }

  async function handleTest(rule: AdminAutomationRule) {
    if (apiOn) {
      try {
        await api.testAutomation(rule.id);
        setToast("Test event fired");
        await loadAutomations();
      } catch {
        setToast("Could not run test");
      }
    } else {
      testAutomation(rule.trigger);
      setToast(`Test event fired · ${triggerLabels[rule.trigger]}`);
    }
  }

  async function handleDelete(id: string) {
    if (apiOn) {
      try {
        await api.deleteAutomation(id);
        await loadAutomations();
      } catch {
        setToast("Could not delete automation");
      }
    } else {
      deleteAutomation(id);
    }
    setToast("Rule deleted");
  }

  const resultLabel = tab === "rules" ? `${rules.length} rules` : `${runs.length} runs`;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Automations"
        description="Store-ops rules that fire on order, stock, payment, and customer events — delivery is simulated locally."
        breadcrumbs={[
          { label: "System", href: "/admin/settings" },
          { label: "Automations" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/automations/templates" className={secondaryBtnClass}>
              Browse templates
            </Link>
            <button type="button" onClick={openNew} className={primaryBtnClass}>
              New rule
            </button>
          </div>
        }
      />

      <section className="overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(17,17,19,0.03)]">
        <div className="border-b border-black/[0.05] bg-[#FAFAFB]">
          {apiOn ? (
            <p className="border-b border-black/[0.04] px-3.5 py-2 text-[11px] leading-relaxed text-[#6E6E73] sm:px-4">
              Automations run on the live server. WhatsApp/SMS actions send via MSG91 once the
              matching template is approved (until then a run is recorded as &ldquo;blocked&rdquo;).
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 sm:px-4">
            <div className="flex flex-wrap items-center gap-2">
              <MetricPill label="Active" value={enabledCount} accent />
              <MetricPill label="Paused" value={pausedCount} />
              <MetricPill
                label="Runs"
                value={automationRuns.length}
                detail={`${completedRuns} ok`}
              />
              <MetricPill label="Blocked" value={blockedRuns} warn={blockedRuns > 0} />
            </div>
            <Link
              href="/admin/automations/templates"
              className="ez-mono text-[9px] font-medium uppercase tracking-[0.1em] text-[#6E6E73] transition hover:text-[#1D1D1F]"
            >
              {automationTemplates.length} templates →
            </Link>
          </div>
        </div>

        <div className="border-b border-black/[0.05] px-3 py-2.5 sm:px-4">
          <div
            className="inline-flex w-full max-w-full gap-1 overflow-x-auto rounded-xl border border-black/[0.06] bg-[#F0F0F2] p-1 shadow-[0_1px_2px_rgba(17,17,19,0.03)] sm:w-auto"
            role="tablist"
            aria-label="Automations views"
          >
            {(
              [
                { id: "rules" as const, label: "Rules", hint: "Configured", count: automations.length },
                { id: "runs" as const, label: "History", hint: "Run log", count: automationRuns.length },
              ] as const
            ).map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  id={`automations-tab-${item.id}`}
                  onClick={() => setTab(item.id)}
                  className={`inline-flex min-w-[7.5rem] shrink-0 flex-col rounded-lg px-3.5 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] ${
                    active
                      ? "bg-white text-[#1D1D1F] shadow-[0_1px_2px_rgba(17,17,19,0.06)]"
                      : "text-[#6E6E73] hover:text-[#1D1D1F]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-semibold tracking-[-0.01em]">{item.label}</span>
                    <span
                      className={`ez-mono text-[8px] ${
                        active ? "text-[#86868B]" : "text-[#AEAEB2]"
                      }`}
                    >
                      {item.count}
                    </span>
                  </span>
                  <span
                    className={`mt-0.5 ez-mono text-[8px] uppercase tracking-[0.12em] ${
                      active ? "text-[#86868B]" : "text-[#AEAEB2]"
                    }`}
                  >
                    {item.hint}
                  </span>
                </button>
              );
            })}
            <Link
              href="/admin/automations/templates"
              role="tab"
              aria-selected={false}
              className="inline-flex min-w-[7.5rem] shrink-0 flex-col rounded-lg px-3.5 py-2 text-left text-[#6E6E73] transition hover:text-[#1D1D1F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
            >
              <span className="flex items-center gap-2">
                <span className="text-xs font-semibold tracking-[-0.01em]">Templates</span>
                <span className="ez-mono text-[8px] text-[#AEAEB2]">
                  {automationTemplates.length}
                </span>
              </span>
              <span className="mt-0.5 ez-mono text-[8px] uppercase tracking-[0.12em] text-[#AEAEB2]">
                Starters
              </span>
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
                placeholder={tab === "rules" ? "Search rules…" : "Search run history…"}
                className="h-9 w-full rounded-lg border border-black/[0.07] bg-white pl-8 pr-3 text-sm shadow-[0_1px_2px_rgba(17,17,19,0.03)] outline-none placeholder:text-[#AEAEB2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
              />
            </div>
            <span className="hidden shrink-0 ez-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[#86868B] sm:inline">
              {resultLabel}
            </span>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <AdminSelect
              label="Trigger"
              value={trigger}
              onChange={setTrigger}
              options={triggerOptions}
              className={compactSelectClass}
            />
            {tab === "rules" ? (
              <AdminSelect
                label="Status"
                value={enabledFilter}
                onChange={(value) => setEnabledFilter(value as "all" | "on" | "off")}
                options={[
                  { value: "all", label: "All" },
                  { value: "on", label: "Enabled" },
                  { value: "off", label: "Paused" },
                ]}
                className={compactSelectClass}
              />
            ) : null}
          </div>
        </div>

        <div className="p-3.5 sm:p-4">
          {tab === "rules" ? (
            rules.length ? (
              <div className="grid gap-2.5 lg:grid-cols-2">
                {rules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    onEdit={() => setEditing(rule)}
                    onDelete={() => setDeleteId(rule.id)}
                    onToggle={(enabled) => void handleToggle(rule, enabled)}
                    onTest={() => {
                      void handleTest(rule);
                      setTab("runs");
                    }}
                  />
                ))}
              </div>
            ) : (
              <AdminEmptyState
                title="No rules match"
                description="Try another trigger, status, or search — or start from a template."
                action={
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setTrigger("all");
                        setEnabledFilter("all");
                      }}
                      className="h-9 rounded-xl border border-black/[0.1] bg-[#F7F7F8] px-3.5 text-xs font-semibold"
                    >
                      Clear filters
                    </button>
                    <Link href="/admin/automations/templates" className={primaryBtnClass}>
                      Browse templates
                    </Link>
                  </div>
                }
              />
            )
          ) : runs.length ? (
            <div className="overflow-hidden rounded-xl border border-black/[0.05]">
              <ul className="divide-y divide-black/[0.05]">
                {runs.slice(0, 80).map((run) => (
                  <RunRow key={run.id} run={run} />
                ))}
              </ul>
              {runs.length > 80 ? (
                <p className="border-t border-black/[0.05] bg-[#FAFAFB] px-4 py-2.5 text-center ez-mono text-[9px] uppercase tracking-[0.1em] text-[#86868B]">
                  Showing latest 80 of {runs.length} runs
                </p>
              ) : null}
            </div>
          ) : (
            <AdminEmptyState
              title="No runs yet"
              description="Test a rule or change an order status to see outcomes here."
              action={
                <button
                  type="button"
                  onClick={() => {
                    if (automations[0]) {
                      void handleTest(automations[0]);
                    } else {
                      openNew();
                    }
                  }}
                  className={primaryBtnClass}
                >
                  {automations[0] ? "Fire sample test" : "Create a rule"}
                </button>
              }
            />
          )}
        </div>
      </section>

      {editing ? (
        <AutomationBuilder
          key={editing.id || "new"}
          rule={editing}
          onClose={() => setEditing(null)}
          onSave={saveRule}
          onTested={() => {
            setTab("runs");
            setToast("Test event fired");
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete automation?"
        description="This removes the rule from the local store. Run history is kept."
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) void handleDelete(deleteId);
          setDeleteId(null);
        }}
      />
    </div>
  );
}

function MetricPill({
  label,
  value,
  detail,
  accent,
  warn,
}: {
  label: string;
  value: number;
  detail?: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${
        warn
          ? "border-[#F5C2C0] bg-[#FFF5F5]"
          : accent
            ? "border-black/[0.06] bg-white"
            : "border-black/[0.05] bg-white/70"
      }`}
    >
      <span className="ez-mono text-[8px] font-medium uppercase tracking-[0.12em] text-[#86868B]">
        {label}
      </span>
      <span
        className={`text-[13px] font-semibold tabular-nums tracking-[-0.03em] ${
          warn ? "text-[#B42318]" : "text-[#1D1D1F]"
        }`}
      >
        {value}
      </span>
      {detail ? (
        <span className="text-[10px] text-[#AEAEB2]">({detail})</span>
      ) : null}
    </span>
  );
}

function RuleCard({
  rule,
  onEdit,
  onDelete,
  onToggle,
  onTest,
}: {
  rule: AdminAutomationRule;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (enabled: boolean) => void;
  onTest: () => void;
}) {
  const conditionText = rule.conditions.length
    ? rule.conditions
        .map((c) => `${c.field} ${operatorShort(c.operator)} ${c.value}`)
        .join(" · ")
    : "Always";
  const actionText =
    rule.actions
      .map((a) => actionLabels[a.type] ?? a.type.split("_").join(" "))
      .join(" → ") || "—";

  return (
    <article className="group flex flex-col rounded-xl border border-black/[0.06] bg-white p-3.5 shadow-[0_1px_2px_rgba(17,17,19,0.03)] transition hover:border-black/[0.1] hover:shadow-[0_4px_16px_rgba(17,17,19,0.05)]">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-[13px] font-semibold tracking-[-0.02em] text-[#1D1D1F]">
              {rule.name}
            </h2>
            <StatusPill enabled={rule.enabled} />
          </div>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-[#86868B]">
            {rule.description || "No description"}
          </p>
        </div>
        <Toggle
          checked={rule.enabled}
          onChange={onToggle}
          label={`${rule.enabled ? "Pause" : "Enable"} ${rule.name}`}
        />
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-black/[0.05] bg-[#FAFAFB]">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch">
          <FlowStep label="Trigger" value={triggerLabels[rule.trigger]} />
          <FlowDivider />
          <FlowStep label="If" value={conditionText} />
          <FlowDivider />
          <FlowStep label="Then" value={actionText} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1 border-t border-black/[0.05] pt-2.5">
        <CardAction onClick={onTest}>Test</CardAction>
        <CardAction onClick={onEdit}>Edit</CardAction>
        <CardAction onClick={onDelete} danger>
          Delete
        </CardAction>
      </div>
    </article>
  );
}

function FlowStep({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-3 py-2.5">
      <div className="ez-mono text-[8px] font-medium uppercase tracking-[0.12em] text-[#AEAEB2]">
        {label}
      </div>
      <div
        className="mt-0.5 truncate text-[11px] font-semibold tracking-[-0.01em] text-[#1D1D1F]"
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

function FlowDivider() {
  return (
    <div
      className="hidden items-center justify-center self-stretch border-x border-black/[0.04] px-1 sm:flex"
      aria-hidden
    >
      <span className="text-[10px] text-[#C7C7CC]">→</span>
    </div>
  );
}

function CardAction({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-7 rounded-lg px-2.5 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
        danger
          ? "text-[#B42318] hover:bg-[#FFF5F5] focus-visible:outline-[#B42318]"
          : "text-[#424245] hover:bg-[#F0F0F2] focus-visible:outline-[#1D1D1F]"
      }`}
    >
      {children}
    </button>
  );
}

function RunRow({ run }: { run: AdminAutomationRun }) {
  const meta = runStatusMeta[run.status];
  return (
    <li className="flex flex-col gap-2 px-3.5 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4">
      <div className="shrink-0 sm:w-28">
        <time className="ez-mono text-[10px] text-[#86868B]" dateTime={run.at}>
          {formatAdminDateTime(run.at)}
        </time>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold tracking-[-0.02em] text-[#1D1D1F]">
            {run.ruleName}
          </span>
          <span className="ez-mono text-[8px] uppercase tracking-[0.12em] text-[#AEAEB2]">
            {triggerLabels[run.trigger]}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-[#6E6E73]">
          {run.summary}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}
        >
          {meta.label}
        </span>
        {run.delivery ? (
          <span
            className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${
              run.delivery === "blocked"
                ? "bg-[#FFF1E5] text-[#9A3412]"
                : "bg-[#F0F0F2] text-[#6E6E73]"
            }`}
          >
            {run.delivery}
          </span>
        ) : null}
      </div>
    </li>
  );
}

function StatusPill({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.04em] ${
        enabled ? "bg-[#EAF6ED] text-[#2D6B3C]" : "bg-[#F0F0F2] text-[#6E6E73]"
      }`}
    >
      {enabled ? "Active" : "Paused"}
    </span>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] ${
        checked ? "bg-[#1D1D1F]" : "bg-[#D1D1D6]"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${
          checked ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function SearchGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9.2 9.2L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function operatorShort(op: AdminAutomationRule["conditions"][number]["operator"]) {
  if (op === "equals") return "=";
  if (op === "not_equals") return "≠";
  if (op === "contains") return "∋";
  return "≤";
}


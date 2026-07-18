"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AutomationBuilder } from "@/components/admin/AutomationBuilder";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ListToolbar } from "@/components/admin/ListToolbar";
import { StatCard } from "@/components/admin/StatCard";
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

export default function AdminAutomationsPage() {
  const { automations, automationRuns } = useAdminStore();
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

  function saveRule(rule: AdminAutomationRule) {
    const id = rule.id || `auto-${Date.now()}`;
    upsertAutomation({ ...rule, id });
    setEditing(null);
    setToast(rule.id ? "Rule updated" : "Rule created");
  }

  return (
    <div>
      <AdminPageHeader
        title="Automations"
        description="Store-ops rules that fire on order, stock, payment, and customer events — delivery is simulated locally."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {toast ? (
              <span
                role="status"
                aria-live="polite"
                className="inline-flex h-8 items-center rounded-full border border-[#A6D5B0] bg-[#EAF6ED] px-3 text-[11px] font-semibold text-[#2D6B3C]"
              >
                {toast}
              </span>
            ) : null}
            <Link
              href="/admin/automations/templates"
              className="inline-flex h-9 items-center rounded-lg border border-black/[0.1] bg-white px-3.5 text-xs font-semibold text-[#1D1D1F] transition hover:bg-[#F5F5F7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
            >
              Browse templates
            </Link>
            <button
              type="button"
              onClick={openNew}
              className="h-9 rounded-lg bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white transition hover:bg-[#2C2C2E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
            >
              New rule
            </button>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active rules"
          value={String(enabledCount)}
          detail={`${pausedCount} paused · ${automations.length} total`}
          tone="dark"
        />
        <StatCard
          label="Run history"
          value={String(automationRuns.length)}
          detail={`${completedRuns} completed`}
        />
        <StatCard
          label="Blocked / skipped"
          value={String(blockedRuns)}
          detail="Usually missing integrations"
        />
        <StatCard
          label="Templates"
          value={String(automationTemplates.length)}
          detail="Starter recipes ready to use"
        />
      </div>

      <div
        className="mb-5 inline-flex w-full max-w-full gap-1 overflow-x-auto rounded-xl border border-black/[0.06] bg-[#F0F0F2] p-1 sm:w-auto"
        role="tablist"
        aria-label="Automations views"
      >
        {(
          [
            { id: "rules" as const, label: "Rules", count: automations.length },
            { id: "runs" as const, label: "History", count: automationRuns.length },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            id={`automations-tab-${item.id}`}
            onClick={() => setTab(item.id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] ${
              tab === item.id
                ? "bg-white text-[#1D1D1F] shadow-[0_1px_2px_rgba(17,17,19,0.06)]"
                : "text-[#6E6E73] hover:text-[#1D1D1F]"
            }`}
          >
            {item.label}
            <span
              className={`ez-mono text-[9px] ${
                tab === item.id ? "text-[#86868B]" : "text-[#AEAEB2]"
              }`}
            >
              {item.count}
            </span>
          </button>
        ))}
        <Link
          href="/admin/automations/templates"
          role="tab"
          aria-selected={false}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold text-[#6E6E73] transition hover:text-[#1D1D1F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
        >
          Templates
          <span className="ez-mono text-[9px] text-[#AEAEB2]">
            {automationTemplates.length}
          </span>
        </Link>
      </div>

      <ListToolbar
        resultLabel={
          tab === "rules" ? `${rules.length} rules` : `${runs.length} runs`
        }
        search={{
          value: query,
          onChange: setQuery,
          placeholder: tab === "rules" ? "Search rules…" : "Search run history…",
        }}
        filters={
          <>
            <AdminSelect
              label="Trigger"
              value={trigger}
              onChange={setTrigger}
              options={triggerOptions}
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
              />
            ) : null}
          </>
        }
      />

      {tab === "rules" ? (
        rules.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {rules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onEdit={() => setEditing(rule)}
                onDelete={() => setDeleteId(rule.id)}
                onToggle={(enabled) => {
                  toggleAutomation(rule.id, enabled);
                  setToast(`${rule.name} ${enabled ? "enabled" : "paused"}`);
                }}
                onTest={() => {
                  testAutomation(rule.trigger);
                  setToast(`Test event fired · ${triggerLabels[rule.trigger]}`);
                  setTab("runs");
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No rules match"
            body="Try another trigger, status, or search — or start from a template."
            actions={
              <>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setTrigger("all");
                    setEnabledFilter("all");
                  }}
                  className="h-9 rounded-lg border border-black/[0.1] bg-[#F7F7F8] px-3.5 text-xs font-semibold"
                >
                  Clear filters
                </button>
                <Link
                  href="/admin/automations/templates"
                  className="inline-flex h-9 items-center rounded-lg bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white"
                >
                  Browse templates
                </Link>
              </>
            }
          />
        )
      ) : runs.length ? (
        <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <ul className="divide-y divide-black/[0.05]">
            {runs.slice(0, 80).map((run) => (
              <RunRow key={run.id} run={run} />
            ))}
          </ul>
          {runs.length > 80 ? (
            <p className="border-t border-black/[0.05] px-4 py-3 text-center text-[11px] text-[#86868B]">
              Showing latest 80 of {runs.length} runs
            </p>
          ) : null}
        </div>
      ) : (
        <EmptyState
          title="No runs yet"
          body="Test a rule or change an order status to see outcomes here."
          actions={
            <button
              type="button"
              onClick={() => {
                if (automations[0]) {
                  testAutomation(automations[0].trigger);
                  setToast("Sample test event fired");
                } else {
                  openNew();
                }
              }}
              className="h-9 rounded-lg bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white"
            >
              {automations[0] ? "Fire sample test" : "Create a rule"}
            </button>
          }
        />
      )}

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
          if (deleteId) deleteAutomation(deleteId);
          setDeleteId(null);
          setToast("Rule deleted");
        }}
      />
    </div>
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
  return (
    <article className="flex flex-col rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(17,17,19,0.03)] transition hover:shadow-[0_8px_24px_rgba(17,17,19,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-sm font-semibold tracking-[-0.02em] text-[#1D1D1F]">
              {rule.name}
            </h2>
            <StatusPill enabled={rule.enabled} />
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#6E6E73]">
            {rule.description || "No description"}
          </p>
        </div>
        <Toggle
          checked={rule.enabled}
          onChange={onToggle}
          label={`${rule.enabled ? "Pause" : "Enable"} ${rule.name}`}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-stretch gap-1.5">
        <FlowChip
          label="Trigger"
          value={triggerLabels[rule.trigger]}
        />
        <FlowArrow />
        <FlowChip
          label="If"
          value={
            rule.conditions.length
              ? rule.conditions
                  .map((c) => `${c.field} ${operatorShort(c.operator)} ${c.value}`)
                  .join(" · ")
              : "Always"
          }
        />
        <FlowArrow />
        <FlowChip
          label="Then"
          value={
            rule.actions
              .map((a) => actionLabels[a.type] ?? a.type.split("_").join(" "))
              .join(" → ") || "—"
          }
        />
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-black/[0.06] pt-3.5">
        <button
          type="button"
          onClick={onTest}
          className="h-8 rounded-lg border border-black/[0.1] px-2.5 text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
        >
          Test
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="h-8 rounded-lg border border-black/[0.1] px-2.5 text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="h-8 rounded-lg border border-[#F5C2C0] px-2.5 text-[11px] font-semibold text-[#B42318] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B42318]"
        >
          Delete
        </button>
      </div>
    </article>
  );
}

function RunRow({ run }: { run: AdminAutomationRun }) {
  const meta = runStatusMeta[run.status];
  return (
    <li className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
      <div className="shrink-0 sm:w-28">
        <time className="ez-mono text-[11px] text-[#6E6E73]" dateTime={run.at}>
          {formatRunAt(run.at)}
        </time>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold tracking-[-0.02em] text-[#1D1D1F]">
            {run.ruleName}
          </span>
          <span className="ez-mono text-[9px] uppercase tracking-[0.1em] text-[#AEAEB2]">
            {triggerLabels[run.trigger]}
          </span>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-[#6E6E73]">{run.summary}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}>
          {meta.label}
        </span>
        {run.delivery ? (
          <span
            className={`inline-flex rounded px-2 py-0.5 text-[10px] font-semibold ${
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

function FlowChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 max-w-full flex-1 rounded-xl border border-black/[0.05] bg-[#F7F7F8] px-2.5 py-2 sm:max-w-[11rem]">
      <div className="ez-mono text-[8px] uppercase tracking-[0.12em] text-[#AEAEB2]">{label}</div>
      <div className="mt-0.5 truncate text-[11px] font-semibold text-[#1D1D1F]" title={value}>
        {value}
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <span className="hidden self-center text-[#AEAEB2] sm:inline" aria-hidden>
      →
    </span>
  );
}

function StatusPill({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`inline-flex rounded px-2 py-0.5 text-[10px] font-semibold ${
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
      className={`relative h-6 w-10 shrink-0 rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] ${
        checked ? "bg-[#1D1D1F]" : "bg-[#D1D1D6]"
      }`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
          checked ? "left-5" : "left-1"
        }`}
      />
    </button>
  );
}

function EmptyState({
  title,
  body,
  actions,
}: {
  title: string;
  body: string;
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-black/[0.12] bg-white px-5 py-14 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#F0F0F2] text-[#6E6E73]">
        <BoltIcon />
      </div>
      <h2 className="mt-4 text-sm font-semibold text-[#1D1D1F]">{title}</h2>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[#86868B]">{body}</p>
      {actions ? <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{actions}</div> : null}
    </div>
  );
}

function BoltIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 2 4 14h7l-1 8 10-14h-7l1-6Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function operatorShort(op: AdminAutomationRule["conditions"][number]["operator"]) {
  if (op === "equals") return "=";
  if (op === "not_equals") return "≠";
  if (op === "contains") return "∋";
  return "≤";
}

function formatRunAt(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AutomationBuilder } from "@/components/admin/AutomationBuilder";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { isApiEnabled } from "@/lib/apiClient";
import type { AdminAutomationRule, AutomationTrigger } from "@/data/admin";
import {
  automationTemplateCategories,
  automationTemplates,
  categoryLabels,
  type AutomationTemplate,
  type AutomationTemplateCategory,
} from "@/data/automationTemplates";
import { useAutoBanner } from "@/hooks/useAutoBanner";
import { upsertAutomation } from "@/lib/adminStore";

const triggerLabels: Record<AutomationTrigger, string> = {
  order_status_changed: "Order status",
  stock_low: "Low stock",
  customer_created: "Customer created",
  preorder_released: "Pre-order released",
  payment_authorized: "Payment authorized",
  payment_captured: "Payment captured",
  payment_failed: "Payment failed",
};

const compactSelectClass = "h-9 rounded-lg shadow-none";

const actionShort: Record<string, string> = {
  notify_internal: "Notify",
  add_customer_tag: "Tag",
  update_order_status: "Status",
  send_email: "Email",
  send_whatsapp: "WhatsApp",
  send_webhook: "Webhook",
};

function ruleFromTemplate(template: AutomationTemplate): AdminAutomationRule {
  const now = new Date().toISOString();
  return {
    id: "",
    name: template.name,
    description: template.description,
    trigger: template.trigger,
    enabled: true,
    conditions: template.conditions.map((c) => ({ ...c })),
    actions: template.actions.map((a) => ({ ...a })),
    createdAt: now,
    updatedAt: now,
  };
}

export default function AdminAutomationTemplatesPage() {
  const [category, setCategory] = useState<AutomationTemplateCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<AdminAutomationRule | null>(null);
  const [toast, setToast] = useAutoBanner(2600);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return automationTemplates.filter((template) => {
      if (category !== "all" && template.category !== category) return false;
      return (
        !needle ||
        template.name.toLowerCase().includes(needle) ||
        template.description.toLowerCase().includes(needle) ||
        categoryLabels[template.category].toLowerCase().includes(needle)
      );
    });
  }, [category, query]);

  function openFromTemplate(template: AutomationTemplate) {
    setDraft(ruleFromTemplate(template));
    setToast("");
  }

  function saveRule(rule: AdminAutomationRule) {
    const id = rule.id || `auto-${Date.now()}`;
    upsertAutomation({ ...rule, id });
    setDraft(null);
    setToast(`Created “${rule.name}” from template`);
  }

  return (
    <div>
      <AdminPageHeader
        title="Automation templates"
        description="Starter recipes for gaming store ops — use a template to open the builder, then save as a live rule."
        breadcrumbs={[
          { label: "Automations", href: "/admin/automations" },
          { label: "Templates" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/automations"
              className="inline-flex h-9 items-center rounded-lg border border-black/[0.1] bg-white px-3.5 text-xs font-semibold text-[#1D1D1F] transition hover:bg-[#F5F5F7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
            >
              Back to rules
            </Link>
          </div>
        }
      />

      {isApiEnabled() ? (
        <AdminNotice tone="demo">
          Automations run on local demo data — a rule saved from a template is
          stored in this browser only, not on the live server.
        </AdminNotice>
      ) : null}

      <div
        className="mb-5 inline-flex w-full max-w-full gap-1 overflow-x-auto rounded-xl border border-black/[0.06] bg-[#F0F0F2] p-1 sm:w-auto"
        role="tablist"
        aria-label="Automations views"
      >
        <Link
          href="/admin/automations"
          role="tab"
          aria-selected={false}
          className="inline-flex shrink-0 items-center rounded-lg px-3.5 py-2 text-xs font-semibold text-[#6E6E73] transition hover:text-[#1D1D1F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
        >
          Rules
        </Link>
        <Link
          href="/admin/automations?tab=runs"
          role="tab"
          aria-selected={false}
          className="inline-flex shrink-0 items-center rounded-lg px-3.5 py-2 text-xs font-semibold text-[#6E6E73] transition hover:text-[#1D1D1F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
        >
          History
        </Link>
        <span
          role="tab"
          aria-selected
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-[#1D1D1F] shadow-[0_1px_2px_rgba(17,17,19,0.06)]"
        >
          Templates
          <span className="ez-mono text-[9px] text-[#86868B]">
            {automationTemplates.length}
          </span>
        </span>
      </div>

      <div className="mb-4 flex flex-col gap-2.5 rounded-xl border border-black/[0.06] bg-[#FAFAFB] px-3 py-2.5 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
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
              placeholder="Search templates…"
              className="h-9 w-full rounded-lg border border-black/[0.07] bg-white pl-8 pr-3 text-sm shadow-[0_1px_2px_rgba(17,17,19,0.03)] outline-none placeholder:text-[#AEAEB2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
            />
          </div>
          <span className="hidden shrink-0 ez-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[#86868B] sm:inline">
            {rows.length} templates
          </span>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <AdminSelect
            label="Category"
            value={category}
            onChange={(value) =>
              setCategory(value as AutomationTemplateCategory | "all")
            }
            options={automationTemplateCategories.map((item) => ({
              value: item.id,
              label: item.label,
            }))}
            className={compactSelectClass}
          />
        </div>
      </div>

      {rows.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onUse={() => openFromTemplate(template)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-black/[0.12] bg-white px-5 py-14 text-center">
          <h2 className="text-sm font-semibold text-[#1D1D1F]">No templates found</h2>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[#86868B]">
            Try another category or search term.
          </p>
          <button
            type="button"
            onClick={() => {
              setCategory("all");
              setQuery("");
            }}
            className="mt-4 h-9 rounded-lg border border-black/[0.1] bg-[#F7F7F8] px-3.5 text-xs font-semibold"
          >
            Clear filters
          </button>
        </div>
      )}

      {draft ? (
        <AutomationBuilder
          key={`tpl-${draft.name}`}
          rule={draft}
          onClose={() => setDraft(null)}
          onSave={saveRule}
        />
      ) : null}
    </div>
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

function TemplateCard({
  template,
  onUse,
}: {
  template: AutomationTemplate;
  onUse: () => void;
}) {
  return (
    <article className="group flex min-h-[220px] flex-col rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(17,17,19,0.03)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(17,17,19,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <span className="ez-mono rounded-md bg-[#F0F0F2] px-2 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-[#6E6E73]">
          {categoryLabels[template.category]}
        </span>
        <span className="ez-mono text-[9px] uppercase tracking-[0.1em] text-[#AEAEB2]">
          {triggerLabels[template.trigger]}
        </span>
      </div>
      <h2 className="mt-3 text-sm font-semibold tracking-[-0.02em] text-[#1D1D1F]">
        {template.name}
      </h2>
      <p className="mt-1.5 flex-1 text-xs leading-relaxed text-[#6E6E73]">
        {template.description}
      </p>

      <div className="mt-3 flex flex-wrap gap-1">
        {template.conditions.length === 0 ? (
          <span className="rounded bg-[#F7F7F8] px-2 py-0.5 text-[10px] font-medium text-[#86868B]">
            No conditions
          </span>
        ) : (
          <span className="rounded bg-[#F7F7F8] px-2 py-0.5 text-[10px] font-medium text-[#86868B]">
            {template.conditions.length} condition
            {template.conditions.length === 1 ? "" : "s"}
          </span>
        )}
        {template.actions.map((action, index) => (
          <span
            key={`${action.type}-${index}`}
            className="rounded bg-[#F7F7F8] px-2 py-0.5 text-[10px] font-medium text-[#1D1D1F]"
          >
            {actionShort[action.type] ?? action.type}
          </span>
        ))}
      </div>

      {template.tip ? (
        <p className="mt-2 text-[11px] leading-relaxed text-[#AEAEB2]">{template.tip}</p>
      ) : null}

      <div className="mt-4 border-t border-black/[0.06] pt-3.5">
        <button
          type="button"
          onClick={onUse}
          className="h-9 w-full rounded-lg bg-[#1D1D1F] text-xs font-semibold text-white transition hover:bg-[#2C2C2E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
        >
          Use template
        </button>
      </div>
    </article>
  );
}

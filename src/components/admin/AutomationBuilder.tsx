"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import type {
  AdminAutomationRule,
  AutomationAction,
  AutomationActionType,
  AutomationCondition,
  AutomationTrigger,
} from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { testAutomation } from "@/lib/adminStore";
import { api, isApiEnabled, type ApiMessageTemplate } from "@/lib/apiClient";

const triggers: { value: AutomationTrigger; label: string }[] = [
  { value: "order_status_changed", label: "Order status changed" },
  { value: "stock_low", label: "Stock is low" },
  { value: "customer_created", label: "Customer created" },
  { value: "preorder_released", label: "Pre-order released" },
  { value: "payment_authorized", label: "Payment authorized" },
  { value: "payment_captured", label: "Payment captured" },
  { value: "payment_failed", label: "Payment failed" },
];

const actionOptions: { value: AutomationActionType; label: string }[] = [
  { value: "notify_internal", label: "Notify internal team" },
  { value: "add_customer_tag", label: "Add customer tag" },
  { value: "update_order_status", label: "Update order status" },
  { value: "send_email", label: "Send email" },
  { value: "send_whatsapp", label: "Send WhatsApp" },
  { value: "send_webhook", label: "Send webhook" },
];

const operators: { value: AutomationCondition["operator"]; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not equals" },
  { value: "contains", label: "Contains" },
  { value: "less_than_or_equal", label: "≤" },
];

const fieldClass =
  "w-full rounded-xl border border-black/[0.08] bg-[#F7F7F8] px-3 py-2.5 text-sm outline-none transition hover:border-black/[0.12] focus:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

const labelClass =
  "ez-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#86868B]";

function emptyCondition(): AutomationCondition {
  return { field: "", operator: "equals", value: "" };
}

function emptyAction(): AutomationAction {
  return { type: "notify_internal", value: "" };
}

export function AutomationBuilder({
  rule,
  onClose,
  onSave,
  onTested,
}: {
  rule: AdminAutomationRule;
  onClose: () => void;
  onSave: (rule: AdminAutomationRule) => void;
  /** Called after a test event is fired from the footer */
  onTested?: (trigger: AutomationTrigger) => void;
}) {
  const { integrations } = useAdminStore();
  const [draft, setDraft] = useState(rule);
  const [nameError, setNameError] = useState(false);
  const [testHint, setTestHint] = useState("");

  const whatsapp = integrations.find((item) => item.id === "whatsapp");
  const webhooks = integrations.find((item) => item.id === "webhooks");
  const whatsappReady = Boolean(whatsapp?.enabled && whatsapp.status === "connected");

  /**
   * The wording this rule is allowed to send.
   *
   * MessageService refuses anything not both enabled AND approved by the
   * provider, so offering the rest would be offering rules that silently do
   * nothing — which is the bug this dropdown replaces.
   */
  const [sendableTemplates, setSendableTemplates] = useState<ApiMessageTemplate[]>([]);
  useEffect(() => {
    if (!isApiEnabled()) return;
    let cancelled = false;
    void api
      .messageTemplates()
      .then((res) => {
        if (cancelled) return;
        setSendableTemplates(
          (res.data ?? []).filter((t) => t.enabled && t.status === "approved"),
        );
      })
      .catch(() => {
        /* the dropdown stays empty and says so */
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const webhooksReady = Boolean(webhooks?.enabled && webhooks.status === "connected");

  function update(patch: Partial<AdminAutomationRule>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function setCondition(index: number, patch: Partial<AutomationCondition>) {
    update({
      conditions: draft.conditions.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    });
  }

  function setAction(index: number, patch: Partial<AutomationAction>) {
    update({
      actions: draft.actions.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    });
  }

  function handleSave() {
    if (!draft.name.trim()) {
      setNameError(true);
      return;
    }
    const conditions = draft.conditions.filter((c) => c.field.trim());
    const actions =
      draft.actions.length > 0 ? draft.actions : [emptyAction()];
    onSave({ ...draft, name: draft.name.trim(), conditions, actions });
  }

  function handleTest() {
    testAutomation(draft.trigger);
    setTestHint("Test event fired — check Run history");
    onTested?.(draft.trigger);
  }

  return (
    <AdminDrawer
      open
      title={draft.id ? "Edit automation" : "New automation"}
      subtitle="Rules run locally against simulated store events."
      onClose={onClose}
      widthClassName="max-w-lg sm:max-w-xl"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {testHint ? (
              <p role="status" aria-live="polite" className="text-[11px] font-medium text-[#2D6B3C]">
                {testHint}
              </p>
            ) : (
              <p className="text-[11px] text-[#86868B]">
                Test uses a sample payload for this trigger.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleTest}
              className="h-9 rounded-lg border border-black/[0.1] bg-white px-3 text-xs font-semibold text-[#1D1D1F] transition hover:bg-[#F5F5F7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
            >
              Test run
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-black/[0.1] px-3 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="h-9 rounded-lg bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white transition hover:bg-[#2C2C2E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
            >
              Save rule
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <BuilderSection step={1} title="Basics" description="Name and when this rule is live.">
          <label className="block">
            <span className={labelClass}>Rule name</span>
            <input
              className={`${fieldClass} mt-1.5 ${nameError && !draft.name.trim() ? "border-[#F5C2C0]" : ""}`}
              value={draft.name}
              onChange={(e) => {
                setNameError(false);
                update({ name: e.target.value });
              }}
              placeholder="e.g. Pending COD review"
              aria-invalid={nameError && !draft.name.trim()}
            />
            {nameError && !draft.name.trim() ? (
              <span className="mt-1 block text-[11px] text-[#B42318]">Name is required</span>
            ) : null}
          </label>
          <label className="mt-3 block">
            <span className={labelClass}>Description</span>
            <textarea
              className={`${fieldClass} mt-1.5 min-h-[72px]`}
              value={draft.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="What this rule does for ops"
            />
          </label>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-black/[0.06] bg-white px-3.5 py-3">
            <div>
              <div className="text-sm font-semibold text-[#1D1D1F]">Enable this rule</div>
              <div className="mt-0.5 text-[11px] text-[#86868B]">
                {draft.enabled ? "Active — will match events" : "Paused — skipped on events"}
              </div>
            </div>
            <Toggle
              checked={draft.enabled}
              onChange={(enabled) => update({ enabled })}
              label="Enable this rule"
            />
          </div>
        </BuilderSection>

        <BuilderSection step={2} title="Trigger" description="Event that starts the rule.">
          <label className="block">
            <span className={labelClass}>When this happens</span>
            <select
              className={`${fieldClass} mt-1.5`}
              value={draft.trigger}
              onChange={(e) => update({ trigger: e.target.value as AutomationTrigger })}
            >
              {triggers.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </BuilderSection>

        <BuilderSection
          step={3}
          title="Conditions"
          description="Optional filters — all must match."
        >
          {draft.conditions.length === 0 ? (
            <p className="text-xs text-[#86868B]">No conditions — rule runs on every trigger match.</p>
          ) : (
            <ul className="space-y-2">
              {draft.conditions.map((condition, index) => (
                <li
                  key={`cond-${index}`}
                  className="rounded-xl border border-black/[0.06] bg-white p-2.5"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="ez-mono text-[8px] uppercase tracking-[0.12em] text-[#AEAEB2]">
                      Condition {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        update({
                          conditions: draft.conditions.filter((_, i) => i !== index),
                        })
                      }
                      className="text-[11px] font-semibold text-[#B42318] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr]">
                    <input
                      className={fieldClass}
                      placeholder="Field (status, payment…)"
                      value={condition.field}
                      onChange={(e) => setCondition(index, { field: e.target.value })}
                      aria-label={`Condition ${index + 1} field`}
                    />
                    <select
                      className={`${fieldClass} sm:min-w-[7.5rem]`}
                      value={condition.operator}
                      onChange={(e) =>
                        setCondition(index, {
                          operator: e.target.value as AutomationCondition["operator"],
                        })
                      }
                      aria-label={`Condition ${index + 1} operator`}
                    >
                      {operators.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className={fieldClass}
                      placeholder="Value"
                      value={condition.value}
                      onChange={(e) => setCondition(index, { value: e.target.value })}
                      aria-label={`Condition ${index + 1} value`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => update({ conditions: [...draft.conditions, emptyCondition()] })}
            className="mt-2 h-8 rounded-lg border border-dashed border-black/[0.14] bg-white px-3 text-[11px] font-semibold text-[#1D1D1F] transition hover:bg-[#F7F7F8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
          >
            Add condition
          </button>
        </BuilderSection>

        <BuilderSection step={4} title="Actions" description="What runs when the rule matches.">
          <IntegrationChips whatsappReady={whatsappReady} webhooksReady={webhooksReady} />
          <ul className="mt-3 space-y-2">
            {draft.actions.map((action, index) => (
              <li
                key={`act-${index}`}
                className="rounded-xl border border-black/[0.06] bg-white p-2.5"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="ez-mono text-[8px] uppercase tracking-[0.12em] text-[#AEAEB2]">
                    Step {index + 1}
                    {index < draft.actions.length - 1 ? " →" : ""}
                  </span>
                  {draft.actions.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        update({
                          actions: draft.actions.filter((_, i) => i !== index),
                        })
                      }
                      className="text-[11px] font-semibold text-[#B42318] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <select
                  className={fieldClass}
                  value={action.type}
                  onChange={(e) =>
                    setAction(index, { type: e.target.value as AutomationActionType })
                  }
                  aria-label={`Action ${index + 1} type`}
                >
                  {actionOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                {/* A DROPDOWN for the message channels, never a text box.
                    This field was labelled "Message (optional)" and its value is
                    passed straight into MessageTemplate::where('event_key', …) —
                    the parameter on AutomationDispatcher::sendChannel is literally
                    named $eventKey. So anything that reads like a message ("Your
                    pre-order is ready") matched no template and every send was
                    recorded as blocked. The owner had written a message and the
                    shop sent nothing, with the rule showing as active. */}
                {action.type === "send_whatsapp" || action.type === "send_email" ? (
                  <>
                    <select
                      className={`${fieldClass} mt-2`}
                      value={action.value ?? ""}
                      onChange={(e) => setAction(index, { value: e.target.value })}
                      aria-label={`Action ${index + 1} message wording`}
                    >
                      <option value="">Choose the wording to send…</option>
                      {sendableTemplates.map((t) => (
                        <option key={`${t.event_key}-${t.channel}`} value={t.event_key}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    {sendableTemplates.length === 0 ? (
                      <p className="mt-1.5 text-[11px] text-[#9A3412]">
                        No message wording is approved yet, so this rule cannot send anything. Set
                        one up under Message templates first.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <input
                    className={`${fieldClass} mt-2`}
                    placeholder={actionValuePlaceholder(action.type)}
                    value={action.value ?? ""}
                    onChange={(e) => setAction(index, { value: e.target.value })}
                    aria-label={`Action ${index + 1} value`}
                  />
                )}
                {(action.type === "send_whatsapp" && !whatsappReady) ||
                (action.type === "send_webhook" && !webhooksReady) ? (
                  <p className="mt-1.5 text-[11px] text-[#9A3412]">
                    Delivery may be blocked until the integration is connected.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => update({ actions: [...draft.actions, emptyAction()] })}
            className="mt-2 h-8 rounded-lg border border-dashed border-black/[0.14] bg-white px-3 text-[11px] font-semibold text-[#1D1D1F] transition hover:bg-[#F7F7F8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
          >
            Add action
          </button>
        </BuilderSection>
      </div>
    </AdminDrawer>
  );
}

function BuilderSection({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-black/[0.06] bg-[#FAFAFB] p-4">
      <header className="mb-3 flex items-start gap-3">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#1D1D1F] ez-mono text-[10px] font-semibold text-white"
          aria-hidden
        >
          {step}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-[-0.02em] text-[#1D1D1F]">{title}</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[#86868B]">{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function IntegrationChips({
  whatsappReady,
  webhooksReady,
}: {
  whatsappReady: boolean;
  webhooksReady: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Integration availability">
      <span
        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold ${
          whatsappReady ? "bg-[#EAF6ED] text-[#2D6B3C]" : "bg-[#F0F0F2] text-[#6E6E73]"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${whatsappReady ? "bg-[#2D6B3C]" : "bg-[#AEAEB2]"}`}
          aria-hidden
        />
        WhatsApp {whatsappReady ? "ready" : "off"}
      </span>
      <span
        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold ${
          webhooksReady ? "bg-[#EAF6ED] text-[#2D6B3C]" : "bg-[#F0F0F2] text-[#6E6E73]"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${webhooksReady ? "bg-[#2D6B3C]" : "bg-[#AEAEB2]"}`}
          aria-hidden
        />
        Webhooks {webhooksReady ? "ready" : "off"}
      </span>
    </div>
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
      className={`relative h-6 w-10 rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] ${
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

function actionValuePlaceholder(type: AutomationActionType) {
  switch (type) {
    case "add_customer_tag":
      return "Tag name";
    case "update_order_status":
      return "Status (e.g. confirmed)";
    case "notify_internal":
      return "Note to your team (optional)";
    case "send_webhook":
      return "Event key (e.g. inventory.low)";
    default:
      return "Value (optional)";
  }
}

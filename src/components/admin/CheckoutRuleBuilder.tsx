"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { useAdminStore } from "@/hooks/useAdminStore";
import {
  evalCheckoutScript,
  mockExperimentStats,
  resolveCheckoutPolicy,
  type AdminCheckoutRule,
  type CheckoutActionType,
  type CheckoutConditionField,
  type CheckoutConditionMode,
  type CheckoutContext,
  type CheckoutRuleAction,
  type CheckoutRuleCondition,
} from "@/lib/checkoutRules";
import { formatInr } from "@/data/admin";

const fieldClass =
  "w-full rounded-xl border border-black/[0.08] bg-[#F7F7F8] px-3 py-2.5 text-sm outline-none transition hover:border-black/[0.12] focus:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

const labelClass =
  "ez-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#86868B]";

const conditionFields: { value: CheckoutConditionField; label: string }[] = [
  { value: "subtotal", label: "Subtotal" },
  { value: "pincode", label: "PIN code" },
  { value: "city", label: "City" },
  { value: "payment_method", label: "Payment method" },
  { value: "fulfillment_type", label: "Fulfillment type" },
  { value: "product_category", label: "Product category" },
];

const operators: { value: CheckoutRuleCondition["operator"]; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not equals" },
  { value: "contains", label: "Contains" },
  { value: "less_than_or_equal", label: "≤" },
];

const actionOptions: { value: CheckoutActionType; label: string; hint: string }[] = [
  { value: "allow_payment_methods", label: "Allow payment methods", hint: "prepaid,cod" },
  { value: "hide_payment_method", label: "Hide payment method", hint: "cod or prepaid" },
  { value: "set_prepaid_discount_pct", label: "Set prepaid discount %", hint: "e.g. 12" },
  { value: "set_cod_max", label: "Set COD maximum", hint: "e.g. 10000" },
  { value: "set_shipping", label: "Set shipping", hint: "free | flat:99 | message" },
  { value: "require_field", label: "Require field", hint: "upi, lastName…" },
  { value: "hide_field", label: "Hide field", hint: "upi, lastName…" },
  { value: "set_banner", label: "Set banner message", hint: "Customer-facing copy" },
  { value: "block_checkout", label: "Block checkout", hint: "Error message" },
  { value: "allow_gateways", label: "Allow gateways", hint: "upi,card,wallet,cod" },
  { value: "hide_gateway", label: "Hide gateway", hint: "wallet" },
  { value: "prefer_gateway", label: "Prefer gateway", hint: "upi" },
  { value: "set_tax_rate", label: "Set tax rate %", hint: "18" },
  { value: "set_tax_inclusive_message", label: "Tax inclusive message", hint: "GST included" },
  { value: "exempt_tax", label: "Exempt tax", hint: "true" },
  { value: "set_carrier", label: "Set carrier", hint: "bluedart:0" },
  { value: "set_rate_table", label: "Set rate table", hint: "bluedart:0,delhivery:79" },
  { value: "hide_carrier", label: "Hide carrier", hint: "dunzo" },
  { value: "set_deposit_pct", label: "Set deposit %", hint: "25" },
  { value: "enable_pay_later", label: "Enable pay later", hint: "true" },
  { value: "split_payment", label: "Split payment", hint: "25:Pay now|75:On release" },
];

function emptyCondition(): CheckoutRuleCondition {
  return { field: "subtotal", operator: "less_than_or_equal", value: "", mode: "row" };
}

function emptyAction(): CheckoutRuleAction {
  return { type: "set_banner", value: "" };
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition ${
        checked ? "bg-[#1D1D1F]" : "bg-[#D2D2D7]"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
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
      <div className="mb-3 flex items-start gap-3">
        <span className="ez-mono flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1D1D1F] text-[10px] font-bold text-white">
          {step}
        </span>
        <div>
          <h3 className="text-sm font-semibold text-[#1D1D1F]">{title}</h3>
          <p className="mt-0.5 text-[11px] text-[#86868B]">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function CheckoutRuleBuilder({
  rule,
  onClose,
  onSave,
}: {
  rule: AdminCheckoutRule;
  onClose: () => void;
  onSave: (rule: AdminCheckoutRule) => void;
}) {
  const { settings } = useAdminStore();
  const [draft, setDraft] = useState(rule);
  const [nameError, setNameError] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(
    Boolean(rule.conditionMode === "script" || rule.script || rule.experimentId),
  );
  const [preview, setPreview] = useState<CheckoutContext>({
    subtotal: 5999,
    pincode: "560001",
    city: "Bengaluru",
    fulfillmentType: "preorder",
    productCategory: "preorders",
    sessionKey: "preview-session",
  });

  function update(patch: Partial<AdminCheckoutRule>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  const scriptPreview = useMemo(() => {
    if (draft.conditionMode !== "script" || !draft.script?.trim()) {
      return { ok: true as const };
    }
    return evalCheckoutScript(draft.script, preview);
  }, [draft.conditionMode, draft.script, preview]);

  const policy = useMemo(
    () => resolveCheckoutPolicy(settings, [draft], preview),
    [settings, draft, preview],
  );

  const experimentStats =
    draft.experimentId && draft.variant
      ? mockExperimentStats(draft.experimentId, draft.variant)
      : null;

  function handleSave() {
    if (!draft.name.trim()) {
      setNameError(true);
      return;
    }
    if (draft.conditionMode === "script" && draft.script?.trim() && !scriptPreview.ok) {
      return;
    }
    onSave({
      ...draft,
      name: draft.name.trim(),
      conditions:
        draft.conditionMode === "script"
          ? []
          : draft.conditions.filter((c) => c.field.trim()),
      actions: draft.actions.length ? draft.actions : [emptyAction()],
    });
  }

  return (
    <AdminDrawer
      open
      title={draft.id ? "Edit checkout rule" : "New checkout rule"}
      subtitle="Evaluated on checkout — layers on top of Settings defaults."
      onClose={onClose}
      widthClassName="max-w-lg sm:max-w-xl"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-black/[0.1] px-3 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="h-9 rounded-lg bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white hover:bg-[#2C2C2E]"
          >
            Save rule
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <BuilderSection step={1} title="Basics" description="Name, priority, and enable.">
          <label className="block">
            <span className={labelClass}>Rule name</span>
            <input
              className={`${fieldClass} mt-1.5 ${nameError && !draft.name.trim() ? "border-[#F5C2C0]" : ""}`}
              value={draft.name}
              onChange={(e) => {
                setNameError(false);
                update({ name: e.target.value });
              }}
              placeholder="e.g. Hide COD above ₹10,000"
            />
          </label>
          <label className="mt-3 block">
            <span className={labelClass}>Description</span>
            <textarea
              className={`${fieldClass} mt-1.5 min-h-[64px]`}
              value={draft.description}
              onChange={(e) => update({ description: e.target.value })}
            />
          </label>
          <label className="mt-3 block">
            <span className={labelClass}>Priority (lower runs first)</span>
            <input
              type="number"
              className={`${fieldClass} mt-1.5`}
              value={draft.priority}
              onChange={(e) => update({ priority: Number(e.target.value) || 0 })}
            />
          </label>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-black/[0.06] bg-white px-3.5 py-3">
            <div>
              <div className="text-sm font-semibold">Enable this rule</div>
              <div className="text-[11px] text-[#86868B]">
                {draft.enabled ? "Active on checkout" : "Paused"}
              </div>
            </div>
            <Toggle
              checked={draft.enabled}
              onChange={(enabled) => update({ enabled })}
              label="Enable rule"
            />
          </div>
        </BuilderSection>

        <BuilderSection
          step={2}
          title="Conditions"
          description="Row conditions (default) or advanced script mode."
        >
          <div className="mb-3 flex gap-2">
            {(["rows", "script"] as CheckoutConditionMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => update({ conditionMode: mode })}
                className={`h-8 rounded-lg px-3 text-[11px] font-semibold ${
                  (draft.conditionMode ?? "rows") === mode
                    ? "bg-[#1D1D1F] text-white"
                    : "border border-black/[0.1] bg-white"
                }`}
              >
                {mode === "rows" ? "Row conditions" : "Script"}
              </button>
            ))}
          </div>

          {(draft.conditionMode ?? "rows") === "script" ? (
            <div>
              <label className="block">
                <span className={labelClass}>Expression</span>
                <textarea
                  className={`${fieldClass} mt-1.5 min-h-[88px] font-mono text-[12px] ${
                    draft.script?.trim() && !scriptPreview.ok ? "border-[#F5C2C0]" : ""
                  }`}
                  value={draft.script ?? ""}
                  onChange={(e) => update({ script: e.target.value })}
                  placeholder="subtotal >= 5000 && pincode.startsWith('56')"
                />
              </label>
              {draft.script?.trim() ? (
                <p
                  className={`mt-2 text-[11px] ${
                    scriptPreview.ok ? "text-[#2D6B3C]" : "text-[#B42318]"
                  }`}
                >
                  {scriptPreview.ok
                    ? "Script evaluates true for preview cart."
                    : scriptPreview.error ?? "Script evaluates false."}
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-[#86868B]">
                  Empty script = always match. Use identifiers: subtotal, pincode, city,
                  payment_method, fulfillment_type, product_category.
                </p>
              )}
            </div>
          ) : draft.conditions.length === 0 ? (
            <p className="text-xs text-[#86868B]">No conditions — rule always matches.</p>
          ) : (
            <ul className="space-y-2">
              {draft.conditions.map((condition, index) => (
                <li
                  key={`c-${index}`}
                  className="rounded-xl border border-black/[0.06] bg-white p-2.5"
                >
                  <div className="mb-2 flex justify-between">
                    <span className="ez-mono text-[8px] uppercase tracking-[0.12em] text-[#AEAEB2]">
                      Condition {index + 1}
                    </span>
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-[#B42318]"
                      onClick={() =>
                        update({
                          conditions: draft.conditions.filter((_, i) => i !== index),
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr]">
                    <select
                      className={fieldClass}
                      value={condition.field}
                      onChange={(e) =>
                        update({
                          conditions: draft.conditions.map((c, i) =>
                            i === index ? { ...c, field: e.target.value } : c,
                          ),
                        })
                      }
                    >
                      {conditionFields.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className={`${fieldClass} sm:min-w-[7rem]`}
                      value={condition.operator}
                      onChange={(e) =>
                        update({
                          conditions: draft.conditions.map((c, i) =>
                            i === index
                              ? {
                                  ...c,
                                  operator: e.target
                                    .value as CheckoutRuleCondition["operator"],
                                }
                              : c,
                          ),
                        })
                      }
                    >
                      {operators.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className={fieldClass}
                      value={condition.value}
                      onChange={(e) =>
                        update({
                          conditions: draft.conditions.map((c, i) =>
                            i === index ? { ...c, value: e.target.value } : c,
                          ),
                        })
                      }
                      placeholder="Value"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {(draft.conditionMode ?? "rows") === "rows" ? (
            <button
              type="button"
              onClick={() =>
                update({ conditions: [...draft.conditions, emptyCondition()] })
              }
              className="mt-2 h-8 rounded-lg border border-dashed border-black/[0.14] bg-white px-3 text-[11px] font-semibold"
            >
              Add condition
            </button>
          ) : null}
        </BuilderSection>

        <BuilderSection step={3} title="Actions" description="Applied when conditions match.">
          <ul className="space-y-2">
            {draft.actions.map((action, index) => (
              <li
                key={`a-${index}`}
                className="rounded-xl border border-black/[0.06] bg-white p-2.5"
              >
                <div className="mb-2 flex justify-between">
                  <span className="ez-mono text-[8px] uppercase tracking-[0.12em] text-[#AEAEB2]">
                    Action {index + 1}
                  </span>
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-[#B42318]"
                    onClick={() =>
                      update({
                        actions: draft.actions.filter((_, i) => i !== index),
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
                <select
                  className={fieldClass}
                  value={action.type}
                  onChange={(e) =>
                    update({
                      actions: draft.actions.map((a, i) =>
                        i === index
                          ? { ...a, type: e.target.value as CheckoutActionType }
                          : a,
                      ),
                    })
                  }
                >
                  {actionOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <input
                  className={`${fieldClass} mt-2`}
                  value={action.value ?? ""}
                  onChange={(e) =>
                    update({
                      actions: draft.actions.map((a, i) =>
                        i === index ? { ...a, value: e.target.value } : a,
                      ),
                    })
                  }
                  placeholder={
                    actionOptions.find((o) => o.value === action.type)?.hint ??
                    "Value"
                  }
                />
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => update({ actions: [...draft.actions, emptyAction()] })}
            className="mt-2 h-8 rounded-lg border border-dashed border-black/[0.14] bg-white px-3 text-[11px] font-semibold"
          >
            Add action
          </button>
        </BuilderSection>

        <BuilderSection
          step={4}
          title="Advanced"
          description="A/B experiment metadata and traffic split."
        >
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="mb-3 text-[11px] font-semibold text-[#424245] underline-offset-2 hover:underline"
          >
            {advancedOpen ? "Hide experiment fields" : "Show experiment fields"}
          </button>
          {advancedOpen ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className={labelClass}>Experiment ID</span>
                <input
                  className={`${fieldClass} mt-1.5`}
                  value={draft.experimentId ?? ""}
                  onChange={(e) => update({ experimentId: e.target.value || undefined })}
                  placeholder="exp-checkout-banner"
                />
              </label>
              <label className="block">
                <span className={labelClass}>Variant</span>
                <input
                  className={`${fieldClass} mt-1.5`}
                  value={draft.variant ?? ""}
                  onChange={(e) => update({ variant: e.target.value || undefined })}
                  placeholder="control"
                />
              </label>
              <label className="block">
                <span className={labelClass}>Traffic %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={`${fieldClass} mt-1.5`}
                  value={draft.trafficPct ?? ""}
                  onChange={(e) =>
                    update({
                      trafficPct:
                        e.target.value === ""
                          ? undefined
                          : Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                    })
                  }
                  placeholder="50"
                />
              </label>
              {experimentStats ? (
                <div className="sm:col-span-2 rounded-xl border border-black/[0.06] bg-white px-3.5 py-3 text-[12px] text-[#3A3A3C]">
                  <p className="font-semibold">Mock conversion (demo)</p>
                  <p className="mt-1">
                    {experimentStats.sessions.toLocaleString("en-IN")} sessions ·{" "}
                    {experimentStats.conversions} conversions ·{" "}
                    {experimentStats.ratePct}% CVR
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-[#86868B]">
              Optional — bucket rules by session hash for A/B tests.
            </p>
          )}
        </BuilderSection>

        <BuilderSection
          step={5}
          title="Preview"
          description="Sample cart — see resolved policy for this rule alone."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Subtotal</span>
              <input
                type="number"
                className={`${fieldClass} mt-1`}
                value={preview.subtotal}
                onChange={(e) =>
                  setPreview((p) => ({
                    ...p,
                    subtotal: Number(e.target.value) || 0,
                  }))
                }
              />
            </label>
            <label className="block">
              <span className={labelClass}>PIN</span>
              <input
                className={`${fieldClass} mt-1`}
                value={preview.pincode ?? ""}
                onChange={(e) =>
                  setPreview((p) => ({ ...p, pincode: e.target.value }))
                }
              />
            </label>
            <label className="block">
              <span className={labelClass}>Fulfillment</span>
              <select
                className={`${fieldClass} mt-1`}
                value={preview.fulfillmentType ?? "preorder"}
                onChange={(e) =>
                  setPreview((p) => ({
                    ...p,
                    fulfillmentType: e.target.value as CheckoutContext["fulfillmentType"],
                  }))
                }
              >
                <option value="preorder">Pre-order</option>
                <option value="physical">Physical</option>
                <option value="digital">Digital</option>
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>Session key</span>
              <input
                className={`${fieldClass} mt-1`}
                value={preview.sessionKey ?? ""}
                onChange={(e) =>
                  setPreview((p) => ({ ...p, sessionKey: e.target.value }))
                }
              />
            </label>
          </div>
          <div className="mt-3 space-y-1.5 rounded-xl border border-black/[0.06] bg-white px-3.5 py-3 text-[12px] text-[#3A3A3C]">
            <p>
              <span className="font-semibold">Methods:</span>{" "}
              {policy.methods.join(", ")}
            </p>
            <p>
              <span className="font-semibold">Gateways:</span>{" "}
              {policy.gateways.join(", ")}
              {policy.preferredGateway ? ` (pref ${policy.preferredGateway})` : ""}
            </p>
            <p>
              <span className="font-semibold">Prepaid discount:</span>{" "}
              {policy.prepaidDiscountPct}%
            </p>
            <p>
              <span className="font-semibold">COD max:</span>{" "}
              {formatInr(policy.codMax)}
            </p>
            <p>
              <span className="font-semibold">Shipping:</span> {policy.shippingLabel}
            </p>
            <p>
              <span className="font-semibold">Tax:</span>{" "}
              {policy.taxExempt
                ? "Exempt"
                : `${policy.taxRatePct}%`}
              {policy.taxInclusiveMessage ? ` · ${policy.taxInclusiveMessage}` : ""}
            </p>
            <p>
              <span className="font-semibold">Carriers:</span>{" "}
              {policy.carriers.length
                ? policy.carriers
                    .map((c) => `${c.label} (${c.amount === 0 ? "FREE" : formatInr(c.amount)})`)
                    .join(", ")
                : "—"}
            </p>
            {(policy.depositPct != null || policy.splitPayments.length > 0) && (
              <p>
                <span className="font-semibold">Partial pay:</span>{" "}
                {policy.depositPct != null ? `${policy.depositPct}% deposit` : ""}
                {policy.splitPayments.length
                  ? ` · ${policy.splitPayments.map((s) => s.label).join(" | ")}`
                  : ""}
              </p>
            )}
            {policy.activeExperiment ? (
              <p>
                <span className="font-semibold">Experiment:</span>{" "}
                {policy.activeExperiment.experimentId} → {policy.activeExperiment.variant}
              </p>
            ) : null}
            {policy.banner ? (
              <p>
                <span className="font-semibold">Banner:</span> {policy.banner}
              </p>
            ) : null}
            {policy.blocked ? (
              <p className="font-semibold text-[#B42318]">
                Blocked — {policy.blockMessage}
              </p>
            ) : null}
          </div>
        </BuilderSection>
      </div>
    </AdminDrawer>
  );
}

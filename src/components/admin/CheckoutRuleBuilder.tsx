"use client";

import { useState } from "react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { RuleSentence } from "@/components/admin/RuleSentence";
import {
  buildCheckoutSentence,
  checkoutSentenceText,
  CHECKOUT_ACTION_WORDS,
  deadConditions,
  describeRuleEffect,
  EXAMPLE_ORDER_AMOUNTS,
  ORDER_KIND_OPTIONS,
  PAY_WITH_OPTIONS,
  proseActions,
  setCheckoutClause,
  typedConditions,
  writeActionValue,
  writeCarrierCharge,
  type AdminCheckoutRule,
  type CheckoutActionType,
  type ExampleOrder,
} from "@/lib/checkoutRules";
import type { AdminSettings } from "@/data/admin";
import { formatInr } from "@/data/admin";

/**
 * Write one checkout rule, as one sentence.
 *
 * What was here: five numbered sections — Basics, Conditions, Actions,
 * Advanced, Preview — inside one drawer. Conditions was a grid of
 * field / operator / value where the value was typed free text and the operator
 * was rendered as "≤". Actions was a dropdown of twenty-three names like
 * "Set rate table" over an input whose placeholder was `bluedart:0,delhivery:79`.
 * Advanced asked for an "Experiment ID" and a "Traffic %", and printed an
 * invented conversion rate under them. Preview listed nine resolved values
 * including "Gateways: upi, card, wallet (pref upi)".
 *
 * Nothing on it said what a customer would be charged. The owner could save a
 * rule that read perfectly in the grid and did nothing at all, and the only way
 * to find out was a customer at the counter asking why delivery was ₹79.
 *
 * Now: the rule IS the sentence, every choice inside it comes from a list, and
 * under it sits one order of his choosing with the rupees this rule moves.
 */

const fieldClass =
  "w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-sm outline-none transition hover:border-black/[0.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

const addBtnClass =
  "h-8 rounded-lg border border-dashed border-black/[0.16] bg-white px-2.5 text-[11px] font-semibold text-[#424245] transition hover:border-black/[0.28] hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

/** A blank rule that already says something, so the sentence is never empty. */
export function blankCheckoutRule(): AdminCheckoutRule {
  const now = new Date().toISOString();
  return {
    id: "",
    name: "",
    description: "",
    enabled: true,
    priority: 100,
    conditions: [],
    actions: [{ type: "set_shipping", value: "free" }],
    createdAt: now,
    updatedAt: now,
  };
}

export function CheckoutRuleBuilder({
  rule,
  settings,
  otherRules,
  order,
  onOrderChange,
  saving = false,
  error,
  onClose,
  onSave,
}: {
  rule: AdminCheckoutRule;
  settings: AdminSettings;
  /** Every rule in the shop, so the money line accounts for the ones beside it. */
  otherRules: AdminCheckoutRule[];
  order: ExampleOrder;
  onOrderChange: (order: ExampleOrder) => void;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (rule: AdminCheckoutRule) => void;
}) {
  const [draft, setDraft] = useState<AdminCheckoutRule>(rule);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const editableSlots = buildCheckoutSentence(draft, {
    onOrderKind: (value) =>
      setDraft((prev) => ({
        ...prev,
        conditions: setCheckoutClause(prev.conditions, "fulfillment_type", "equals", value),
      })),
    onPayWith: (value) =>
      setDraft((prev) => ({
        ...prev,
        conditions: setCheckoutClause(prev.conditions, "payment_method", "equals", value),
      })),
    onUpToAmount: (value) =>
      setDraft((prev) => ({
        ...prev,
        conditions: setCheckoutClause(prev.conditions, "subtotal", "less_than_or_equal", value),
      })),
    onActionType: (index, value) =>
      setDraft((prev) => ({
        ...prev,
        actions: prev.actions.map((action, i) =>
          // The old value belonged to the old thing — a delivery charge is not
          // a percentage and a courier is not a note — so it goes with it.
          i === index ? { type: value as CheckoutActionType, value: "" } : action,
        ),
      })),
    onActionValue: (index, value) =>
      setDraft((prev) => ({
        ...prev,
        actions: prev.actions.map((action, i) =>
          i === index ? writeActionValue(action, value) : action,
        ),
      })),
    onCarrierCharge: (index, value) =>
      setDraft((prev) => ({
        ...prev,
        actions: prev.actions.map((action, i) =>
          i === index ? writeCarrierCharge(action, value) : action,
        ),
      })),
  });

  const sentence = checkoutSentenceText(draft);
  const typed = typedConditions(draft);
  const prose = proseActions(draft);
  const dead = deadConditions(draft);

  const hasKind = draft.conditions.some(
    (c) => c.field === "fulfillment_type" && c.operator === "equals",
  );
  const hasAmount = draft.conditions.some(
    (c) => c.field === "subtotal" && c.operator === "less_than_or_equal",
  );
  const hasPayWith = draft.conditions.some(
    (c) => c.field === "payment_method" && c.operator === "equals",
  );

  /**
   * A rule with a blank in it saves happily and then behaves wrongly.
   *
   * An unset action does nothing at all; an empty PIN-code clause is worse,
   * because "has  in it" is true of every order, so a rule he wrote for one
   * corner of the city would quietly apply to the whole country.
   */
  const blankValues = draft.conditions.filter((c) => !c.value.trim());
  const unfinished =
    blankValues.length > 0 ||
    draft.actions.some((action) => {
      const words = CHECKOUT_ACTION_WORDS[action.type];
      if (!words) return false;
      if (words.readOnly) return false;
      return !String(action.value ?? "").trim();
    });

  // The blank may be behind Details — the note a customer reads, or a PIN code.
  // Leaving it folded away while the Save button is disabled would be a dead
  // end, so Details opens itself whenever something in it is still to fill in.
  const showDetails =
    detailsOpen ||
    blankValues.length > 0 ||
    prose.some((entry) => !String(entry.action.value ?? "").trim());

  function addCondition(field: string, operator: "equals" | "less_than_or_equal", value: string) {
    setDraft((prev) => ({
      ...prev,
      conditions: setCheckoutClause(prev.conditions, field, operator, value),
    }));
  }

  function save() {
    onSave({
      ...draft,
      // Named after what it says. The old builder demanded a name before it
      // would save, so the list filled with "Enforce COD maximum" over a line
      // reading "Always · COD max" — two half-truths and no sentence.
      name: sentence.slice(0, 160),
      description: "",
    });
  }

  return (
    <AdminDrawer
      open
      title={draft.id ? "Change this checkout rule" : "A new checkout rule"}
      subtitle="One rule, one sentence. Change the words in it."
      onClose={onClose}
      widthClassName="max-w-lg sm:max-w-xl"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 text-[11px] text-[#86868B]">
            {blankValues.length > 0
              ? "Fill in the empty box under Details, or take that part out."
              : unfinished
                ? "Finish the part in orange, or this rule will do nothing."
                : "Saved rules apply to the next order that comes in."}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-black/[0.1] px-3 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
            >
              Leave it as it was
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || unfinished}
              className="h-9 rounded-lg bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white transition hover:bg-[#2C2C2E] disabled:cursor-not-allowed disabled:bg-[#C7C7CC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
            >
              {saving ? "Saving…" : draft.id ? "Save this" : "Turn it on"}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* A failure stays here, with his sentence still on the screen. A toast
            for a rule that did not save is a rule he believes is running. */}
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-[#F5C2C0] bg-[#FDECEC] px-3 py-2 text-[12px] font-medium text-[#B42318]"
          >
            {error}
          </div>
        ) : null}

        <section className="rounded-2xl border border-black/[0.06] bg-[#FAFAFB] p-4">
          <RuleSentence slots={editableSlots} />

          <div className="mt-3 flex flex-wrap gap-1.5">
            {!hasKind ? (
              <button
                type="button"
                className={addBtnClass}
                onClick={() => addCondition("fulfillment_type", "equals", "digital")}
              >
                + only one kind of order
              </button>
            ) : null}
            {!hasAmount ? (
              <button
                type="button"
                className={addBtnClass}
                onClick={() => addCondition("subtotal", "less_than_or_equal", "1999")}
              >
                + only up to an amount
              </button>
            ) : null}
            {!hasPayWith ? (
              <button
                type="button"
                className={addBtnClass}
                onClick={() => addCondition("payment_method", "equals", "cod")}
              >
                + only one way of paying
              </button>
            ) : null}
            <button
              type="button"
              className={addBtnClass}
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  actions: [...prev.actions, { type: "set_banner", value: "" }],
                }))
              }
            >
              + do something else too
            </button>
          </div>

          {draft.actions.length > 1 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {draft.actions.map((action, index) => (
                <button
                  key={`drop-${index}`}
                  type="button"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      actions: prev.actions.filter((_, i) => i !== index),
                    }))
                  }
                  className="h-7 rounded-lg px-2 text-[11px] font-semibold text-[#B42318] transition hover:bg-[#FFF5F5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B42318]"
                >
                  Take out “{CHECKOUT_ACTION_WORDS[action.type]?.before || action.type}”
                </button>
              ))}
            </div>
          ) : null}
        </section>

        {dead.length > 0 ? (
          <p className="rounded-xl border border-[#F4D8A8] bg-[#FEF6E7] px-3 py-2 text-[11px] font-medium text-[#8A5A00]">
            This rule waits for {dead.map((c) => c.field).join(", ")}, which the checkout no longer
            records — so it can never run. Take that part out under Details, or delete the rule.
          </p>
        ) : null}

        <WhatThisDoes
          settings={settings}
          allRules={otherRules}
          rule={draft}
          order={order}
          onOrderChange={onOrderChange}
        />

        <section className="rounded-2xl border border-black/[0.06] bg-white">
          <button
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            aria-expanded={showDetails}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-[13px] font-semibold text-[#1D1D1F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
          >
            Details
            <span aria-hidden className="text-[10px] text-[#86868B]">
              {showDetails ? "▲" : "▼"}
            </span>
          </button>
          {showDetails ? (
            <div className="space-y-3 border-t border-black/[0.05] px-4 py-3">
              {typed.length === 0 && prose.length === 0 && !draft.experimentId ? (
                <p className="text-[11px] text-[#86868B]">Nothing else to set for this one.</p>
              ) : null}

              {/* Words a customer reads. Typed, never chosen — and kept apart
                  from the sentence so prose can never be mistaken for a
                  setting the checkout will act on. */}
              {prose.map(({ action, index, label }) => (
                <label key={`prose-${index}`} className="block">
                  <span className="text-[11px] font-semibold text-[#1D1D1F]">{label}</span>
                  <textarea
                    className={`${fieldClass} mt-1 min-h-[60px]`}
                    value={action.value ?? ""}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        actions: prev.actions.map((a, i) =>
                          i === index ? { ...a, value: e.target.value } : a,
                        ),
                      }))
                    }
                  />
                  <span className="mt-1 block text-[11px] text-[#86868B]">
                    The customer reads this word for word.
                  </span>
                </label>
              ))}

              {/* PIN codes and city names are typed, so they get a box rather
                  than a dropdown. Everything else in the rule is a list. */}
              {typed.map(({ condition, index, label }) => (
                <label key={`typed-${index}`} className="block">
                  <span className="text-[11px] font-semibold text-[#1D1D1F]">{label}</span>
                  <div className="mt-1 flex gap-2">
                    <input
                      className={fieldClass}
                      value={condition.value}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          conditions: prev.conditions.map((c, i) =>
                            i === index ? { ...c, value: e.target.value } : c,
                          ),
                        }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          conditions: prev.conditions.filter((_, i) => i !== index),
                        }))
                      }
                      className="h-[38px] shrink-0 rounded-lg px-2.5 text-[11px] font-semibold text-[#B42318] transition hover:bg-[#FFF5F5]"
                    >
                      Take out
                    </button>
                  </div>
                </label>
              ))}

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className={addBtnClass}
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      conditions: [
                        ...prev.conditions,
                        { field: "pincode", operator: "contains", value: "" },
                      ],
                    }))
                  }
                >
                  + only certain PIN codes
                </button>
                <button
                  type="button"
                  className={addBtnClass}
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      conditions: [
                        ...prev.conditions,
                        { field: "city", operator: "equals", value: "" },
                      ],
                    }))
                  }
                >
                  + only one city
                </button>
              </div>

              {/* Kept exactly as saved. A split test set up by someone else must
                  not quietly become a rule for everybody because we redesigned
                  the screen around the ordinary case. */}
              {draft.experimentId ? (
                <div className="rounded-xl border border-black/[0.06] bg-[#FAFAFB] px-3 py-2">
                  <div className="text-[11px] font-semibold text-[#1D1D1F]">
                    Shown to only some customers
                  </div>
                  <p className="mt-1 text-[11px] text-[#6E6E73]">
                    This rule is one side of a test somebody set up
                    {draft.trafficPct ? `, reaching about ${draft.trafficPct} in 100 shoppers` : ""}.
                    It is kept exactly as it is. Ask whoever set it up before changing it.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <p className="text-[11px] text-[#86868B]">
          Saved as: <span className="text-[#424245]">{sentence}</span>
        </p>
      </div>
    </AdminDrawer>
  );
}

/**
 * The one order every rule is tried against.
 *
 * It lives here rather than in its own file so the list and the drawer are
 * guaranteed to be asking the same question of the same order — the money in
 * the drawer and the money in the list disagreeing would be worse than neither
 * being shown.
 */
export function ExampleOrderPicker({
  order,
  onChange,
  className = "",
}: {
  order: ExampleOrder;
  onChange: (order: ExampleOrder) => void;
  className?: string;
}) {
  const selectClass =
    "cursor-pointer appearance-none rounded-md border-b-2 border-[#1D1D1F] bg-[#F0F0F2] py-0.5 pl-2 pr-2 text-[13px] font-semibold text-[#1D1D1F] outline-none transition hover:bg-[#E8E8EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

  return (
    <p
      className={`flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-[13px] leading-relaxed text-[#1D1D1F] ${className}`}
    >
      <span className="text-[#6E6E73]">Try every rule on</span>
      <select
        aria-label="How big the order is"
        className={selectClass}
        value={String(order.subtotal)}
        onChange={(e) => onChange({ ...order, subtotal: Number(e.target.value) || 0 })}
      >
        {EXAMPLE_ORDER_AMOUNTS.map((amount) => (
          <option key={amount} value={amount}>
            {formatInr(amount)}
          </option>
        ))}
      </select>
      <span className="text-[#6E6E73]">of</span>
      <select
        aria-label="What kind of order"
        className={selectClass}
        value={order.kind}
        onChange={(e) => onChange({ ...order, kind: e.target.value as ExampleOrder["kind"] })}
      >
        {ORDER_KIND_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="text-[#6E6E73]">paid</span>
      <select
        aria-label="How the customer pays"
        className={selectClass}
        value={order.payWith}
        onChange={(e) =>
          onChange({ ...order, payWith: e.target.value as ExampleOrder["payWith"] })
        }
      >
        {PAY_WITH_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="text-[#6E6E73]">to PIN</span>
      <input
        aria-label="Which PIN code"
        inputMode="numeric"
        maxLength={6}
        value={order.pincode}
        onChange={(e) => onChange({ ...order, pincode: e.target.value.replace(/\D/g, "") })}
        className="w-[5.5rem] rounded-md border-b-2 border-[#1D1D1F] bg-[#F0F0F2] px-2 py-0.5 text-[13px] font-semibold tabular-nums text-[#1D1D1F] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
      />
    </p>
  );
}

/**
 * What one rule does to that order, in rupees.
 *
 * This is the answer the old screen could not give at any price. "Set shipping:
 * flat:79" is not an answer; "Delivery ₹79 instead of free — this order costs
 * ₹3,078 instead of ₹2,999" is. And where a rule does nothing to this order it
 * says so, which is the only way he can tell a rule that is waiting from a rule
 * that is broken.
 */
export function WhatThisDoes({
  settings,
  allRules,
  rule,
  order,
  onOrderChange,
  compact = false,
}: {
  settings: AdminSettings;
  allRules: AdminCheckoutRule[];
  rule: AdminCheckoutRule;
  order: ExampleOrder;
  onOrderChange?: (order: ExampleOrder) => void;
  compact?: boolean;
}) {
  const effect = describeRuleEffect(settings, allRules, rule, order);
  const difference = effect.totalAfter - effect.totalBefore;

  const body = (
    <>
      {!effect.applies ? (
        <p className="text-[12px] text-[#6E6E73]">
          Nothing happens on this order. It only applies when {effect.whyNot}.
        </p>
      ) : effect.changes.length === 0 ? (
        // Deliberately not a guess at WHY. It could be a rule below deciding
        // the same thing, or a setting that already says it, or an amount this
        // order never reaches — and naming the wrong one is how a screen loses
        // him. Changing the order above answers it in one move.
        <p className="text-[12px] text-[#6E6E73]">
          It applies to this order, but changes nothing on it. Try a bigger or different order
          above.
        </p>
      ) : (
        <>
          {difference !== 0 ? (
            <p className="text-[13px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">
              This order costs {formatInr(effect.totalAfter)} instead of{" "}
              {formatInr(effect.totalBefore)}
              {difference > 0
                ? ` — ${formatInr(difference)} more`
                : ` — ${formatInr(-difference)} less`}
              .
            </p>
          ) : null}
          <ul className="space-y-0.5">
            {effect.changes.map((change, index) => (
              <li key={index} className="text-[12px] text-[#3A3A3C]">
                {change}
              </li>
            ))}
          </ul>
        </>
      )}
      {effect.splitTest ? (
        <p className="text-[11px] text-[#86868B]">
          Only some customers see this one — it is one side of a test somebody set up.
        </p>
      ) : null}
    </>
  );

  if (compact) return <div className="space-y-1">{body}</div>;

  return (
    <section className="space-y-2 rounded-2xl border border-black/[0.06] bg-white px-4 py-3">
      {onOrderChange ? (
        <ExampleOrderPicker order={order} onChange={onOrderChange} />
      ) : null}
      {body}
    </section>
  );
}

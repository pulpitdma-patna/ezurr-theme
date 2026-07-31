"use client";

import { useMemo, useState } from "react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { RuleSentence } from "@/components/admin/RuleSentence";
import {
  ACTION_TAILS,
  buildRuleSentence,
  sentenceToText,
  setConditionValue,
  TRIGGER_HEADS,
  unsaidConditions,
  type ActionKind,
  type AutomationRule,
  type AutomationTriggerKey,
  type WordingChoice,
} from "@/lib/automationGrammar";

/**
 * Write one rule, as one sentence.
 *
 * What was here: four numbered sections (Basics, Trigger, Conditions, Actions),
 * a required "Rule name", a description box, an enable toggle, a chip row
 * reporting which integrations were connected, a free-text condition field
 * whose valid values are dot-paths into a PHP array, and — the reason this is a
 * rewrite rather than a tidy-up — a field labelled "Message (optional)" whose
 * value is passed straight into `MessageTemplate::where('event_key', …)`.
 * Typing a message there produced a rule that showed as active and sent
 * nothing, for ever, with no error anywhere the owner would look.
 *
 * Now: every value in the rule comes from a closed set, and the rule reads back
 * as the sentence it will act on. The only free text left is a note to himself,
 * behind Details, where it cannot be mistaken for the message a customer gets.
 */

const fieldClass =
  "w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-sm outline-none transition hover:border-black/[0.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

export function AutomationBuilder({
  rule,
  wordings,
  saving = false,
  error,
  onClose,
  onSave,
}: {
  rule: AutomationRule;
  /** Approved + enabled wordings, by the channel that can send them. */
  wordings: { whatsapp: WordingChoice[]; email: WordingChoice[] };
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (rule: AutomationRule) => void;
}) {
  const [draft, setDraft] = useState<AutomationRule>(rule);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const wordingsFor = useMemo(
    () => (type: ActionKind) =>
      type === "send_email" ? wordings.email : type === "send_whatsapp" ? wordings.whatsapp : [],
    [wordings],
  );

  const editableSlots = buildRuleSentence(draft, wordingsFor, {
    onTrigger: (value) => {
      const next = value as AutomationTriggerKey;
      // Moving off the order trigger drops the status clause, because "when a
      // basket is left behind, and only if the order is packed" is a rule that
      // can never match — and a rule that never matches looks identical, from
      // the counter, to one that is broken.
      setDraft((prev) => ({
        ...prev,
        trigger: next,
        conditions: TRIGGER_HEADS[next]?.statusSlot
          ? prev.conditions
          : prev.conditions.filter((c) => !(c.field === "status" && c.operator === "equals")),
      }));
    },
    onStatus: (value) =>
      setDraft((prev) => ({ ...prev, conditions: setConditionValue(prev.conditions, "status", value) })),
    onPayment: (value) =>
      setDraft((prev) => ({ ...prev, conditions: setConditionValue(prev.conditions, "payment", value) })),
    onActionType: (index, value) =>
      setDraft((prev) => ({
        ...prev,
        actions: prev.actions.map((action, i) =>
          // The value belongs to the old action type — a wording key is not a
          // tag and a tag is not a status — so it goes when the type changes.
          i === index ? { type: value as ActionKind, value: "" } : action,
        ),
      })),
    onActionValue: (index, value) =>
      setDraft((prev) => ({
        ...prev,
        actions: prev.actions.map((action, i) => (i === index ? { ...action, value } : action)),
      })),
  });

  const readableSlots = buildRuleSentence(draft, wordingsFor);
  const sentence = sentenceToText(readableSlots);

  const leftovers = unsaidConditions(draft);
  const freeTextActions = draft.actions
    .map((action, index) => ({ action, index, tail: ACTION_TAILS[action.type] }))
    .filter((entry) => entry.tail?.freeTextLabel);

  const sendsSomething = draft.actions.some(
    (a) => a.type === "send_whatsapp" || a.type === "send_email",
  );
  const missingWording = draft.actions.some(
    (a) => (a.type === "send_whatsapp" || a.type === "send_email") && !a.value,
  );
  const head = TRIGGER_HEADS[draft.trigger];

  function save() {
    setDraft((prev) => {
      const next = { ...prev, name: sentence.slice(0, 160), description: "" };
      onSave(next);
      return next;
    });
  }

  return (
    <AdminDrawer
      open
      title={draft.id ? "Change this message" : "A new automatic message"}
      subtitle="One rule, one sentence. Every choice in it is a list — nothing here is typed."
      onClose={onClose}
      widthClassName="max-w-lg sm:max-w-xl"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 text-[11px] text-[#86868B]">
            {missingWording
              ? "Pick the wording to send, or this rule will hold every message back."
              : "Saved rules start running straight away."}
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
              disabled={saving || missingWording}
              className="h-9 rounded-lg bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white transition hover:bg-[#2C2C2E] disabled:cursor-not-allowed disabled:bg-[#C7C7CC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
            >
              {saving ? "Saving…" : draft.id ? "Save this" : "Turn it on"}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* A failure stays on the screen, in the drawer, with what he typed
            still typed. It is never a toast — a toast for a rule that did not
            save is a rule he believes is running. */}
        {error ? (
          <div role="alert" className="rounded-xl border border-[#F5C2C0] bg-[#FDECEC] px-3 py-2 text-[12px] font-medium text-[#B42318]">
            {error}
          </div>
        ) : null}

        <section className="rounded-2xl border border-black/[0.06] bg-[#FAFAFB] p-4">
          <RuleSentence slots={editableSlots} />
          {head ? <p className="mt-2 text-[11px] text-[#86868B]">{head.blurb}</p> : null}
        </section>

        {sendsSomething && wordings.whatsapp.length === 0 && wordings.email.length === 0 ? (
          <p className="rounded-xl border border-[#F4D8A8] bg-[#FEF6E7] px-3 py-2 text-[11px] font-medium text-[#8A5A00]">
            No message wording is approved yet, so nothing can go out. Set one up under{" "}
            <strong>Message wording</strong> first.
          </p>
        ) : null}

        <section className="rounded-2xl border border-black/[0.06] bg-white">
          <button
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            aria-expanded={detailsOpen}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-[13px] font-semibold text-[#1D1D1F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
          >
            Details
            <span aria-hidden className="text-[10px] text-[#86868B]">
              {detailsOpen ? "▲" : "▼"}
            </span>
          </button>
          {detailsOpen ? (
            <div className="space-y-3 border-t border-black/[0.05] px-4 py-3">
              {freeTextActions.length === 0 && leftovers.length === 0 ? (
                <p className="text-[11px] text-[#86868B]">Nothing else to set for this one.</p>
              ) : null}

              {freeTextActions.map(({ action, index, tail }) => (
                <label key={`free-${index}`} className="block">
                  <span className="text-[11px] font-semibold text-[#1D1D1F]">
                    {tail?.freeTextLabel}
                  </span>
                  <input
                    className={`${fieldClass} mt-1`}
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
                  {action.type === "notify_internal" ? (
                    <span className="mt-1 block text-[11px] text-[#86868B]">
                      This one is for you. No customer sees it.
                    </span>
                  ) : null}
                </label>
              ))}

              {/* Anything the sentence cannot say is shown, not hidden, and is
                  saved back exactly as it was. A rule written through the API
                  must not quietly lose a clause because we redesigned the
                  editor around the common case. */}
              {leftovers.length > 0 ? (
                <div className="rounded-xl border border-black/[0.06] bg-[#FAFAFB] px-3 py-2">
                  <div className="text-[11px] font-semibold text-[#1D1D1F]">
                    Extra conditions, set up by someone else
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {leftovers.map((condition, index) => (
                      <li key={`leftover-${index}`} className="ez-mono text-[11px] text-[#6E6E73]">
                        {condition.field} {condition.operator.split("_").join(" ")} {condition.value}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-[10px] text-[#86868B]">
                    Kept exactly as they are. Ask whoever set them up before changing them.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <p className="text-[11px] text-[#86868B]">
          This rule will be saved as: <span className="text-[#424245]">{sentence}</span>
        </p>
      </div>
    </AdminDrawer>
  );
}

/** A blank rule that already says something sensible. */
export function blankRule(): AutomationRule {
  const now = new Date().toISOString();
  return {
    id: "",
    name: "",
    description: "",
    trigger: "order_status_changed",
    enabled: true,
    conditions: [{ field: "status", operator: "equals", value: "shipped" }],
    actions: [{ type: "send_whatsapp", value: "" }],
    createdAt: now,
    updatedAt: now,
  };
}

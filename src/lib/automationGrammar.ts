/**
 * One rule is one sentence.
 *
 * The old builder was a four-step form: Basics, Trigger, Conditions, Actions.
 * A finished rule then read back to the owner as three boxes joined by arrows —
 * "Order status → status = shipped → WhatsApp" — which is a diagram of our data
 * model, not a statement about his shop. Worse, one of those boxes was a
 * free-text field whose valid values are dot-paths into a PHP array, and
 * another was labelled "Message (optional)" while its value is read as a
 * template lookup key.
 *
 * This module is the grammar instead: every rule the engine can express, said
 * as one English sentence with the choices inline.
 *
 *     When an order is marked ‹on the way›, send the customer a WhatsApp:
 *     ‹Order on the way›.
 *
 * Two things make that safe rather than decorative:
 *
 *  1. Every inline slot is a CLOSED SET. There is no place to type a field
 *     name, an event key, or a status. A rule built here cannot fail to match.
 *  2. The status a rule filters on is swallowed into the head of the sentence.
 *     It is still saved as the same `{field:"status"}` condition row the server
 *     already reads, so nothing on the API changes — but the owner never meets
 *     the condition builder for the one case that accounts for most rules.
 *
 * Anything a rule carries that this grammar does not know how to say is kept
 * verbatim on save and shown as plain text under Details. We never silently
 * drop part of a rule in order to make it fit a sentence.
 */

import type { AdminAutomationRule, AutomationAction, AutomationCondition } from "@/data/admin";

/**
 * Every trigger `AutomationController::TRIGGERS` accepts.
 *
 * The old builder offered seven of twelve. The five missing ones include the
 * two the shop owner asked for by name — a reminder for a basket someone left
 * behind, and a message when something is back in stock — both of which are
 * fully built on the server and were simply unreachable from the admin.
 *
 * `AutomationTrigger` in data/admin.ts still lists the original seven; this is
 * the wider set, and it is a superset, so every existing rule is still valid.
 */
export const AUTOMATION_TRIGGERS = [
  "order_status_changed",
  "order_placed",
  "payment_pending",
  "payment_authorized",
  "payment_captured",
  "payment_failed",
  "stock_low",
  "back_in_stock",
  "cart_abandoned",
  "customer_created",
  "preorder_released",
  "digital_code_delivered",
] as const;

export type AutomationTriggerKey = (typeof AUTOMATION_TRIGGERS)[number];

/** A rule whose trigger may be any of the twelve, not only the original seven. */
export type AutomationRule = Omit<AdminAutomationRule, "trigger"> & {
  trigger: AutomationTriggerKey;
};

export type AutomationRunRecord = {
  id: string;
  ruleId: string;
  ruleName: string;
  at: string;
  status: "completed" | "skipped" | "failed";
  delivery?: "simulated" | "blocked" | "sent";
  summary?: string;
};

/**
 * The head of the sentence, per trigger.
 *
 * `statusSlot` marks the one trigger that swallows a condition into its head.
 */
export const TRIGGER_HEADS: Record<
  AutomationTriggerKey,
  { before: string; after?: string; statusSlot?: boolean; blurb: string }
> = {
  order_status_changed: {
    before: "When an order is marked",
    statusSlot: true,
    blurb: "Runs every time you move an order along.",
  },
  order_placed: {
    before: "When a new order comes in",
    blurb: "Runs the moment a customer finishes checkout.",
  },
  payment_pending: {
    before: "When an order is waiting for payment",
    blurb: "The customer reached checkout but the money has not arrived yet.",
  },
  payment_authorized: {
    before: "When a payment is approved",
    blurb: "The bank has said yes but the money has not landed yet.",
  },
  payment_captured: {
    before: "When money reaches your account",
    blurb: "Runs once the payment is actually settled.",
  },
  payment_failed: {
    before: "When a payment does not go through",
    blurb: "Also runs when an unpaid order times out.",
  },
  stock_low: {
    before: "When something is running out",
    blurb: "Uses the low-stock level from Settings → Stock & region.",
  },
  back_in_stock: {
    before: "When something is back in stock",
    blurb: "Goes to everyone who asked to be told about that product.",
  },
  cart_abandoned: {
    before: "When someone leaves a basket behind",
    blurb: "Only reaches customers who agreed to hear from you on WhatsApp.",
  },
  customer_created: {
    before: "When someone new signs up",
    blurb: "Runs once, the first time a customer's number is seen.",
  },
  preorder_released: {
    before: "When a pre-order is released",
    blurb: "Runs when you move a waiting-for-release order along.",
  },
  digital_code_delivered: {
    before: "When a game code goes out",
    blurb: "Runs after the code has been handed to the customer.",
  },
};

/**
 * The trigger as a word inside the sentence, for the one dropdown that decides
 * what the rule is about. "When ‹an order is marked›" reads as a sentence;
 * "Trigger: order_status_changed" reads as a database column.
 */
export const TRIGGER_CHOICES = AUTOMATION_TRIGGERS.map((key) => ({
  value: key,
  label: TRIGGER_HEADS[key].before.replace(/^When /, ""),
}));

/**
 * How a status reads inside the sentence.
 *
 * These are the event words, not the badge words. The badge for `confirmed`
 * and `paid` is one noun — "Ready to pack" — because they are one job on the
 * orders list; but "when an order is marked ready to pack" twice in a dropdown
 * would be two identical choices, so here they keep the moments they name.
 */
export const ORDER_STATUS_WORDS: Record<string, string> = {
  pending: "needs your OK",
  preorder: "waiting for release",
  pending_payment: "not paid yet",
  payment_failed: "payment failed",
  confirmed: "accepted",
  paid: "paid",
  packed: "packed",
  shipped: "on the way",
  delivered: "delivered",
  cancelled: "cancelled",
  refunded: "money sent back",
};

export const ORDER_STATUS_OPTIONS = Object.entries(ORDER_STATUS_WORDS).map(
  ([value, label]) => ({ value, label }),
);

/** The only filter the sentence offers beyond the status in its head. */
export const PAYMENT_FILTER_OPTIONS = [
  { value: "", label: "any order" },
  { value: "cod", label: "it is cash on delivery" },
  { value: "prepaid", label: "it was paid online" },
];

export type ActionKind = AutomationAction["type"];

/**
 * How each action reads, and whether its value is a wording key.
 *
 * `valueIsWording` is the whole point of the rewrite: for these two actions
 * the value is passed to `MessageTemplate::where('event_key', …)`, so it must
 * come from a dropdown over approved wordings and can never be typed.
 */
export const ACTION_TAILS: Record<
  ActionKind,
  { before: string; valueIsWording?: boolean; valueIsStatus?: boolean; freeTextLabel?: string }
> = {
  send_whatsapp: { before: "send the customer a WhatsApp:", valueIsWording: true },
  send_email: { before: "email the customer:", valueIsWording: true },
  notify_internal: { before: "tell me in the shop", freeTextLabel: "What the note should say" },
  add_customer_tag: { before: "label the customer", freeTextLabel: "The label" },
  update_order_status: { before: "move the order to", valueIsStatus: true },
  send_webhook: { before: "send it to a connected system", freeTextLabel: "Which event to send" },
};

export const ACTION_OPTIONS: { value: ActionKind; label: string }[] = [
  { value: "send_whatsapp", label: "send the customer a WhatsApp" },
  { value: "send_email", label: "email the customer" },
  { value: "notify_internal", label: "tell me in the shop" },
  { value: "add_customer_tag", label: "label the customer" },
  { value: "update_order_status", label: "move the order along" },
  { value: "send_webhook", label: "send it to a connected system" },
];

// ---------------------------------------------------------------------------
// Conditions ⟷ sentence
// ---------------------------------------------------------------------------

function isEquals(c: AutomationCondition, field: string) {
  return c.field === field && c.operator === "equals";
}

/** The status the head of the sentence is showing, if the rule filters on one. */
export function swallowedStatus(rule: Pick<AutomationRule, "trigger" | "conditions">): string {
  if (rule.trigger !== "order_status_changed") return "";
  return rule.conditions.find((c) => isEquals(c, "status"))?.value ?? "";
}

/** The one filter clause the sentence can say out loud. */
export function paymentFilter(rule: Pick<AutomationRule, "conditions">): string {
  return rule.conditions.find((c) => isEquals(c, "payment"))?.value ?? "";
}

/**
 * Conditions this grammar cannot say.
 *
 * They are shown as plain text and saved back untouched. A rule written before
 * this screen existed — or by someone through the API — must not lose a clause
 * because we redesigned the editor.
 */
export function unsaidConditions(
  rule: Pick<AutomationRule, "trigger" | "conditions">,
): AutomationCondition[] {
  const statusIsSaid = rule.trigger === "order_status_changed";
  let seenStatus = false;
  let seenPayment = false;
  return rule.conditions.filter((c) => {
    if (statusIsSaid && isEquals(c, "status") && !seenStatus) {
      seenStatus = true;
      return false;
    }
    if (isEquals(c, "payment") && !seenPayment) {
      seenPayment = true;
      return false;
    }
    return true;
  });
}

/**
 * Write a slot back into the conditions, keeping everything else in place.
 *
 * Empty value removes the clause — "any order" is the absence of a filter, not
 * a filter whose value is the empty string, which would match nothing.
 */
export function setConditionValue(
  conditions: AutomationCondition[],
  field: string,
  value: string,
): AutomationCondition[] {
  const rest = conditions.filter((c) => !isEquals(c, field));
  if (!value) return rest;
  const existingIndex = conditions.findIndex((c) => isEquals(c, field));
  const next: AutomationCondition = { field, operator: "equals", value };
  if (existingIndex === -1) return [...rest, next];
  // Keep the clause where it was so a rule's saved shape is stable.
  const out = [...conditions];
  out[existingIndex] = next;
  return out;
}

// ---------------------------------------------------------------------------
// The sentence itself
// ---------------------------------------------------------------------------

export type SentenceSlot =
  | { kind: "text"; text: string }
  | {
      kind: "choice";
      id: string;
      value: string;
      options: { value: string; label: string }[];
      ariaLabel: string;
      emptyLabel?: string;
      onChange?: (value: string) => void;
    };

export type WordingChoice = { value: string; label: string };

/**
 * Build the sentence for a rule.
 *
 * `wordingsFor` returns the approved, enabled message wordings for a channel —
 * the only values a send action may carry, because the value is read as
 * `MessageTemplate::where('event_key', …)`. When the list is empty the slot
 * still renders and says so, because a rule pointing at nothing is exactly what
 * the owner needs to see rather than a blank.
 */
export function buildRuleSentence(
  rule: Pick<AutomationRule, "trigger" | "conditions" | "actions">,
  wordingsFor: (actionType: ActionKind) => WordingChoice[],
  handlers?: {
    onTrigger?: (value: string) => void;
    onStatus?: (value: string) => void;
    onPayment?: (value: string) => void;
    onActionType?: (index: number, value: string) => void;
    onActionValue?: (index: number, value: string) => void;
  },
): SentenceSlot[] {
  const head = TRIGGER_HEADS[rule.trigger] ?? TRIGGER_HEADS.order_placed;
  const slots: SentenceSlot[] = handlers?.onTrigger
    ? [
        { kind: "text", text: "When" },
        {
          kind: "choice",
          id: "trigger",
          value: rule.trigger,
          options: TRIGGER_CHOICES,
          ariaLabel: "What this rule watches for",
          emptyLabel: "choose what happens",
          onChange: handlers.onTrigger,
        },
      ]
    : [{ kind: "text", text: head.before }];

  if (head.statusSlot) {
    slots.push({
      kind: "choice",
      id: "status",
      value: swallowedStatus(rule),
      options: ORDER_STATUS_OPTIONS,
      ariaLabel: "Which change this watches for",
      emptyLabel: "any change",
      onChange: handlers?.onStatus,
    });
  }

  const payment = paymentFilter(rule);
  if (payment || handlers?.onPayment) {
    slots.push({ kind: "text", text: "and only if" });
    slots.push({
      kind: "choice",
      id: "payment",
      value: payment,
      options: PAYMENT_FILTER_OPTIONS,
      ariaLabel: "Which orders this applies to",
      emptyLabel: "any order",
      onChange: handlers?.onPayment,
    });
  }

  slots.push({ kind: "text", text: "—" });

  rule.actions.forEach((action, index) => {
    if (index > 0) slots.push({ kind: "text", text: "and" });
    const tail = ACTION_TAILS[action.type];
    if (!tail) {
      slots.push({ kind: "text", text: action.type.split("_").join(" ") });
      return;
    }
    if (handlers?.onActionType) {
      slots.push({
        kind: "choice",
        id: `action-${index}-type`,
        value: action.type,
        options: ACTION_OPTIONS,
        ariaLabel: "What to do",
        emptyLabel: "choose what to do",
        onChange: (v) => handlers.onActionType?.(index, v),
      });
      if (tail.valueIsWording) slots.push({ kind: "text", text: ":" });
    } else {
      slots.push({ kind: "text", text: tail.before });
    }
    if (tail.valueIsWording) {
      const wordings = wordingsFor(action.type);
      slots.push({
        kind: "choice",
        id: `action-${index}-wording`,
        value: action.value ?? "",
        options: wordings,
        ariaLabel: "Which wording to send",
        emptyLabel:
          wordings.length === 0 ? "no wording is approved yet" : "choose the wording",
        onChange: handlers?.onActionValue ? (v) => handlers.onActionValue?.(index, v) : undefined,
      });
    } else if (tail.valueIsStatus) {
      slots.push({
        kind: "choice",
        id: `action-${index}-status`,
        value: action.value ?? "",
        options: ORDER_STATUS_OPTIONS,
        ariaLabel: "Where to move the order",
        emptyLabel: "choose where",
        onChange: handlers?.onActionValue ? (v) => handlers.onActionValue?.(index, v) : undefined,
      });
    } else if (action.value) {
      slots.push({ kind: "text", text: `“${action.value}”` });
    }
  });

  return slots;
}

/**
 * The sentence as one string.
 *
 * Also the rule's saved `name`. The old builder demanded one before it would
 * let you save, so the run log filled up with "Notify on ship" and the list
 * showed a title over a diagram. Naming a rule after what it says means the
 * log reads back as English too.
 */
export function sentenceToText(slots: SentenceSlot[]): string {
  const words = slots.map((slot) => {
    if (slot.kind === "text") return slot.text;
    return slot.options.find((o) => o.value === slot.value)?.label ?? slot.emptyLabel ?? "—";
  });
  return `${words.join(" ").replace(/\s+([.,:])/g, "$1")}.`;
}

// ---------------------------------------------------------------------------
// What actually happened
// ---------------------------------------------------------------------------

/**
 * The grey line under a running rule.
 *
 * `delivery` wins over `status` where both exist, because the owner's question
 * is "did the customer get it", not "did our code finish". A run can complete
 * happily while the message was held back for want of approved wording — the
 * old screen called that "Completed" with a small grey "blocked" chip beside
 * it, in a tab he had to go and find.
 */
export function describeLastRun(run: AutomationRunRecord | undefined, now = new Date()): string {
  if (!run) return "Has not run yet.";

  const verdict =
    run.delivery === "sent"
      ? "delivered"
      : run.delivery === "simulated"
        ? "practice mode — nothing left the shop"
        : run.delivery === "blocked"
          ? "held back — the wording is not approved yet"
          : run.status === "completed"
            ? "went out"
            : run.status === "skipped"
              ? "held back"
              : "did not work";

  return `Last ran ${describeWhen(run.at, now)} · ${verdict}`;
}

/** `just now` · `14 minutes ago` · `3 hours ago` · `on 21 Jul`. */
export function describeWhen(at: string, now = new Date()): string {
  const then = new Date(at);
  if (Number.isNaN(then.getTime())) return "at an unknown time";
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return `on ${then.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Kolkata",
  })}`;
}

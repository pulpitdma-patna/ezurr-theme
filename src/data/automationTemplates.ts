/**
 * The messages a gaming shop should be sending, whether or not it is.
 *
 * This file used to be a gallery of twelve "starter templates" behind its own
 * route, reachable from three separate controls on one screen. Opening one
 * filled a four-step form the owner then had to name, describe and save. Four
 * of the twelve wrote prose into the field the dispatcher reads as a template
 * lookup key ("Your pre-order is ready"), which matches no wording, so those
 * four handed out rules that could never send anything — while showing as on.
 *
 * They are now the second half of one list: NOT TURNED ON. Same sentence, in
 * grey, with one button. No gallery, no route, no form.
 *
 * Every `value` on a send action here is an `event_key` that the message
 * wording seeder creates, never a sentence.
 */

import type { AutomationAction, AutomationCondition } from "@/data/admin";
import type { AutomationRule, AutomationTriggerKey } from "@/lib/automationGrammar";

export type RecommendedRule = {
  id: string;
  /** Saved as the rule's name. The sentence is what he reads; this is for the log. */
  name: string;
  trigger: AutomationTriggerKey;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  /** One line under the grey sentence: why this is worth switching on. */
  why: string;
};

export const RECOMMENDED_RULES: RecommendedRule[] = [
  {
    id: "rec-order-accepted",
    name: "Tell the customer their order is accepted",
    trigger: "order_status_changed",
    conditions: [{ field: "status", operator: "equals", value: "confirmed" }],
    actions: [{ type: "send_whatsapp", value: "order_confirmed" }],
    why: "Stops the “did my order go through?” call.",
  },
  {
    id: "rec-order-shipped",
    name: "Tell the customer the order is on the way",
    trigger: "order_status_changed",
    conditions: [{ field: "status", operator: "equals", value: "shipped" }],
    actions: [{ type: "send_whatsapp", value: "order_shipped" }],
    why: "Sends the tracking link, so nobody has to ask you for it.",
  },
  {
    id: "rec-order-delivered",
    name: "Ask how it went after delivery",
    trigger: "order_status_changed",
    conditions: [{ field: "status", operator: "equals", value: "delivered" }],
    actions: [{ type: "send_whatsapp", value: "order_delivered" }],
    why: "The best moment to ask for a review is the day it arrives.",
  },
  {
    id: "rec-refunded",
    name: "Tell the customer their money is on its way back",
    trigger: "order_status_changed",
    conditions: [{ field: "status", operator: "equals", value: "refunded" }],
    actions: [{ type: "send_whatsapp", value: "refund_confirmation" }],
    why: "A refund takes 3–5 days at the bank. This is what stops the chasing.",
  },
  {
    id: "rec-payment-failed",
    name: "Give a second chance to pay",
    trigger: "payment_failed",
    conditions: [],
    actions: [{ type: "send_whatsapp", value: "payment_failed" }],
    why: "The customer wanted to buy. The card did not work.",
  },
  {
    id: "rec-cart-abandoned",
    name: "Remind about a basket left behind",
    trigger: "cart_abandoned",
    conditions: [],
    actions: [{ type: "send_whatsapp", value: "abandoned_cart" }],
    why: "Only goes to customers who agreed to hear from you on WhatsApp.",
  },
  {
    id: "rec-back-in-stock",
    name: "Tell people waiting when something is back",
    trigger: "back_in_stock",
    conditions: [],
    actions: [{ type: "send_whatsapp", value: "back_in_stock" }],
    why: "They already told you they want it.",
  },
  {
    id: "rec-stock-low",
    name: "Tell me when something is running out",
    trigger: "stock_low",
    conditions: [],
    actions: [{ type: "notify_internal", value: "Running low — order more" }],
    why: "Goes to you, not to a customer.",
  },
  {
    id: "rec-code-sent",
    name: "Send the game code",
    trigger: "digital_code_delivered",
    conditions: [],
    actions: [{ type: "send_whatsapp", value: "digital_code_delivered" }],
    why: "A code the customer cannot find is a refund.",
  },
  {
    id: "rec-welcome",
    name: "Welcome a new customer",
    trigger: "customer_created",
    conditions: [],
    actions: [{ type: "send_whatsapp", value: "welcome" }],
    why: "One message, the first time somebody buys from you.",
  },
  {
    id: "rec-new-order",
    name: "Tell me when a new order comes in",
    trigger: "order_placed",
    conditions: [],
    actions: [{ type: "notify_internal", value: "New order" }],
    why: "Goes to you, not to a customer.",
  },
];

/**
 * Is this recommendation already a rule on the shop?
 *
 * Matched on what the rule DOES — trigger, the status it watches for, and the
 * first action — not on its name, because the owner is free to rename a rule
 * and renaming it must not make the same suggestion reappear underneath.
 */
export function isAlreadyARule(
  recommendation: RecommendedRule,
  rules: Pick<AutomationRule, "trigger" | "conditions" | "actions">[],
): boolean {
  const wanted = recommendation.actions[0];
  const wantedStatus = recommendation.conditions.find(
    (c) => c.field === "status" && c.operator === "equals",
  )?.value;

  return rules.some((rule) => {
    if (rule.trigger !== recommendation.trigger) return false;
    if (wantedStatus !== undefined) {
      const has = rule.conditions.find((c) => c.field === "status" && c.operator === "equals");
      if (has?.value !== wantedStatus) return false;
    }
    return rule.actions.some(
      (a) => a.type === wanted.type && (wanted.value ? a.value === wanted.value : true),
    );
  });
}

import { describe, it, expect } from "vitest";
import { actionChoices, CHECKOUT_ACTION_WORDS } from "@/lib/checkoutRules";
import type { CheckoutActionType } from "@/lib/checkoutRules";

/**
 * The menu has to say what each choice will do.
 *
 * Each option was labelled with only the words BEFORE the blank, while the rest
 * of the sentence lived in slots outside the dropdown — so with the menu open
 * the owner was choosing between fragments. Four were unreadable on their own:
 * "take" (a discount for paying online), "ask for" (a part-payment), "charge"
 * (the GST rate) and "do not offer" (a whole payment method) — in a list that
 * also held "do not offer the courier" and "do not offer payment by".
 */
describe("what a checkout rule can do, in words", () => {
  const labels = () => actionChoices("set_shipping").map((c) => c.label);

  /**
   * The load-bearing constraint. sentenceToText renders the SELECTED option's
   * label as the word in the sentence, and the action-type slot exists only in
   * the editable sentence — so a label carrying more than the sentence fragment
   * duplicates the rest of the line: "take … off for paying online 10% off for
   * paying online". Fixing the menu's ambiguity needs a real listbox, not a
   * richer <select> label.
   */
  it("labels every choice with exactly the word the sentence uses", () => {
    for (const choice of actionChoices("set_shipping")) {
      const words = CHECKOUT_ACTION_WORDS[choice.value as CheckoutActionType];
      if (words) expect(choice.label).toBe(words.before);
    }
  });

  /**
   * Deliberately NOT asserted: that no label is a bare verb.
   *
   * The select's displayed text IS the word in the sentence — that is the whole
   * design, he reads a sentence and changes a word in it — so a menu-only label
   * leaks straight into the rendered rule ("do not offer a way of paying (cash,
   * or online) cash on delivery"). Where the value that follows supplies the
   * missing noun, the fragment has to stay a fragment. What can be fixed, and
   * is, are the ones whose sentence continues AFTER the value.
   */
  it("keeps every choice distinguishable from every other", () => {
    const all = labels();
    expect(new Set(all).size).toBe(all.length);
  });

  /**
   * A rule already doing something the menu no longer offers must keep it — the
   * alternative is that the only way to preserve the rule is to not touch it.
   */
  it("keeps an action the rule already uses, even if it is not offered", () => {
    const values = actionChoices("set_rate_table").map((c) => c.value);
    expect(values).toContain("set_rate_table");
  });

  it("does not offer an empty choice", () => {
    expect(actionChoices("set_shipping").map((c) => c.value)).not.toContain("");
  });
});

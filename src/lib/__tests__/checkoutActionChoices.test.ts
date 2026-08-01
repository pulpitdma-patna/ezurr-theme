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

/**
 * Five of these actions are only half a phrase while the menu is open.
 *
 * "take", "ask for" and "charge" say nothing until the value that follows them
 * arrives, and the obvious fix — putting the whole phrase in `label` — breaks
 * the sentence, because sentenceToText renders the SELECTED option's label and
 * the tail of the line would then appear twice. It was left ambiguous on
 * purpose and pinned so nobody fixed it that way.
 *
 * A native <select> only ever shows the selected option when closed, so the
 * longer phrase lives in `menuLabel` and is rendered for options that are NOT
 * selected. The open list says more; the closed one is untouched.
 */
describe("the open menu says more than the closed control", () => {
  it("gives the half-phrases something readable in the list", () => {
    const byValue = new Map(actionChoices("set_shipping").map((c) => [c.value, c]));

    expect(byValue.get("set_prepaid_discount_pct")?.menuLabel).toBe(
      "take something off for paying online",
    );
    expect(byValue.get("set_deposit_pct")?.menuLabel).toBe("ask for part now, the rest later");
    expect(byValue.get("set_tax_rate")?.menuLabel).toBe("charge a GST rate");
  });

  /** The trap this file already guards. menuLabel must not touch it. */
  it("leaves every label exactly as the sentence needs it", () => {
    for (const choice of actionChoices("set_shipping")) {
      const words = CHECKOUT_ACTION_WORDS[choice.value as CheckoutActionType];
      expect(choice.label, choice.value).toBe(words.before);
    }
  });

  /** An action that already reads on its own needs no second wording. */
  it("adds nothing to the ones that were never ambiguous", () => {
    const shipping = actionChoices("set_shipping").find((c) => c.value === "set_shipping");
    expect(shipping?.menuLabel).toBeUndefined();
  });
});

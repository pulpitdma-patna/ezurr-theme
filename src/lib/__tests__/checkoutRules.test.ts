import { describe, expect, it } from "vitest";
import { defaultAdminSettings } from "@/data/admin";
import {
  buildCheckoutSentence,
  checkoutSentenceText,
  CHECKOUT_ACTION_WORDS,
  DEFAULT_EXAMPLE_ORDER,
  deadConditions,
  describeRuleEffect,
  exampleContext,
  firstUnmetClause,
  OFFERED_ACTIONS,
  orderMoney,
  proseActions,
  resolveCheckoutPolicy,
  ruleMatchesOrder,
  seedCheckoutRules,
  setCheckoutClause,
  typedConditions,
  writeActionValue,
  writeCarrierCharge,
  type AdminCheckoutRule,
  type ExampleOrder,
} from "@/lib/checkoutRules";
import { sentenceToText } from "@/lib/automationGrammar";

function rule(overrides: Partial<AdminCheckoutRule> = {}): AdminCheckoutRule {
  return {
    id: "cr-1",
    name: "",
    description: "",
    enabled: true,
    priority: 10,
    conditions: [{ field: "fulfillment_type", operator: "equals", value: "digital" }],
    actions: [{ type: "hide_payment_method", value: "cod" }],
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

const settings = { ...defaultAdminSettings, codEnabled: true, codLimit: 10000, prepaidDiscount: 0 };

describe("one rule reads as one sentence", () => {
  it("says what the old list drew as “1 condition · Hide method”", () => {
    expect(checkoutSentenceText(rule())).toBe(
      "When the order is a game code — do not offer cash on delivery.",
    );
  });

  it("says “On every order” for a rule with no conditions at all", () => {
    // The old row said "Always", which reads as a promise rather than a scope.
    const always = rule({
      conditions: [],
      actions: [{ type: "set_cod_max", value: "10000" }],
    });
    expect(checkoutSentenceText(always)).toBe(
      "On every order — stop offering cash on delivery above ₹10,000.",
    );
  });

  it("puts the money in the sentence, not a code", () => {
    expect(
      checkoutSentenceText(
        rule({
          conditions: [{ field: "subtotal", operator: "less_than_or_equal", value: "1999" }],
          actions: [{ type: "set_shipping", value: "flat:79" }],
        }),
      ),
      // Never "set_shipping: flat:79", which is what the editor used to show.
    ).toBe("When the order is ₹1,999 or less — set the delivery charge to ₹79.");
  });

  it("joins several clauses and several things to do", () => {
    expect(
      checkoutSentenceText(
        rule({
          conditions: [
            { field: "fulfillment_type", operator: "equals", value: "preorder" },
            { field: "payment_method", operator: "equals", value: "cod" },
          ],
          actions: [
            { type: "set_shipping", value: "free" },
            { type: "set_prepaid_discount_pct", value: "10" },
          ],
        }),
      ),
    ).toBe(
      "When the order is a pre-order and the customer is paying cash on delivery — set the delivery charge to free and take 10% off for paying online.",
    );
  });

  it("says a PIN code rule in words rather than counting conditions", () => {
    expect(
      checkoutSentenceText(
        rule({
          conditions: [{ field: "pincode", operator: "contains", value: "560" }],
          actions: [{ type: "set_carrier", value: "delhivery:79" }],
        }),
      ),
    ).toBe(
      "When the PIN code has 560 in it — send it by Delhivery Standard for ₹79.",
    );
  });

  it("names the note a customer will read, and says when it is still blank", () => {
    const written = rule({
      conditions: [],
      actions: [{ type: "set_banner", value: "Pay online and save the delivery charge." }],
    });
    expect(checkoutSentenceText(written)).toBe(
      "On every order — show this note at checkout: “Pay online and save the delivery charge.”",
    );

    const blank = rule({ conditions: [], actions: [{ type: "set_banner", value: "" }] });
    expect(checkoutSentenceText(blank)).toBe(
      "On every order — show this note at checkout: not written yet.",
    );
  });

  it("reads back a rule it would never offer to write, rather than hiding it", () => {
    // set_rate_table, split_payment and require_field are lists, not one
    // answer. They stay readable so a rule set up by someone else is still a
    // sentence he can act on.
    expect(
      checkoutSentenceText(
        rule({
          conditions: [],
          actions: [
            { type: "set_rate_table", value: "bluedart:0,delhivery:79" },
            { type: "require_field", value: "upi" },
          ],
        }),
      ),
    ).toBe(
      "On every order — offer these couriers: Blue Dart Express free, Delhivery Standard ₹79 and also ask the customer for their UPI ID.",
    );
  });

  it("says an amount and a percentage without ever printing a bare number", () => {
    expect(
      checkoutSentenceText(
        rule({
          conditions: [],
          actions: [
            { type: "set_cod_advance", value: "100!" },
            { type: "set_deposit_pct", value: "25" },
          ],
        }),
      ),
    ).toBe(
      "On every order — before accepting cash on delivery, ask for ₹100 online, at any order value and ask for 25% now and the rest later.",
    );
  });
});

describe("the list and the editor say the same thing", () => {
  it("is the same string whether or not the choices can be changed", () => {
    // This is the whole reason the list can be read instead of opened. If the
    // editable sentence ever differs by one character, the list is a summary
    // again and he has to open every rule to know what it does.
    for (const seed of seedCheckoutRules("2026-07-31T00:00:00.000Z")) {
      const readOnly = buildCheckoutSentence(seed);
      const editable = buildCheckoutSentence(seed, {
        onOrderKind: () => {},
        onPayWith: () => {},
        onUpToAmount: () => {},
        onActionType: () => {},
        onActionValue: () => {},
        onCarrierCharge: () => {},
      });
      expect(sentenceToText(editable)).toBe(sentenceToText(readOnly));
    }
  });

  it("keeps an amount that is not one of the ready-made ones", () => {
    // A rule saved before the list of amounts existed, or set up through the
    // API. Offering only round numbers must never round his rule.
    const odd = rule({
      conditions: [{ field: "subtotal", operator: "less_than_or_equal", value: "1234" }],
      actions: [{ type: "set_shipping", value: "flat:63" }],
    });
    expect(checkoutSentenceText(odd)).toBe(
      "When the order is ₹1,234 or less — set the delivery charge to ₹63.",
    );

    const slots = buildCheckoutSentence(odd, { onUpToAmount: () => {}, onActionValue: () => {} });
    const amount = slots.find((s) => s.kind === "choice" && s.id === "upTo");
    expect(amount?.kind === "choice" && amount.options.map((o) => o.value)).toContain("1234");
  });

  it("offers only things a shopkeeper sets, and can still say the rest", () => {
    for (const type of OFFERED_ACTIONS) {
      expect(CHECKOUT_ACTION_WORDS[type].readOnly).toBeFalsy();
      expect(CHECKOUT_ACTION_WORDS[type].before.length).toBeGreaterThan(0);
    }
    // Every action the engine can apply has words, or a rule becomes unreadable.
    for (const words of Object.values(CHECKOUT_ACTION_WORDS)) {
      expect(typeof words.before).toBe("string");
    }
  });

  it("never uses a word from the storeroom in a sentence", () => {
    const jargon = /sku|fulfil|endpoint|webhook|payload|driver|gateway|token|\bapi\b|config|\benv\b/i;
    const everyAction = Object.keys(CHECKOUT_ACTION_WORDS).map((type) => ({
      type: type as keyof typeof CHECKOUT_ACTION_WORDS,
      value: "100",
    }));
    const text = checkoutSentenceText({ conditions: [], actions: everyAction });
    expect(text).not.toMatch(jargon);
  });
});

describe("a clause is added and taken away by answering the sentence", () => {
  it("removes the clause when the answer is 'any', instead of matching nothing", () => {
    // A clause saved with an empty value compares the order against "" and
    // matches no order at all, so the rule would show as On and never run.
    const conditions = [
      { field: "fulfillment_type" as const, operator: "equals" as const, value: "digital" },
      { field: "pincode", operator: "contains" as const, value: "560" },
    ];
    expect(setCheckoutClause(conditions, "fulfillment_type", "equals", "")).toEqual([
      { field: "pincode", operator: "contains", value: "560" },
    ]);
  });

  it("rewrites one clause where it stands and leaves the others alone", () => {
    const conditions = [
      { field: "fulfillment_type" as const, operator: "equals" as const, value: "digital" },
      { field: "pincode", operator: "contains" as const, value: "560" },
    ];
    expect(setCheckoutClause(conditions, "fulfillment_type", "equals", "preorder")).toEqual([
      { field: "fulfillment_type", operator: "equals", value: "preorder" },
      { field: "pincode", operator: "contains", value: "560" },
    ]);
  });

  it("hands the typed clauses to the box that can hold them", () => {
    const mixed = rule({
      conditions: [
        { field: "fulfillment_type", operator: "equals", value: "digital" },
        { field: "pincode", operator: "contains", value: "560" },
        { field: "city", operator: "equals", value: "Bengaluru" },
      ],
    });
    expect(typedConditions(mixed).map((t) => [t.index, t.label])).toEqual([
      [1, "Which PIN codes"],
      [2, "Which city"],
    ]);
  });

  it("hands the customer-facing wording to a box, never to a dropdown", () => {
    const noticed = rule({
      conditions: [],
      actions: [
        { type: "set_shipping", value: "free" },
        { type: "block_checkout", value: "We cannot deliver there yet." },
      ],
    });
    expect(proseActions(noticed).map((p) => p.index)).toEqual([1]);
  });
});

describe("changing one word does not change another", () => {
  it("keeps the ceiling-lifting mark and the customer's wording on an advance", () => {
    // The value carries three facts in one string. Overwriting it wholesale
    // would put the cash-on-delivery ceiling back without him touching it.
    expect(
      writeActionValue({ type: "set_cod_advance", value: "100!:Pay ₹100 to confirm" }, "200"),
    ).toEqual({ type: "set_cod_advance", value: "200!:Pay ₹100 to confirm" });

    expect(writeActionValue({ type: "set_cod_advance", value: "100" }, "500")).toEqual({
      type: "set_cod_advance",
      value: "500",
    });
  });

  it("keeps the charge when the courier changes, and the courier when the charge does", () => {
    expect(writeActionValue({ type: "set_carrier", value: "delhivery:79" }, "dunzo")).toEqual({
      type: "set_carrier",
      value: "dunzo:79",
    });
    expect(writeCarrierCharge({ type: "set_carrier", value: "delhivery:79" }, "free")).toEqual({
      type: "set_carrier",
      value: "delhivery:0",
    });
    expect(writeCarrierCharge({ type: "set_carrier", value: "delhivery:79" }, "flat:149")).toEqual({
      type: "set_carrier",
      value: "delhivery:149",
    });
  });

  it("still says the whole thing after a change", () => {
    const changed = writeActionValue({ type: "set_carrier", value: "delhivery:79" }, "dunzo");
    expect(checkoutSentenceText({ conditions: [], actions: [changed] })).toBe(
      "On every order — send it by Dunzo Same-day for ₹79.",
    );
  });
});

describe("a rule that waits for something the shop no longer records", () => {
  const ghost = rule({
    conditions: [{ field: "coupon_code", operator: "equals", value: "DIWALI" }],
    actions: [{ type: "set_shipping", value: "free" }],
  });

  it("still reads as a sentence, naming the thing it waits for", () => {
    expect(checkoutSentenceText(ghost)).toBe(
      "When something called coupon_code is DIWALI — set the delivery charge to free.",
    );
  });

  it("is called out as one that can never run, rather than showing as On", () => {
    // The engine reads an unknown thing as empty, so "is DIWALI" is false on
    // every order for ever. The old screen showed this as an enabled rule with
    // "1 condition · Shipping" and no way to tell.
    expect(deadConditions(ghost)).toEqual([
      { field: "coupon_code", operator: "equals", value: "DIWALI" },
    ]);
    expect(ruleMatchesOrder(ghost, exampleContext(DEFAULT_EXAMPLE_ORDER))).toBe(false);
  });

  it("does not cry wolf over a clause that still runs", () => {
    // "is not X" is true when the thing is missing, so this one really does run.
    expect(
      deadConditions(
        rule({ conditions: [{ field: "coupon_code", operator: "not_equals", value: "DIWALI" }] }),
      ),
    ).toEqual([]);
    expect(deadConditions(rule())).toEqual([]);
  });
});

describe("what it does to a real order, in rupees", () => {
  const order: ExampleOrder = { subtotal: 2999, kind: "physical", payWith: "prepaid", pincode: "560001" };

  it("says the delivery charge as money, not as an action name", () => {
    const delivery = rule({
      conditions: [{ field: "subtotal", operator: "less_than_or_equal", value: "5000" }],
      actions: [{ type: "set_shipping", value: "flat:79" }],
    });
    const effect = describeRuleEffect(settings, [delivery], delivery, order);
    expect(effect.applies).toBe(true);
    expect(effect.changes).toContain("Delivery ₹79 instead of free.");
    expect(effect.totalAfter - effect.totalBefore).toBe(79);
  });

  it("is honest when the rule does not touch this order", () => {
    const digitalOnly = rule();
    const effect = describeRuleEffect(settings, [digitalOnly], digitalOnly, order);
    expect(effect.applies).toBe(false);
    expect(effect.whyNot).toBe("the order is a game code");
    expect(effect.changes).toEqual([]);
  });

  it("reports nothing when a later rule puts it back", () => {
    // Two rules, the second one winning on priority. The first is not broken
    // and is not off — it simply does nothing, and only a diff can say so.
    const first = rule({
      id: "cr-a",
      priority: 10,
      conditions: [],
      actions: [{ type: "set_shipping", value: "flat:99" }],
    });
    const second = rule({
      id: "cr-b",
      priority: 20,
      conditions: [],
      actions: [{ type: "set_shipping", value: "free" }],
    });
    const effect = describeRuleEffect(settings, [first, second], first, order);
    expect(effect.applies).toBe(true);
    expect(effect.changes).toEqual([]);
    expect(effect.totalAfter).toBe(effect.totalBefore);
  });

  it("says the discount for paying online in rupees, and warns about coupons", () => {
    const discount = rule({
      conditions: [],
      actions: [{ type: "set_prepaid_discount_pct", value: "10" }],
    });
    const effect = describeRuleEffect(settings, [discount], discount, order);
    expect(effect.changes[0]).toContain("Paying online takes off ₹299");
    expect(effect.changes[0]).toContain("whichever is bigger");
  });

  it("says cash on delivery going away in the words he would use", () => {
    const noCod = rule({ conditions: [], actions: [{ type: "hide_payment_method", value: "cod" }] });
    const effect = describeRuleEffect(settings, [noCod], noCod, {
      ...order,
      payWith: "cod",
    });
    expect(effect.changes).toContain(
      "Cash on delivery is not offered on this order — the customer has to pay online.",
    );
  });

  it("prices the order the way the invoice will", () => {
    // Inclusive GST: the shown price IS the payable amount and the tax comes
    // out of it. A screen that added 18% on top would quote a different total
    // from the one the customer is charged.
    const policy = resolveCheckoutPolicy(settings, [], exampleContext(order));
    const money = orderMoney(policy, order);
    expect(money.total).toBe(2999);
    expect(money.gst).toBe(2999 - Math.round(2999 / 1.18));
  });
});

describe("the browser copy of the rules agrees with the server", () => {
  it("honours the up-front payment that lifts the cash-on-delivery ceiling", () => {
    // CheckoutPolicyService does this; this copy did not, so a shop that had
    // set an advance still watched cash on delivery disappear above its limit
    // in its own preview and practice storefront.
    const withAdvance = {
      ...settings,
      codLimit: 10000,
      codAdvance: 100,
      codAdvanceUnlocksCap: true,
    };
    const big = resolveCheckoutPolicy(withAdvance, [], {
      subtotal: 40000,
      fulfillmentType: "physical",
    });
    expect(big.methods).toContain("cod");
    expect(big.codAdvance).toBe(100);

    const withoutAdvance = { ...settings, codLimit: 10000, codAdvance: 0 };
    const capped = resolveCheckoutPolicy(withoutAdvance, [], {
      subtotal: 40000,
      fulfillmentType: "physical",
    });
    expect(capped.methods).not.toContain("cod");
    expect(capped.banner).toContain("₹10,000");
  });

  it("takes 'prices already include GST' from the shop's own settings", () => {
    const exclusive = resolveCheckoutPolicy({ ...settings, taxInclusive: false }, [], {
      subtotal: 1000,
      fulfillmentType: "physical",
    });
    expect(exclusive.taxInclusive).toBe(false);
    expect(orderMoney(exclusive, { ...DEFAULT_EXAMPLE_ORDER, subtotal: 1000 }).total).toBe(1180);
  });
});

describe("the practice shop shows only rules that really do something", () => {
  it("has no rule that can never match and no invented split test", () => {
    for (const seed of seedCheckoutRules("2026-07-31T00:00:00.000Z")) {
      expect(deadConditions(seed)).toEqual([]);
      expect(seed.experimentId).toBeUndefined();
      expect(seed.conditionMode).toBeUndefined();
      // Named by what it says, on save. Nothing carries a stale description.
      expect(seed.description).toBe("");
    }
  });

  it("gives every practice rule a sentence and a money line", () => {
    const seeds = seedCheckoutRules("2026-07-31T00:00:00.000Z");
    for (const seed of seeds) {
      const text = checkoutSentenceText(seed);
      // Finished as a sentence — a full stop, or the closing quote of a note
      // that already ended in one.
      expect(text).toMatch(/[.”]$/);
      expect(text).not.toMatch(/undefined|NaN|\[object/);
      const effect = describeRuleEffect(settings, seeds, seed, DEFAULT_EXAMPLE_ORDER);
      expect(effect.applies || effect.whyNot.length > 0).toBe(true);
    }
  });
});

describe("firstUnmetClause speaks about the order, never about a field", () => {
  it("names the amount when the order is too big for the rule", () => {
    const small = rule({
      conditions: [{ field: "subtotal", operator: "less_than_or_equal", value: "1999" }],
      actions: [{ type: "set_shipping", value: "flat:79" }],
    });
    expect(firstUnmetClause(small, exampleContext({ ...DEFAULT_EXAMPLE_ORDER, subtotal: 9999 }))).toBe(
      "the order is ₹1,999 or less",
    );
  });
});

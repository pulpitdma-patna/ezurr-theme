import { describe, expect, it } from "vitest";
import {
  ACTION_TAILS,
  AUTOMATION_TRIGGERS,
  buildRuleSentence,
  describeLastRun,
  describeWhen,
  paymentFilter,
  sentenceToText,
  setConditionValue,
  swallowedStatus,
  TRIGGER_CHOICES,
  TRIGGER_HEADS,
  unsaidConditions,
  type ActionKind,
  type AutomationRule,
  type WordingChoice,
} from "@/lib/automationGrammar";

const wordings: Record<string, WordingChoice[]> = {
  send_whatsapp: [
    { value: "order_shipped", label: "Order on the way" },
    { value: "order_confirmed", label: "Order accepted" },
  ],
  send_email: [{ value: "order_shipped", label: "Order on the way (email)" }],
};

const wordingsFor = (type: ActionKind) => wordings[type] ?? [];

function rule(overrides: Partial<AutomationRule> = {}): AutomationRule {
  return {
    id: "au-1",
    name: "",
    description: "",
    trigger: "order_status_changed",
    enabled: true,
    conditions: [{ field: "status", operator: "equals", value: "shipped" }],
    actions: [{ type: "send_whatsapp", value: "order_shipped" }],
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("one rule reads as one sentence", () => {
  it("says what the old screen drew as three boxes", () => {
    // The whole phase in one assertion. The list used to render
    // "Notify on ship / No description / Order status → status = shipped →
    // WhatsApp", which describes our data model rather than his shop.
    expect(sentenceToText(buildRuleSentence(rule(), wordingsFor))).toBe(
      "When an order is marked on the way — send the customer a WhatsApp: Order on the way.",
    );
  });

  it("swallows the status into the head, so the condition builder is not needed", () => {
    const slots = buildRuleSentence(rule(), wordingsFor);
    // No slot anywhere says the word "status", "field" or "equals".
    const text = sentenceToText(slots);
    expect(text).not.toMatch(/status|equals|field/i);
    expect(swallowedStatus(rule())).toBe("shipped");
  });

  it("names a wording that is not chosen instead of leaving a blank", () => {
    const unset = rule({ actions: [{ type: "send_whatsapp", value: "" }] });
    expect(sentenceToText(buildRuleSentence(unset, wordingsFor))).toContain("choose the wording");

    // And when nothing is approved it says that, because "no wording is
    // approved yet" is the actual reason his customers hear nothing.
    expect(sentenceToText(buildRuleSentence(unset, () => []))).toContain(
      "no wording is approved yet",
    );
  });

  it("only offers wordings that can go out on that channel", () => {
    const emailRule = rule({ actions: [{ type: "send_email", value: "order_shipped" }] });
    const slots = buildRuleSentence(emailRule, wordingsFor);
    const slot = slots.find((s) => s.kind === "choice" && s.id === "action-0-wording");
    expect(slot?.kind === "choice" && slot.options).toEqual(wordings.send_email);
  });

  it("says the filter clause only when there is one", () => {
    expect(sentenceToText(buildRuleSentence(rule(), wordingsFor))).not.toContain("only if");

    const cod = rule({
      conditions: [
        { field: "status", operator: "equals", value: "shipped" },
        { field: "payment", operator: "equals", value: "cod" },
      ],
    });
    expect(sentenceToText(buildRuleSentence(cod, wordingsFor))).toContain(
      "and only if it is cash on delivery",
    );
    expect(paymentFilter(cod)).toBe("cod");
  });
});

describe("nothing in a rule is lost by being said differently", () => {
  it("keeps a condition the sentence cannot say, and shows it", () => {
    // A rule written through the API before this screen existed. Redesigning
    // the editor must not quietly narrow what the rule matches on.
    const odd = rule({
      conditions: [
        { field: "status", operator: "equals", value: "shipped" },
        { field: "order.total", operator: "less_than_or_equal", value: "500000" },
      ],
    });
    expect(unsaidConditions(odd)).toEqual([
      { field: "order.total", operator: "less_than_or_equal", value: "500000" },
    ]);
  });

  it("rewrites one clause in place and leaves the rest alone", () => {
    const conditions = [
      { field: "status" as const, operator: "equals" as const, value: "shipped" },
      { field: "order.total", operator: "less_than_or_equal" as const, value: "500000" },
    ];
    expect(setConditionValue(conditions, "status", "delivered")).toEqual([
      { field: "status", operator: "equals", value: "delivered" },
      { field: "order.total", operator: "less_than_or_equal", value: "500000" },
    ]);
  });

  it("removes the clause when the answer is 'any', rather than matching an empty string", () => {
    // A `{field:"payment", value:""}` row would compare payment_method against
    // "" and match nothing, so the rule would silently stop running.
    const conditions = [{ field: "payment", operator: "equals" as const, value: "cod" }];
    expect(setConditionValue(conditions, "payment", "")).toEqual([]);
  });
});

describe("every trigger the server accepts is reachable", () => {
  it("covers all twelve, including the five the old builder omitted", () => {
    // AutomationController::TRIGGERS. The builder offered seven; the five it
    // left out included baskets left behind and back in stock, both fully
    // built on the server and both asked for by name.
    expect(AUTOMATION_TRIGGERS).toHaveLength(12);
    for (const key of [
      "cart_abandoned",
      "back_in_stock",
      "order_placed",
      "payment_pending",
      "digital_code_delivered",
    ] as const) {
      expect(AUTOMATION_TRIGGERS).toContain(key);
    }
  });

  it("gives every trigger a sentence head and a plain-English choice", () => {
    for (const key of AUTOMATION_TRIGGERS) {
      expect(TRIGGER_HEADS[key].before.startsWith("When ")).toBe(true);
      expect(TRIGGER_HEADS[key].blurb.length).toBeGreaterThan(0);
    }
    expect(TRIGGER_CHOICES.map((c) => c.value).sort()).toEqual([...AUTOMATION_TRIGGERS].sort());
    // The choice label is what sits inside "When ‹…›", so it must not repeat it.
    for (const choice of TRIGGER_CHOICES) expect(choice.label).not.toMatch(/^When /);
  });

  it("marks exactly the two actions whose value is a wording key", () => {
    // This is the defect the phase is named after: the value on these two is
    // read as MessageTemplate::where('event_key', …), never as prose.
    const wordingActions = Object.entries(ACTION_TAILS)
      .filter(([, tail]) => tail.valueIsWording)
      .map(([type]) => type)
      .sort();
    expect(wordingActions).toEqual(["send_email", "send_whatsapp"]);
  });
});

describe("the grey line under a running rule", () => {
  const at = new Date("2026-07-31T10:00:00Z").toISOString();
  const now = new Date("2026-07-31T10:14:00Z");

  it("answers 'did the customer get it', not 'did our code finish'", () => {
    // A run completes happily while the message was held back for want of
    // approved wording. The old screen called that "Completed" and put a small
    // grey "blocked" chip beside it, inside a tab he had to go and find.
    expect(
      describeLastRun({ id: "1", ruleId: "au-1", ruleName: "", at, status: "completed", delivery: "blocked" }, now),
    ).toBe("Last ran 14 minutes ago · held back — the wording is not approved yet");

    expect(
      describeLastRun({ id: "1", ruleId: "au-1", ruleName: "", at, status: "completed", delivery: "simulated" }, now),
    ).toBe("Last ran 14 minutes ago · practice mode — nothing left the shop");

    expect(
      describeLastRun({ id: "1", ruleId: "au-1", ruleName: "", at, status: "completed", delivery: "sent" }, now),
    ).toBe("Last ran 14 minutes ago · delivered");

    expect(
      describeLastRun({ id: "1", ruleId: "au-1", ruleName: "", at, status: "failed" }, now),
    ).toBe("Last ran 14 minutes ago · did not work");
  });

  it("says so plainly when a rule has never run", () => {
    expect(describeLastRun(undefined)).toBe("Has not run yet.");
  });

  it("never prints a timestamp where a person would say a phrase", () => {
    expect(describeWhen(at, new Date("2026-07-31T10:00:20Z"))).toBe("just now");
    expect(describeWhen(at, new Date("2026-07-31T13:00:00Z"))).toBe("3 hours ago");
    expect(describeWhen(at, new Date("2026-08-01T11:00:00Z"))).toBe("yesterday");
    expect(describeWhen(at, new Date("2026-08-10T11:00:00Z"))).toBe("on 31 Jul");
  });
});

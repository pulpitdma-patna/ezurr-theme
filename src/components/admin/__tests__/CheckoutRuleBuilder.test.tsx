import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  CheckoutRuleBuilder,
  WhatThisDoes,
  blankCheckoutRule,
} from "@/components/admin/CheckoutRuleBuilder";
import { defaultAdminSettings } from "@/data/admin";
import {
  checkoutSentenceText,
  DEFAULT_EXAMPLE_ORDER,
  type AdminCheckoutRule,
} from "@/lib/checkoutRules";

afterEach(cleanup);

const settings = { ...defaultAdminSettings, codEnabled: true, codLimit: 10000, prepaidDiscount: 0 };

function rule(overrides: Partial<AdminCheckoutRule> = {}): AdminCheckoutRule {
  return {
    ...blankCheckoutRule(),
    id: "cr-1",
    priority: 10,
    conditions: [{ field: "subtotal", operator: "less_than_or_equal", value: "1999" }],
    actions: [{ type: "set_shipping", value: "flat:79" }],
    ...overrides,
  };
}

/**
 * What the drawer reads as out loud — the chosen word from each dropdown, not
 * every word it could offer.
 */
function sentenceOnScreen(): string {
  const paragraph = document.querySelector("p.flex.flex-wrap");
  const words: string[] = [];
  paragraph?.childNodes.forEach((node) => {
    const element = node as HTMLElement;
    const select = element.querySelector?.("select") as HTMLSelectElement | null;
    if (select) {
      words.push(select.selectedOptions[0]?.textContent ?? "");
      return;
    }
    words.push((element.textContent ?? "").replace("▾", ""));
  });
  return words.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

describe("the sentence in the drawer is the sentence in the list", () => {
  it("shows the same words whether they are dropdowns or not", () => {
    const draft = rule();
    render(
      <CheckoutRuleBuilder
        rule={draft}
        settings={settings}
        otherRules={[draft]}
        order={DEFAULT_EXAMPLE_ORDER}
        onOrderChange={() => {}}
        onClose={() => {}}
        onSave={() => {}}
      />,
    );
    // The list renders the same rule read-only. If these ever differ, the list
    // is a summary again and every rule has to be opened to be believed.
    expect(sentenceOnScreen()).toBe(checkoutSentenceText(draft).replace(/\.$/, ""));
  });

  it("names the rule after what it says, so nothing can go stale against it", () => {
    const onSave = vi.fn();
    const draft = rule();
    render(
      <CheckoutRuleBuilder
        rule={draft}
        settings={settings}
        otherRules={[draft]}
        order={DEFAULT_EXAMPLE_ORDER}
        onOrderChange={() => {}}
        onClose={() => {}}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save this" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "When the order is ₹1,999 or less — set the delivery charge to ₹79.",
        description: "",
      }),
    );
  });

  it("will not save a rule with a blank in it", () => {
    const onSave = vi.fn();
    const unfinished = rule({ actions: [{ type: "set_shipping", value: "" }] });
    render(
      <CheckoutRuleBuilder
        rule={unfinished}
        settings={settings}
        otherRules={[unfinished]}
        order={DEFAULT_EXAMPLE_ORDER}
        onOrderChange={() => {}}
        onClose={() => {}}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save this" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/Finish the part in orange/)).toBeTruthy();
  });

  it("changes a word in the sentence rather than a field in a grid", () => {
    const draft = rule();
    render(
      <CheckoutRuleBuilder
        rule={draft}
        settings={settings}
        otherRules={[draft]}
        order={DEFAULT_EXAMPLE_ORDER}
        onOrderChange={() => {}}
        onClose={() => {}}
        onSave={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText("set the delivery charge to"), {
      target: { value: "free" },
    });
    expect(sentenceOnScreen()).toBe("When the order is ₹1,999 or less — set the delivery charge to free");
  });
});

describe("what a rule does to a real order", () => {
  it("says the money, on an order that matches", () => {
    const delivery = rule({
      conditions: [{ field: "subtotal", operator: "less_than_or_equal", value: "5000" }],
    });
    render(
      <WhatThisDoes
        compact
        settings={settings}
        allRules={[delivery]}
        rule={delivery}
        order={{ subtotal: 2999, kind: "physical", payWith: "prepaid", pincode: "560001" }}
      />,
    );
    expect(screen.getByText(/₹3,078 instead of ₹2,999/)).toBeTruthy();
    expect(screen.getByText("Delivery ₹79 instead of free.")).toBeTruthy();
  });

  it("says plainly when it does not touch this order", () => {
    const digitalOnly = rule({
      conditions: [{ field: "fulfillment_type", operator: "equals", value: "digital" }],
      actions: [{ type: "hide_payment_method", value: "cod" }],
    });
    render(
      <WhatThisDoes
        compact
        settings={settings}
        allRules={[digitalOnly]}
        rule={digitalOnly}
        order={{ subtotal: 2999, kind: "physical", payWith: "prepaid", pincode: "560001" }}
      />,
    );
    expect(
      screen.getByText("Nothing happens on this order. It only applies when the order is a game code."),
    ).toBeTruthy();
  });
});

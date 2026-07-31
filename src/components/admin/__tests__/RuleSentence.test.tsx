import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RuleSentence } from "@/components/admin/RuleSentence";
import { buildRuleSentence, type ActionKind, type AutomationRule } from "@/lib/automationGrammar";
import { isAlreadyARule, RECOMMENDED_RULES } from "@/data/automationTemplates";

const wordingsFor = (type: ActionKind) =>
  type === "send_whatsapp" ? [{ value: "order_shipped", label: "Order on the way" }] : [];

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

describe("RuleSentence", () => {
  it("reads as one sentence in the list, with no controls to press by mistake", () => {
    render(<RuleSentence slots={buildRuleSentence(rule(), wordingsFor)} />);

    expect(document.body.textContent).toContain("When an order is marked");
    expect(document.body.textContent).toContain("on the way");
    expect(document.body.textContent).toContain("send the customer a WhatsApp");
    // Read-only: a list of rules should not be a list of dropdowns he can nudge.
    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
  });

  it("turns exactly the slots that were given a handler into dropdowns", () => {
    const onStatus = vi.fn();
    render(
      <RuleSentence slots={buildRuleSentence(rule(), wordingsFor, { onStatus })} />,
    );

    const select = screen.getByLabelText("Which change this watches for");
    fireEvent.change(select, { target: { value: "delivered" } });
    expect(onStatus).toHaveBeenCalledWith("delivered");

    // Only the status was made editable, so nothing else became a control.
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
  });

  it("shows an unmade choice as the words that are missing, not as a blank", () => {
    const unset = rule({ actions: [{ type: "send_whatsapp", value: "" }] });
    render(<RuleSentence slots={buildRuleSentence(unset, wordingsFor)} />);
    expect(screen.getByText("choose the wording")).toBeInTheDocument();
  });
});

describe("what the shop is not saying yet", () => {
  it("stops recommending a message once a rule already does it", () => {
    const shipped = RECOMMENDED_RULES.find((r) => r.id === "rec-order-shipped");
    expect(shipped).toBeDefined();
    expect(isAlreadyARule(shipped!, [rule()])).toBe(true);
  });

  it("keeps recommending it when an existing rule watches a different moment", () => {
    // Same trigger, same action, different status: telling a customer their
    // order is accepted is not telling them it is on the way.
    const shipped = RECOMMENDED_RULES.find((r) => r.id === "rec-order-shipped")!;
    const accepted = rule({
      conditions: [{ field: "status", operator: "equals", value: "confirmed" }],
      actions: [{ type: "send_whatsapp", value: "order_confirmed" }],
    });
    expect(isAlreadyARule(shipped, [accepted])).toBe(false);
  });

  it("does not reappear because the owner renamed his rule", () => {
    const shipped = RECOMMENDED_RULES.find((r) => r.id === "rec-order-shipped")!;
    expect(isAlreadyARule(shipped, [rule({ name: "courier msg" })])).toBe(true);
  });

  it("only ever recommends a send whose value is a wording key, never prose", () => {
    // Four of the twelve gallery entries this replaces wrote sentences into
    // that field, which is read as MessageTemplate::where('event_key', …), so
    // they produced rules that showed as on and could never send.
    for (const recommendation of RECOMMENDED_RULES) {
      for (const action of recommendation.actions) {
        if (action.type !== "send_whatsapp" && action.type !== "send_email") continue;
        expect(action.value).toMatch(/^[a-z0-9_]+$/);
      }
    }
  });
});

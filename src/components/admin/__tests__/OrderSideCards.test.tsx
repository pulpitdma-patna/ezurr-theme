import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import {
  OrderCustomerCard,
  OrderMoneyCard,
  OrderPrintCard,
} from "@/components/admin/OrderSideCards";
import type { AdminOrder } from "@/data/admin";

afterEach(cleanup);

function order(overrides: Partial<AdminOrder> = {}): AdminOrder {
  return {
    id: "EZX1042",
    customerName: "Ramesh Kumar",
    customerMobile: "9876543210",
    status: "packed",
    placedAt: "2026-07-21T10:42:00.000Z",
    total: "₹4,499",
    payment: "COD",
    city: "Patna",
    items: [],
    timeline: [],
    ...overrides,
  };
}

const money: NonNullable<AdminOrder["money"]> = {
  method: "cod",
  total: 4499,
  depositAmount: 500,
  amountPaid: 500,
  balanceDue: 3999,
  refundedTotal: 500,
  refundable: 0,
  balanceLabel: "Payable on delivery",
  sentence: "Paid ₹500, collect ₹3,999",
};

describe("OrderCustomerCard", () => {
  /**
   * On a phone these are the two most valuable buttons in the admin: every
   * cash-on-delivery confirmation is a phone call, and the screen used to print
   * the number and give him nothing to do with it.
   */
  it("gives him one tap to ring the customer and one to WhatsApp them", () => {
    render(<OrderCustomerCard order={order()} />);

    expect(screen.getByText("Call").getAttribute("href")).toBe("tel:+919876543210");
    expect(screen.getByText("WhatsApp").getAttribute("href")).toBe("https://wa.me/919876543210");
  });

  /** By number, because a search on the orders list spans every pile. */
  it("links to the rest of that customer's orders", () => {
    render(<OrderCustomerCard order={order()} />);

    expect(screen.getByText("See all their orders →").getAttribute("href")).toBe(
      "/admin/orders?q=9876543210",
    );
  });

  it("offers no call button for a number it cannot dial", () => {
    render(<OrderCustomerCard order={order({ customerMobile: "12" })} />);

    expect(screen.queryByText("Call")).toBeNull();
  });
});

describe("OrderMoneyCard", () => {
  /**
   * Every figure comes from the server's money block. A ₹500 part refund used to
   * print as the whole order total, because the screen fell back to it.
   */
  it("shows what came in, what is still to collect, and what went back", () => {
    render(<OrderMoneyCard order={order({ money })} />);

    expect(screen.getByText("₹4,499")).toBeTruthy();
    // ₹500 twice: paid online, and the same ₹500 sent back again afterwards.
    expect(screen.getAllByText("₹500")).toHaveLength(2);
    expect(screen.getByText("₹3,999")).toBeTruthy();
    expect(screen.getByText("To collect at the door")).toBeTruthy();
    expect(screen.getByText("Sent back")).toBeTruthy();
  });

  it("says nothing about a refund that never happened", () => {
    render(<OrderMoneyCard order={order({ money: { ...money, refundedTotal: 0 } })} />);

    expect(screen.queryByText("Sent back")).toBeNull();
  });

  it("prints the reason an action is missing rather than leaving a gap", () => {
    render(
      <OrderMoneyCard order={order({ money })} notes={["Only the owner can send money back."]} />,
    );

    expect(screen.getByText("Only the owner can send money back.")).toBeTruthy();
  });
});

describe("OrderPrintCard", () => {
  it("sends every print to the screen that renders the real document", () => {
    render(<OrderPrintCard order={order()} />);

    expect(screen.getByText("Print packing list").getAttribute("href")).toBe(
      "/admin/orders/EZX1042/documents?type=packing_slip",
    );
    expect(screen.getByText("Print bill").getAttribute("href")).toBe(
      "/admin/orders/EZX1042/documents?type=invoice",
    );
  });

  /** The courier's own artwork — opened, never redrawn, and only when it exists. */
  it("offers the courier label only once the courier has produced one", () => {
    const { rerender } = render(<OrderPrintCard order={order()} labelUrl={null} />);
    expect(screen.queryByText("Print courier label")).toBeNull();

    rerender(<OrderPrintCard order={order()} labelUrl="https://courier.example/label.pdf" />);
    expect(screen.getByText("Print courier label").getAttribute("href")).toBe(
      "https://courier.example/label.pdf",
    );
  });
});

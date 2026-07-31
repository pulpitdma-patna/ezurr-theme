import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { OrderAnswerBar } from "@/components/admin/OrderAnswerBar";
import type { AdminOrder, AdminOrderStatus } from "@/data/admin";

afterEach(cleanup);

function order(
  overrides: Partial<AdminOrder> = {},
  status: AdminOrderStatus = "confirmed",
): AdminOrder {
  return {
    id: "EZX1042",
    customerName: "Ramesh Kumar",
    customerMobile: "9876543210",
    status,
    placedAt: "2026-07-21T10:42:00.000Z",
    total: "₹4,499",
    payment: "COD",
    city: "Patna",
    items: [
      {
        name: "DualSense controller",
        brand: "",
        price: "₹4,499",
        qty: 1,
        image: "",
        productKey: "dualsense",
        sku: "dualsense",
        fulfillmentType: "physical",
      },
    ],
    timeline: [],
    ...overrides,
  };
}

/** The money block as the server sends it — including the long sentence. */
function money(detail: string): NonNullable<AdminOrder["money"]> {
  return {
    method: "cod",
    total: 4499,
    depositAmount: 0,
    amountPaid: 0,
    balanceDue: 4499,
    refundedTotal: 0,
    refundable: 0,
    balanceLabel: "Payable on delivery",
    sentence: "To collect ₹4,499",
    detail,
  } as NonNullable<AdminOrder["money"]>;
}

describe("OrderAnswerBar", () => {
  /**
   * The sentence is the server's, never rebuilt here. A browser-side version of
   * it is exactly how "Paid" ends up printed beside an unpaid order.
   */
  it("leads with the money sentence the server worked out", () => {
    render(
      <OrderAnswerBar
        order={order({ money: money("Cash on delivery — collect ₹4,499 at the door") })}
        primary={null}
      />,
    );

    expect(screen.getByText("Cash on delivery — collect ₹4,499 at the door")).toBeTruthy();
  });

  /**
   * The whole point of the bar. The old screen stacked Mark packed, Reject COD
   * and Send back ₹4,499 as three identical buttons, so the one that empties the
   * bank account looked exactly like the one he presses twenty times a day.
   */
  it("shows one button, and keeps anything irreversible behind the ⋯", () => {
    const packed = vi.fn();
    const cancel = vi.fn();

    render(
      <OrderAnswerBar
        order={order()}
        primary={{ key: "packed", label: "Packed", onSelect: packed }}
        more={[{ key: "cancel", label: "Turn down this order", danger: true, onSelect: cancel }]}
      />,
    );

    expect(screen.getAllByRole("button").filter((b) => b.textContent === "Packed")).toHaveLength(1);
    expect(screen.queryByText("Turn down this order")).toBeNull();

    fireEvent.click(screen.getByLabelText("More actions"));
    fireEvent.click(screen.getByText("Turn down this order"));

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(packed).not.toHaveBeenCalled();
  });

  it("presses the one next move without a confirmation in the way", () => {
    const packed = vi.fn();
    render(
      <OrderAnswerBar
        order={order()}
        primary={{ key: "packed", label: "Packed", onSelect: packed }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Packed" }));

    expect(packed).toHaveBeenCalledTimes(1);
  });

  /** No button at all beats a disabled button he will keep pressing. */
  it("says there is nothing left to do rather than showing a dead button", () => {
    render(<OrderAnswerBar order={order({}, "delivered")} primary={null} />);

    expect(screen.getByText(/Nothing more to do/)).toBeTruthy();
    expect(screen.queryByLabelText("More actions")).toBeNull();
  });

  /** An order stuck on the money says why, instead of implying he forgot something. */
  it("explains the wait when there is no move to make yet", () => {
    render(
      <OrderAnswerBar
        order={order({}, "pending_payment")}
        primary={null}
        note="Waiting for the money to come in. Nothing to do here yet."
      />,
    );

    expect(screen.getByText("Waiting for the money to come in. Nothing to do here yet.")).toBeTruthy();
  });

  it("carries the rail, so what has happened is on the same line as what is next", () => {
    render(
      <OrderAnswerBar
        order={order({}, "packed")}
        primary={{ key: "shipped", label: "Sent", onSelect: vi.fn() }}
      />,
    );

    expect(screen.getByTestId("order-rail")).toBeTruthy();
    expect(screen.getByText("Delivered")).toBeTruthy();
  });
});

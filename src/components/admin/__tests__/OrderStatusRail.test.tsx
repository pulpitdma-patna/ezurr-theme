import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { OrderStatusRail, orderRail } from "@/components/admin/OrderStatusRail";
import type { AdminOrder, AdminOrderItem, AdminOrderStatus } from "@/data/admin";

afterEach(cleanup);

function item(fulfillmentType: AdminOrderItem["fulfillmentType"], name = "Thing"): AdminOrderItem {
  return {
    name,
    brand: "",
    price: "₹4,499",
    qty: 1,
    image: "",
    productKey: name.toLowerCase(),
    sku: name.toLowerCase(),
    fulfillmentType,
  };
}

function order(status: AdminOrderStatus, items: AdminOrderItem[]): AdminOrder {
  return {
    id: "EZX1042",
    customerName: "Ramesh Kumar",
    customerMobile: "9876543210",
    status,
    placedAt: "2026-07-21T10:42:00.000Z",
    total: "₹4,499",
    payment: "COD",
    city: "Patna",
    items,
    timeline: [],
  };
}

const labels = (rail: ReturnType<typeof orderRail>) => rail.steps.map((s) => s.label);
const state = (rail: ReturnType<typeof orderRail>, label: string) =>
  rail.steps.find((s) => s.label === label)?.state;

describe("orderRail", () => {
  it("walks a physical order from placed to delivered", () => {
    const rail = orderRail(order("packed", [item("physical")]));

    expect(rail.shape).toBe("physical");
    expect(labels(rail)).toEqual(["Placed", "Accepted", "Packed", "Sent", "Delivered"]);
    expect(state(rail, "Packed")).toBe("done");
    expect(state(rail, "Sent")).toBe("current");
    expect(state(rail, "Delivered")).toBe("todo");
  });

  /**
   * A code sold by email has nothing to pack and nothing to hand to a courier.
   * A greyed-out "Packed" step on it invites him to look for a parcel that was
   * never going to exist.
   */
  it("gives a code-only order three steps, and none of them is Packed", () => {
    const rail = orderRail(order("paid", [item("digital", "Game code")]), { codeSent: false });

    expect(rail.shape).toBe("digital");
    expect(labels(rail)).toEqual(["Placed", "Paid", "Code sent"]);
    expect(state(rail, "Paid")).toBe("done");
    expect(state(rail, "Code sent")).toBe("current");
  });

  /** Only the codes themselves can answer this — no status implies it. */
  it("marks a code as sent only when a code has actually gone out", () => {
    const paidOrder = order("paid", [item("digital")]);

    expect(state(orderRail(paidOrder, { codeSent: false }), "Code sent")).toBe("current");
    expect(state(orderRail(paidOrder, { codeSent: true }), "Code sent")).toBe("done");
  });

  /**
   * The mixed-order rule. He has one parcel to post and one customer to ring;
   * two rails on one order would be a truthful data model and a useless screen.
   */
  it("gives a mixed order the physical rail, because a parcel still has to go out", () => {
    const rail = orderRail(order("confirmed", [item("digital", "Code"), item("physical", "Pad")]));

    expect(rail.shape).toBe("physical");
    expect(labels(rail)).toContain("Packed");
  });

  it("pins the wait in front of a pre-order rather than showing it stalled", () => {
    const rail = orderRail(order("preorder", [item("preorder", "GTA VI")]));

    expect(rail.shape).toBe("preorder");
    expect(rail.pinned).toBe("Waiting for release");
    expect(labels(rail)).toContain("Delivered");
  });

  /** A date nobody recorded is a date we do not print. */
  it("names the expected date only when there is one", () => {
    const withDate = orderRail(order("preorder", [item("preorder")]), { releaseAt: "14 Aug" });

    expect(withDate.pinned).toBe("Waiting for release — expected 14 Aug");
  });

  it("says an order stopped instead of drawing a rail it will never finish", () => {
    expect(orderRail(order("cancelled", [item("physical")])).terminal).toContain("Cancelled");
    expect(orderRail(order("refunded", [item("physical")])).terminal).toContain("Money sent back");
  });
});

describe("OrderStatusRail", () => {
  it("renders every step of the rail it was given", () => {
    render(<OrderStatusRail order={order("shipped", [item("physical")])} />);

    for (const label of ["Placed", "Accepted", "Packed", "Sent", "Delivered"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it("renders one sentence, not a rail, for an order that stopped", () => {
    render(<OrderStatusRail order={order("cancelled", [item("physical")])} />);

    expect(screen.getByTestId("order-rail").textContent).toContain("Nothing more will happen");
    expect(screen.queryByText("Packed")).toBeNull();
  });
});

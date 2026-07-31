import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { OrderItemsCard } from "@/components/admin/OrderItemsCard";
import type { AdminOrder, AdminOrderItem } from "@/data/admin";
import type { ApiDigitalCode } from "@/lib/apiClient";

afterEach(cleanup);

function item(
  fulfillmentType: AdminOrderItem["fulfillmentType"],
  name: string,
  productKey: string,
): AdminOrderItem {
  return {
    name,
    brand: "",
    price: "₹4,499",
    qty: 1,
    image: "",
    productKey,
    sku: productKey,
    fulfillmentType,
  };
}

function order(items: AdminOrderItem[]): AdminOrder {
  return {
    id: "EZX1042",
    customerName: "Ramesh Kumar",
    customerMobile: "9876543210",
    status: "paid",
    placedAt: "2026-07-21T10:42:00.000Z",
    total: "₹4,499",
    payment: "Prepaid",
    city: "Patna",
    items,
    timeline: [],
  };
}

function code(productKey: string, assignedAt: string | null): ApiDigitalCode {
  return {
    id: 1,
    product_key: productKey,
    masked_code: "XXXX-XXXX-9F2K",
    status: assignedAt ? "assigned" : "reserved",
    order_id: 7,
    assigned_at: assignedAt,
    created_at: null,
  };
}

describe("OrderItemsCard", () => {
  /** The code is a fact about a line. It used to live in a separate section. */
  it("says where the code went, on the line it went for", () => {
    render(
      <OrderItemsCard
        order={order([item("digital", "FIFA 26 code", "fifa-26")])}
        codes={[code("fifa-26", "2026-07-21T10:45:00.000Z")]}
      />,
    );

    expect(screen.getByText(/Code sent to \+91 98765 43210/)).toBeTruthy();
  });

  it("tells him a code he has not sent will go on its own", () => {
    render(
      <OrderItemsCard order={order([item("digital", "FIFA 26 code", "fifa-26")])} codes={[]} />,
    );

    expect(screen.getByText("The code goes out on its own once the payment clears.")).toBeTruthy();
  });

  /** A physical line has no code line at all — no empty state, no blank row. */
  it("says nothing about codes on something he posts", () => {
    render(
      <OrderItemsCard order={order([item("physical", "DualSense", "dualsense")])} codes={[]} />,
    );

    expect(screen.queryByText(/code/i)).toBeNull();
  });

  /**
   * Job #9. "It never arrived" had no answer anywhere in the admin — not on the
   * order, not on the codes screen — so the only fix was to open the database.
   */
  it("offers a resend once a code has actually gone out", () => {
    const resend = vi.fn();
    render(
      <OrderItemsCard
        order={order([item("digital", "FIFA 26 code", "fifa-26")])}
        codes={[code("fifa-26", "2026-07-21T10:45:00.000Z")]}
        onResend={resend}
      />,
    );

    fireEvent.click(screen.getByText("Send the code again"));

    expect(resend).toHaveBeenCalledTimes(1);
  });

  it("offers no resend when nothing has gone out yet", () => {
    render(
      <OrderItemsCard
        order={order([item("digital", "FIFA 26 code", "fifa-26")])}
        codes={[code("fifa-26", null)]}
        onResend={vi.fn()}
      />,
    );

    expect(screen.queryByText("Send the code again")).toBeNull();
  });

  /** He is on the phone to the customer — the result has to still be there. */
  it("leaves the result of a resend on the page", () => {
    render(
      <OrderItemsCard
        order={order([item("digital", "FIFA 26 code", "fifa-26")])}
        codes={[code("fifa-26", "2026-07-21T10:45:00.000Z")]}
        onResend={vi.fn()}
        resend={{ kind: "sent", at: new Date("2026-07-21T10:50:00.000Z"), mobile: "9876543210" }}
      />,
    );

    expect(screen.getByText(/Sent again to \+91 98765 43210/)).toBeTruthy();
  });

  it("reports a failed resend as a failure, in place", () => {
    render(
      <OrderItemsCard
        order={order([item("digital", "FIFA 26 code", "fifa-26")])}
        codes={[code("fifa-26", "2026-07-21T10:45:00.000Z")]}
        onResend={vi.fn()}
        resend={{ kind: "failed", message: "Your session has expired." }}
      />,
    );

    expect(screen.getByText(/Not sent — Your session has expired\./)).toBeTruthy();
  });

  it("counts the things in the order in words he uses", () => {
    render(
      <OrderItemsCard
        order={order([
          item("physical", "DualSense", "dualsense"),
          item("physical", "Headset", "headset"),
        ])}
        codes={[]}
      />,
    );

    expect(screen.getByText("2 things in this order")).toBeTruthy();
  });
});

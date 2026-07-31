import { describe, it, expect } from "vitest";
import { normalizeApiOrderStatus } from "@/lib/apiMappers";

/**
 * What an order's status is allowed to become on the way to the screen.
 *
 * The mapper listed only some of the statuses the API sends and fell through to
 * `return "confirmed"` for the rest — so an order whose payment had FAILED was
 * shown to the owner, and to the customer, as confirmed. The next thing an owner
 * does with a confirmed order is pack and ship it, for money that never arrived.
 *
 * The rule this pins is not "map these eleven strings"; it is that an unknown
 * status must never resolve to something that looks like a completed sale.
 */
describe("normalizeApiOrderStatus", () => {
  it("does not disguise a failed payment as confirmed", () => {
    expect(normalizeApiOrderStatus("payment_failed")).toBe("payment_failed");
  });

  it("keeps every status the API actually sends", () => {
    for (const status of [
      "pending",
      "pending_payment",
      "confirmed",
      "paid",
      "payment_failed",
      "packed",
      "shipped",
      "delivered",
      "cancelled",
      "preorder",
      "refunded",
    ]) {
      expect(normalizeApiOrderStatus(status)).toBe(status);
    }
  });

  /** A fallback on the money path has one safe direction: make someone look. */
  it("falls back to pending, never to a settled-looking status", () => {
    for (const unknown of ["", "who_knows", "PAID", "delivered_maybe"]) {
      const mapped = normalizeApiOrderStatus(unknown);
      expect(mapped).toBe("pending");
      expect(["confirmed", "paid", "packed", "shipped", "delivered"]).not.toContain(mapped);
    }
  });
});

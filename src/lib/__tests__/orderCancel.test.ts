import { describe, expect, it } from "vitest";
import { canCustomerCancel } from "@/lib/orderCancel";

describe("canCustomerCancel", () => {
  it("allows pre-dispatch statuses", () => {
    expect(canCustomerCancel("pending_payment")).toBe(true);
    expect(canCustomerCancel("paid")).toBe(true);
    expect(canCustomerCancel("preorder")).toBe(true);
  });

  it("blocks packed and later", () => {
    expect(canCustomerCancel("packed")).toBe(false);
    expect(canCustomerCancel("shipped")).toBe(false);
    expect(canCustomerCancel("delivered")).toBe(false);
    expect(canCustomerCancel("cancelled")).toBe(false);
  });
});

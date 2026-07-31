import { describe, expect, it, vi } from "vitest";
import {
  isSettledPaymentStatus,
  isSuccessfulPaymentStatus,
  pollPaymentSettlement,
} from "@/lib/paymentConfirm";

describe("paymentConfirm", () => {
  it("recognises settled statuses", () => {
    expect(isSettledPaymentStatus("paid")).toBe(true);
    expect(isSettledPaymentStatus("confirmed")).toBe(true);
    expect(isSettledPaymentStatus("payment_failed")).toBe(true);
    expect(isSettledPaymentStatus("pending_payment")).toBe(false);
  });

  it("treats paid and confirmed as success", () => {
    expect(isSuccessfulPaymentStatus("paid")).toBe(true);
    expect(isSuccessfulPaymentStatus("confirmed")).toBe(true);
    expect(isSuccessfulPaymentStatus("payment_failed")).toBe(false);
  });

  it("polls until paid", async () => {
    const fetchStatus = vi
      .fn()
      .mockResolvedValueOnce("pending_payment")
      .mockResolvedValueOnce("paid");
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await pollPaymentSettlement({
      fetchStatus,
      intervalMs: 10,
      timeoutMs: 1000,
      sleep,
    });

    expect(result).toEqual({ kind: "settled", status: "paid" });
    expect(fetchStatus).toHaveBeenCalledTimes(2);
  });

  it("returns failed when webhook marks payment_failed", async () => {
    const result = await pollPaymentSettlement({
      fetchStatus: async () => "payment_failed",
      intervalMs: 10,
      timeoutMs: 100,
      sleep: async () => undefined,
    });
    expect(result).toEqual({ kind: "failed", status: "payment_failed" });
  });

  it("times out while still pending", async () => {
    const result = await pollPaymentSettlement({
      fetchStatus: async () => "pending_payment",
      intervalMs: 5,
      timeoutMs: 12,
      sleep: async () => undefined,
    });
    expect(result.kind).toBe("timeout");
  });
});

/** Statuses that mean the online leg finished (success or failure). */
export const SETTLED_PAYMENT_STATUSES = ["paid", "confirmed", "payment_failed"] as const;

export type SettledPaymentStatus = (typeof SETTLED_PAYMENT_STATUSES)[number];

export function isSettledPaymentStatus(status: string): status is SettledPaymentStatus {
  return (SETTLED_PAYMENT_STATUSES as readonly string[]).includes(status);
}

export function isSuccessfulPaymentStatus(status: string): boolean {
  return status === "paid" || status === "confirmed";
}

export type PaymentPollResult =
  | { kind: "settled"; status: string }
  | { kind: "timeout" }
  | { kind: "failed"; status: "payment_failed" };

/**
 * Poll until the order leaves pending_payment or the deadline elapses.
 * Used after the PSP sheet closes so the UI waits for the webhook.
 */
export async function pollPaymentSettlement(options: {
  fetchStatus: () => Promise<string>;
  intervalMs?: number;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
}): Promise<PaymentPollResult> {
  const intervalMs = options.intervalMs ?? 2000;
  const timeoutMs = options.timeoutMs ?? 30_000;
  const sleep = options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const deadline = Date.now() + timeoutMs;

  while (Date.now() <= deadline) {
    const status = await options.fetchStatus();
    if (status === "payment_failed") {
      return { kind: "failed", status: "payment_failed" };
    }
    if (isSuccessfulPaymentStatus(status)) {
      return { kind: "settled", status };
    }
    if (Date.now() + intervalMs > deadline) break;
    await sleep(intervalMs);
  }

  // One last check before timeout.
  try {
    const status = await options.fetchStatus();
    if (status === "payment_failed") {
      return { kind: "failed", status: "payment_failed" };
    }
    if (isSuccessfulPaymentStatus(status)) {
      return { kind: "settled", status };
    }
  } catch {
    /* ignore — surface timeout */
  }

  return { kind: "timeout" };
}

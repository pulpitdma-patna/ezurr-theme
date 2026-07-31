import { apiFetch } from "@/lib/apiClient";

/**
 * Send an order's game codes to the customer again.
 *
 * "It never arrived" is a call every shop that sells codes takes — a number
 * mistyped at checkout, a message that bounced, an inbox nobody opens — and
 * until now the admin had no answer to it on any screen. Fixing it meant opening
 * the database, which for this owner means it could not be fixed at all.
 *
 * This belongs in the `api` object in lib/apiClient.ts alongside
 * `adminCreateShipment`, and should be moved there. It sits in its own file
 * because that one is owned elsewhere in this pass; it goes through the same
 * `apiFetch`, so it carries the same auth header and raises the same `ApiError`
 * that `adminErrorMessage` already knows how to turn into a sentence.
 */
export type ResendCodesResult = {
  /** How many codes went back out. */
  codes: number;
  /** How many product lines they covered. */
  lines: number;
  /** Where they went. */
  mobile: string;
  at: string;
};

export function resendOrderCodes(publicId: string): Promise<ResendCodesResult> {
  return apiFetch<ResendCodesResult>(
    `/admin/orders/${encodeURIComponent(publicId)}/resend-codes`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

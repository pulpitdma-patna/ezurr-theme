/** Statuses a signed-in customer may cancel before dispatch. */
export const CUSTOMER_CANCELLABLE = [
  "pending_payment",
  "pending",
  "confirmed",
  "preorder",
  "paid",
] as const;

export function canCustomerCancel(status: string): boolean {
  return (CUSTOMER_CANCELLABLE as readonly string[]).includes(status);
}

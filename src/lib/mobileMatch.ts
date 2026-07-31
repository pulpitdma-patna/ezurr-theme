/**
 * Matching an Indian mobile number the way a customer says it.
 *
 * Admin lists compared the typed string against the stored one with a plain
 * `.includes()`. Stored values are bare digits, so "98765 43210" and
 * "+91 98765 43210" — the two ways a customer reads their number aloud, and the
 * way the admin itself displays it — matched nothing. The screen said "No orders
 * match this filter" while the order sat right there.
 *
 * Mirrors App\Support\Mobile on the API side, which normalises the same shapes
 * for coupon identity and the banned-customer check. Kept deliberately separate
 * from `normalizeMobile` in lib/auth.ts: that one takes the FIRST ten digits for
 * a sign-in field, which turns "+919876543210" into "9198765432" — right for
 * capping an input, wrong for matching.
 */

/** Digits only, with an Indian country code or trunk prefix removed. */
export function mobileDigits(value: string): string {
  let digits = value.replace(/\D+/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

/**
 * Whether a search box entry looks like someone typing a phone number, rather
 * than an order id or a city. Four digits is enough to be worth matching on, and
 * the character test keeps "EZ-1234" out of the phone path.
 */
export function looksLikeMobileQuery(query: string): boolean {
  const q = query.trim();
  return mobileDigits(q).length >= 4 && /^[\d\s+()-]+$/.test(q);
}

/**
 * Does this stored number match what was typed? Partial entries match, because
 * searching by the last few digits is how people actually use these boxes.
 */
export function mobileMatches(stored: string, query: string): boolean {
  return mobileDigits(stored).includes(mobileDigits(query));
}

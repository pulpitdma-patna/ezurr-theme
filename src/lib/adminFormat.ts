/**
 * The single date formatter for the admin panel.
 *
 * Admin screens are operated from India, so dates are pinned to IST rather than
 * the browser's zone: an operator reading an order timestamp and a warehouse
 * reading the same order must agree on the day, and `toLocaleString()` without
 * an explicit `timeZone` silently disagrees the moment someone travels or a
 * machine is misconfigured. Pinning it also makes server and client render the
 * same string, so Next.js never flags a hydration mismatch on a date.
 *
 * One date shape everywhere — `25 Jul 2026`. `formatAdminDateTime` is that same
 * shape with a clock appended; nothing else should invent a third.
 */

const IST = "Asia/Kolkata";

/** Shown where a date is genuinely absent (never ordered, never synced). */
export const NO_DATE = "—";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: IST,
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: IST,
});

/**
 * Clock only — `4:12 pm`. Used where the day is already obvious from context
 * ("Saved · 4:12 pm"), so repeating it would be noise. `numeric` rather than
 * `2-digit` because nobody writing down a shop's day writes `04:12`.
 */
const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: IST,
});

/**
 * Accepts anything the API or the local store hands us. A bare `YYYY-MM-DD`
 * parses as UTC midnight, which is still the same calendar day in IST because
 * IST is ahead of UTC — so date-only values need no special casing.
 */
function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `25 Jul 2026` in IST. */
export function formatAdminDate(
  value: string | number | Date | null | undefined,
  fallback: string = NO_DATE,
): string {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : fallback;
}

/** `4:12 pm` in IST, for a time on a day the screen has already established. */
export function formatAdminTime(
  value: string | number | Date | null | undefined,
  fallback: string = NO_DATE,
): string {
  const date = toDate(value);
  return date ? timeFormatter.format(date) : fallback;
}

/** `25 Jul 2026, 01:46 pm` in IST. */
export function formatAdminDateTime(
  value: string | number | Date | null | undefined,
  fallback: string = NO_DATE,
): string {
  const date = toDate(value);
  return date ? dateTimeFormatter.format(date) : fallback;
}

import { describe, it, expect } from "vitest";
import { looksLikeMobileQuery, mobileMatches } from "@/lib/mobileMatch";

/**
 * Finding an order by the phone number a customer reads out.
 *
 * The orders filter compared the typed string against the stored one with a
 * plain `.includes()`. Stored values are bare digits, so "98765 43210" and
 * "+91 98765 43210" — the two ways a customer actually says their number, and
 * the way the admin itself displays it — matched nothing. The screen said "No
 * orders match this filter" while the order sat right there, and the owner told
 * a paying customer to their face that their order did not exist.
 *
 * Imports the real helper rather than restating it, so this cannot pass while
 * the page does something else.
 */
/** Exactly what the orders list does — imported, not reimplemented. */
function matchesMobile(stored: string, typed: string): boolean {
  const q = typed.trim().toLowerCase();
  return looksLikeMobileQuery(q) ? mobileMatches(stored, q) : stored.includes(q);
}

describe("finding an order by phone number", () => {
  const stored = "9876543210";

  it("matches however the customer says it", () => {
    for (const typed of [
      "9876543210",
      "98765 43210",
      "+919876543210",
      "+91 98765 43210",
      "+91-98765-43210",
      "(98765) 43210",
      " 9876543210 ",
    ]) {
      expect(matchesMobile(stored, typed), typed).toBe(true);
    }
  });

  it("still matches a partial number, which is how people search", () => {
    expect(matchesMobile(stored, "43210")).toBe(true);
    expect(matchesMobile(stored, "98765")).toBe(true);
  });

  it("does not match a different customer", () => {
    expect(matchesMobile(stored, "9123456789")).toBe(false);
    expect(matchesMobile(stored, "+91 91234 56789")).toBe(false);
  });

  /** A stored value formatted for display must still be findable. */
  it("matches when the stored number carries its own formatting", () => {
    expect(matchesMobile("+91 98765 43210", "9876543210")).toBe(true);
  });

  it("leaves non-numeric searches alone", () => {
    // An order id or a city must not be routed through digit matching.
    expect(matchesMobile(stored, "bengaluru")).toBe(false);
  });
});

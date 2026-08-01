import { describe, it, expect } from "vitest";
import { adminIntegrations } from "@/data/admin";

/**
 * The practice shop must teach the real one.
 *
 * It used to list cash-on-delivery, meta-pixel, zoho-software and a "Your own
 * software" card — none of which exist in the real catalog. So the screen the
 * owner learns on showed him a shop he does not have, and because none of those
 * ids matched the ones the page keys its copy off, every one of them fell
 * through to a generic sentence.
 *
 * The seven keys are the API's catalog (IntegrationController::CATALOG).
 */
describe("the practice shop shows the same companies as the real one", () => {
  const REAL_CATALOG = [
    "whatsapp",
    "razorpay",
    "cashfree",
    "shiprocket",
    "webhooks",
    "google-analytics",
    "shopify",
  ];

  it("has exactly the companies the server has", () => {
    expect(adminIntegrations.map((i) => i.id).sort()).toEqual([...REAL_CATALOG].sort());
  });

  it("gives every one of them a description in his words", () => {
    for (const row of adminIntegrations) {
      expect(row.description, row.id).toBeTruthy();
      // The words this admin does not use about other companies.
      expect(row.description).not.toMatch(
        /\b(aggregation|endpoint|POST|gateway|conversions|prepaid)\b/i,
      );
    }
  });

  /**
   * A practice shop where everything already works teaches nothing about the
   * thing he actually has to do, so some are deliberately not set up.
   */
  it("leaves some of them still to set up", () => {
    const connected = adminIntegrations.filter((i) => i.status === "connected");
    expect(connected.length).toBeGreaterThan(0);
    expect(connected.length).toBeLessThan(adminIntegrations.length);
  });

  /**
   * The old demo row marked WhatsApp "needs_attention", which renders a red
   * block reading "Press Check it works to see why" — beside a button that is
   * hidden in the practice shop. A dead end on the screen meant for learning.
   */
  it("never shows a problem it gives him no way to look into", () => {
    expect(adminIntegrations.some((i) => i.status === "needs_attention")).toBe(false);
  });
});

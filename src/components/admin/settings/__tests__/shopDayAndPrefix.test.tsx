import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ShopDetailsSection } from "@/components/admin/settings/ShopDetailsSection";
import { defaultAdminSettings } from "@/data/admin";

/**
 * Two settings the owner could type into that went nowhere.
 *
 * The time zone was the costly one: the server runs on UTC, so the shop's "day"
 * began at 5:30 in the morning and a sale rung up at 2am counted towards
 * yesterday. It is read now — but it was also on no screen at all, which is why
 * it stayed dead. Same for the order-number prefix: he could set PLP and every
 * order still came out EZ-.
 *
 * currencyLabel is gone rather than wired. Prices are formatted in the Indian
 * lakh/crore grouping, GST is charged on them and both gateways settle in
 * rupees — "USD" beside a rupee amount is a worse lie than no box at all.
 */

function renderSection(overrides: Record<string, unknown> = {}) {
  const patch = vi.fn();
  render(
    <ShopDetailsSection active settings={{ ...defaultAdminSettings, ...overrides }} patch={patch} />,
  );
  return { patch };
}

describe("the shop's day and its order numbers are his to set", () => {
  afterEach(cleanup);

  it("offers a place for the shop, defaulting to India", () => {
    renderSection();
    const select = screen.getByLabelText(/Where your shop is/i) as HTMLSelectElement;
    expect(select.value).toBe("Asia/Kolkata");
  });

  it("says what the time zone is actually for", () => {
    renderSection();
    expect(screen.getByText(/today's takings mean today/i)).toBeTruthy();
  });

  it("saves the zone he picks", () => {
    const { patch } = renderSection();
    fireEvent.change(screen.getByLabelText(/Where your shop is/i), {
      target: { value: "Asia/Dubai" },
    });
    expect(patch).toHaveBeenCalledWith({ timezone: "Asia/Dubai" });
  });

  it("takes an order-number prefix and keeps it safe to put in a URL", () => {
    const { patch } = renderSection();
    fireEvent.change(screen.getByLabelText(/order numbers start with/i), {
      target: { value: "plp/2026" },
    });
    expect(patch).toHaveBeenCalledWith({ orderIdPrefix: "PLP2026" });
  });

  /** He must not think his existing orders are about to be renumbered. */
  it("says the orders he already has keep their number", () => {
    renderSection();
    expect(screen.getByText(/keep the number they were given/i)).toBeTruthy();
  });

  it("no longer offers a currency box the shop cannot honour", () => {
    renderSection();
    expect(screen.queryByLabelText(/currency/i)).toBeNull();
  });
});

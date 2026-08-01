import { describe, it, expect } from "vitest";
import { ADMIN_SETTING_KEYS } from "@/hooks/useAdminSettingsSync";
import { defaultAdminSettings } from "@/data/admin";

/**
 * The GST settings have to be able to leave the browser.
 *
 * `ADMIN_SETTING_KEYS` is load-bearing in both directions: Settings filters its
 * outgoing payload through it, and the background sync copies the server's
 * values in through it. A key missing from this array is a control that shows
 * "Saved · 4:12 pm" over a value the server never received, and shows the old
 * value again on the next reload. Nothing errors, so nothing catches it.
 *
 * That is exactly what happened to `taxInclusive`: accepted by the API, typed in
 * AdminSettings, defaulted — and absent from here, so the single biggest GST
 * decision a shop makes had no working control anywhere in the admin.
 *
 * Asserted as a list rather than by rendering the toggle, because a render test
 * would pass while the save was being dropped.
 */
describe("GST settings can actually be saved", () => {
  const GST_KEYS = ["taxInclusive", "taxRatePct", "taxExempt"] as const;

  it.each(GST_KEYS)("%s is in the list the save payload is filtered through", (key) => {
    expect(ADMIN_SETTING_KEYS).toContain(key);
  });

  it.each(GST_KEYS)("%s has a default, so the control is never uncontrolled", (key) => {
    expect(defaultAdminSettings[key]).toBeDefined();
  });

  /** Every shop starts where Indian retail law puts it: the shelf price is payable. */
  it("starts inclusive, at 18%, and not exempt", () => {
    expect(defaultAdminSettings.taxInclusive).toBe(true);
    expect(defaultAdminSettings.taxRatePct).toBe(18);
    expect(defaultAdminSettings.taxExempt).toBe(false);
  });

  /**
   * Guards the whole class of bug rather than these three keys: every key the
   * admin declares a default for should be syncable, or it is another control
   * that cannot save. The three known-dead ones are named so this fails loudly
   * if someone adds a fourth.
   */
  it("no settings key is left unsyncable by accident", () => {
    const declared = Object.keys(defaultAdminSettings);
    const missing = declared.filter((key) => !ADMIN_SETTING_KEYS.includes(key as never));
    expect(missing.sort()).toEqual([]);
  });
});

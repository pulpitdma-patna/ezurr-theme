import { describe, it, expect } from "vitest";
import {
  clampMoney,
  clampPercent,
  digitsOnly,
  looksLikeEmail,
  normalizeGstin,
  normalizePan,
  resolveInitialTab,
  startOverList,
  startOverSentence,
} from "@/components/admin/settings/settingsValues";
import { SETTINGS_TABS } from "@/components/admin/settings/SettingsNav";

const realShopTabs = SETTINGS_TABS.filter((tab) => tab.id !== "danger");

describe("resolveInitialTab", () => {
  it("honours ?tab=tax — the link the bill screen sends him here with", () => {
    expect(resolveInitialTab("tax", null, SETTINGS_TABS)).toBe("tax");
  });

  it("honours #appearance, which the website builder links to", () => {
    expect(resolveInitialTab(null, "#appearance", SETTINGS_TABS)).toBe("appearance");
  });

  it("prefers the query tab when a link carries both", () => {
    expect(resolveInitialTab("checkout", "#appearance", SETTINGS_TABS)).toBe("checkout");
  });

  it("opens the first tab for a bookmark of a tab that no longer exists", () => {
    // ?tab=team and ?tab=shipping are real old bookmarks; they used to open an
    // empty panel with no way of telling something had moved.
    expect(resolveInitialTab("team", null, SETTINGS_TABS)).toBe("store");
    expect(resolveInitialTab(null, "#shipping", SETTINGS_TABS)).toBe("store");
  });

  it("never opens Start over on a real shop, where the tab is not built", () => {
    expect(resolveInitialTab("danger", null, realShopTabs)).toBe("store");
  });
});

describe("what a typed value is turned into", () => {
  it("keeps a phone number to ten digits however it was pasted", () => {
    expect(digitsOnly("+91 98765 00000", 10)).toBe("9198765000");
    expect(digitsOnly("9876500000", 10)).toBe("9876500000");
  });

  it("makes a pasted GST number match the registration certificate", () => {
    expect(normalizeGstin(" 29aabce1234f1z5 ")).toBe("29AABCE1234F1Z5");
    expect(normalizeGstin("29AABCE1234F1Z5EXTRA")).toHaveLength(15);
  });

  it("makes a PAN ten capitals", () => {
    expect(normalizePan(" aabce1234f ")).toBe("AABCE1234F");
  });

  it("never lets a rupee box go negative or blank into NaN", () => {
    expect(clampMoney("-500")).toBe(0);
    expect(clampMoney("")).toBe(0);
    expect(clampMoney("2999")).toBe(2999);
  });

  it("holds the online discount inside what the server will accept", () => {
    // The server rejects anything over 50, and a rejected save is a red line in
    // the header for a number he cannot see is out of range.
    expect(clampPercent("80")).toBe(50);
    expect(clampPercent("-5")).toBe(0);
    expect(clampPercent("12")).toBe(12);
  });

  it("only warns about an email that cannot be one", () => {
    expect(looksLikeEmail("hello@ezurr.com")).toBe(true);
    expect(looksLikeEmail("hello@ezurr")).toBe(false);
  });
});

describe("what Start over says it destroys", () => {
  const contents = { products: 24, orders: 8, customers: 5, coupons: 2, checkoutRules: 1 };

  it("counts what is actually in this browser", () => {
    expect(startOverList(contents)).toEqual([
      "24 products",
      "8 orders",
      "5 customers",
      "2 discount codes",
      "1 checkout exception",
      "the home page and custom code in Website",
      "every setting on this screen",
    ]);
  });

  it("names the website builder's home page, which the old wording never did", () => {
    // resetAdminStore() rebuilds cmsPages and cmsGlobalCode along with
    // everything else. The old copy listed "products, orders, customers and
    // settings", so an evening's work in the builder went without warning.
    expect(startOverSentence(contents)).toContain("the home page and custom code in Website");
  });

  it("leaves out what is not there rather than promising to delete nothing", () => {
    const empty = { products: 0, orders: 0, customers: 0, coupons: 0, checkoutRules: 0 };
    expect(startOverList(empty)).toEqual([
      "the home page and custom code in Website",
      "every setting on this screen",
    ]);
  });

  it("says plainly that the real shop is untouched", () => {
    expect(startOverSentence(contents)).toContain("no customer is affected and no money moves");
  });
});

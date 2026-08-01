import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * A pre-order screen must not promise ₹0 and then charge the full price.
 *
 * Every pre-order surface said "₹0 today", "Due today ₹0", "Charged only when
 * your order ships" and "Nothing charged until then" — while the payment sheet
 * opened for the whole amount on the very next tap. There is no
 * authorize-then-capture anywhere in this codebase: a prepaid pre-order with no
 * reservation set is charged in full at checkout, exactly like any other prepaid
 * order. The copy was written from an admin hint that said "0 means free to
 * book", which was never true.
 *
 * Read as source rather than rendered: these are hardcoded strings across five
 * files, and what matters is that none of them can come back.
 */

/**
 * Source with its comments stripped. Several of these files now explain in a
 * comment exactly which sentence was removed and why, and a test that matched
 * those would fail on the very note that records the fix.
 */
function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const CHECKOUT = "src/app/checkout/CheckoutFlow.tsx";
const PRODUCT = "src/components/product/ProductView.tsx";

describe("no screen promises a pre-order costs nothing today", () => {
  it("does not hardcode ₹0 on the pre-order button", () => {
    expect(read(PRODUCT)).not.toContain("₹0 today");
  });

  it("does not say the customer is charged only on shipping", () => {
    expect(read(PRODUCT)).not.toContain("Charged only when your order ships");
    expect(read(CHECKOUT)).not.toContain("Nothing charged until then");
    expect(read(CHECKOUT)).not.toContain("Nothing charged until release");
  });

  it("does not claim an authorization that this shop cannot perform", () => {
    // There is no authorize-then-capture path — Razorpay is charged outright.
    expect(read(CHECKOUT)).not.toContain("We authorize now and charge");
    expect(read(CHECKOUT)).not.toContain("Authorize now ·");
  });

  /** The bug was one token: a prepaid pre-order fell through to a literal 0. */
  it("bills a prepaid pre-order for the full amount when no advance is set", () => {
    const src = read(CHECKOUT);
    expect(src).toContain("? (isPrepaid ? effTotalNum : 0)");
  });

  /** The admin hint the wrong copy was written from. */
  it("no longer tells the owner that zero means free to book", () => {
    expect(read("src/components/admin/ProductForm.tsx")).not.toContain(
      "<strong>0 means free to book.</strong>",
    );
  });
});

describe("a clock only ever counts to the title it sits beside", () => {
  it("passes the product's own date into the countdown on the product page", () => {
    expect(read(PRODUCT)).toContain("<CountdownInline releaseAt={initialProduct?.releaseAt} />");
  });

  it("shows no countdown at checkout when the product has no date of its own", () => {
    expect(read(CHECKOUT)).toContain("isPreorder && releaseAt ?");
  });

  /** The account screens carry no per-product date, so they carry no clock. */
  it("keeps the shop-wide clock off the account screens", () => {
    expect(read("src/app/account/orders/page.tsx")).not.toContain("CountdownInline");
    expect(read("src/app/account/orders/[id]/page.tsx")).not.toContain("CountdownInline");
  });
});

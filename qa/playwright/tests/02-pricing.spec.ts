import { test, expect } from "@playwright/test";
import { seedCart, API, SKU, SKU_PRICE, COUPON } from "./helpers";

/**
 * The pricing-presentation cluster: BUG-03 through BUG-06.
 * These are the highest-value regression guards in the suite — every one of
 * them is a figure a customer reads before deciding to pay.
 */

const money = (s: string) => Number(s.replace(/[^\d.-]/g, ""));

test("BUG-03 — PDP tax caption matches what checkout charges @regression", async ({ page, request }) => {
  await page.goto(`/products/${SKU}`);
  const pdp = await page.locator("body").innerText();

  const quote = await request.post(`${API}/api/checkout/quote`, {
    data: { items: [{ productKey: SKU, qty: 1 }], paymentMethod: "cod" },
  });
  const q = await quote.json();

  if (/inclusive of all taxes/i.test(pdp)) {
    expect(
      q.tax,
      `PDP claims tax-inclusive pricing but the quote adds ₹${q.tax} GST on top`,
    ).toBe(0);
  } else {
    // If the store is tax-exclusive, the PDP must say so rather than the opposite.
    expect(pdp).not.toMatch(/inclusive of all taxes/i);
  }
});

test("BUG-04 — order summary lines sum to the displayed total @regression", async ({ page }) => {
  await seedCart(page);
  await page.goto("/checkout");

  const summary = page.locator("aside, [class*='summary']").first();
  const text = await summary.innerText();

  const subtotal = money(text.match(/Subtotal\s*₹([\d,]+)/i)?.[1] ?? "0");
  const gst = money(text.match(/GST[^₹]*₹([\d,]+)/i)?.[1] ?? "0");
  const discount = money(text.match(/(?:Discount|Coupon|Prepaid)[^₹]*−?₹([\d,]+)/i)?.[1] ?? "0");
  const total = money(text.match(/(?:Total|On delivery)\s*₹([\d,]+)/i)?.[1] ?? "0");

  expect(
    subtotal - discount + gst,
    `summary does not reconcile: ${subtotal} − ${discount} + ${gst} ≠ ${total}`,
  ).toBe(total);
});

test("BUG-05 — an applied coupon is labelled as a coupon @regression", async ({ page }) => {
  await seedCart(page);
  await page.goto("/checkout");

  await page.getByPlaceholder(/enter code/i).fill(COUPON);
  await page.getByRole("button", { name: /^apply$/i }).click();
  await expect(page.getByText(new RegExp(`${COUPON} applied`, "i"))).toBeVisible();

  const summary = await page.locator("aside, [class*='summary']").first().innerText();

  // The coupon's value must not be attributed to the prepaid line.
  const prepaidLine = summary.match(/Prepaid \(10%\)[^\d]*([\d,]+)/i);
  if (prepaidLine) {
    const shown = money(prepaidLine[1]);
    const truePrepaid = Math.floor(SKU_PRICE * 0.1);
    expect(
      shown,
      `"Prepaid (10%)" shows ₹${shown}, which is the coupon discount, not 10% of ₹${SKU_PRICE}`,
    ).toBe(truePrepaid);
  }
  expect(summary, "no coupon line rendered in the summary").toMatch(new RegExp(COUPON, "i"));
});

test("BUG-06 — payment tiles quote the real amount payable @regression", async ({ page }) => {
  await seedCart(page);
  await page.goto("/checkout");

  await page.getByPlaceholder(/enter code/i).fill(COUPON);
  await page.getByRole("button", { name: /^apply$/i }).click();

  // Advance to the payment step (fill the minimum required address fields).
  await page.getByPlaceholder(/flat, street and area/i).fill("QA Test Flat 101, MG Road");
  await page.getByPlaceholder("400001").fill("560001");
  await page.getByPlaceholder("Mumbai").fill("Bengaluru");
  await page.getByRole("button", { name: /continue to payment/i }).click();

  const summaryText = await page.locator("aside, [class*='summary']").first().innerText();
  const total = money(summaryText.match(/(?:Total|On delivery)\s*₹([\d,]+)/i)?.[1] ?? "0");

  const codTile = page.getByText(/pay ₹[\d,]+ at door/i);
  if (await codTile.count()) {
    const quoted = money((await codTile.first().innerText()).match(/₹([\d,]+)/)![1]);
    expect(quoted, `COD tile quotes ₹${quoted} but the total due is ₹${total}`).toBe(total);
  }
});

test("BUG-20 — quote rejects quantities above available stock @regression", async ({ request }) => {
  const res = await request.post(`${API}/api/checkout/quote`, {
    data: { items: [{ productKey: SKU, qty: 999999 }], paymentMethod: "prepaid" },
  });
  expect(
    res.status(),
    "quote returned 200 for a quantity far above stock — the shopper only finds out at submit",
  ).not.toBe(200);
});

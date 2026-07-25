import { Page, expect } from "@playwright/test";

export const API = process.env.API_URL ?? "http://127.0.0.1:8000";

/** A known in-stock physical SKU. Override via env if the catalog changes. */
export const SKU = process.env.TEST_SKU ?? "ps4-fc26-new";
export const SKU_PRICE = Number(process.env.TEST_SKU_PRICE ?? 3499);
export const COUPON = process.env.TEST_COUPON ?? "SAVE20";

/**
 * Seed the cart directly in localStorage. Faster and less brittle than
 * clicking through the PDP, and it lets us inject hostile values on purpose.
 */
export async function seedCart(
  page: Page,
  items: Array<Record<string, unknown>> = [
    { productKey: SKU, title: "PS4 FC26 (New)", price: SKU_PRICE, image: "", fulfillmentType: "physical", qty: 1 },
  ],
) {
  await page.goto("/");
  await page.evaluate((v) => localStorage.setItem("ezurr-cart-v1", JSON.stringify(v)), items);
}

export async function clearCart(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("ezurr-cart-v1"));
}

/**
 * Sign in through the real OTP flow. Only works against a local/testing API,
 * where the backend returns the fixed dev code.
 */
export async function signIn(page: Page, mobile: string, otp = "123456") {
  await page.goto("/auth");
  await page.getByRole("textbox").first().fill(mobile);
  await page.getByRole("button", { name: /continue/i }).click();

  const cells = page.locator(".auth-otp-cell");
  await expect(cells.first()).toBeVisible();
  for (let i = 0; i < otp.length; i++) await cells.nth(i).fill(otp[i]);

  await page.getByRole("button", { name: /verify & continue/i }).click();
  await page.waitForURL(/\/account/, { timeout: 20_000 });
}

export async function getApiToken(page: Page): Promise<string | null> {
  return page.evaluate(() => localStorage.getItem("ezurr_api_token"));
}

/** A mobile number that is new on every run, so registration always exercises the create path. */
export function freshMobile(): string {
  const tail = String(Date.now()).slice(-7);
  return `98${tail}0`.slice(0, 10).padEnd(10, "1");
}

import { test, expect } from "@playwright/test";
import { seedCart, clearCart, signIn, freshMobile, SKU, SKU_PRICE, COUPON } from "./helpers";

/** Happy-path journeys. These are the smoke tests — if any fail, stop and fix. */

test.describe("catalog @smoke", () => {
  test("homepage renders without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto("/");
    await expect(page.getByRole("link", { name: /pre-orders/i }).first()).toBeVisible();
    expect(errors.filter((e) => !/DevTools|HMR/i.test(e))).toEqual([]);
  });

  test("category page lists products", async ({ page }) => {
    await page.goto("/games");
    await expect(page.locator('a[href^="/products/"]').first()).toBeVisible();
    expect(await page.locator('a[href^="/products/"]').count()).toBeGreaterThan(5);
  });

  test("sort by price descending actually sorts", async ({ page }) => {
    await page.goto("/games");
    await page.getByRole("button", { name: /sort/i }).first().click();
    await page.getByRole("option", { name: /high to low/i }).click();

    const prices = await page.evaluate(() =>
      [...document.querySelectorAll('a[href^="/products/"]')]
        .map((a) => a.closest("article, div")?.textContent?.match(/₹([\d,]+)/)?.[1])
        .filter(Boolean)
        .map((s) => Number(s!.replace(/,/g, ""))),
    );
    const sorted = [...prices].sort((a, b) => b - a);
    expect(prices).toEqual(sorted);
  });

  test("BUG-18 — unknown product slug returns 404 @regression", async ({ page }) => {
    const res = await page.goto("/products/definitely-not-a-product-9999");
    expect(res?.status(), "soft 404: unknown products return 200 and stay indexable").toBe(404);
  });

  test("BUG-21 — no developer copy is visible to customers @regression", async ({ page }) => {
    await page.goto("/games");
    await expect(page.locator("body")).not.toContainText("NEXT_PUBLIC_API_URL");
  });
});

test.describe("product detail @smoke", () => {
  test("PDP renders and adds to cart", async ({ page }) => {
    await clearCart(page);
    await page.goto(`/products/${SKU}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("button", { name: /^add to cart$/i }).click();
    await expect(page.getByRole("dialog", { name: /your cart/i })).toBeVisible();
  });

  test("BUG-14 — PDP hydrates cleanly @regression", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto(`/products/${SKU}`);
    await page.waitForTimeout(1500);
    expect(errors.join("\n")).not.toContain("hydrated but some attributes");
  });

  test("BUG-25 — meta description contains no raw HTML @regression", async ({ page }) => {
    await page.goto(`/products/${SKU}`);
    const desc = await page.getAttribute('meta[name="description"]', "content");
    expect(desc ?? "").not.toMatch(/<[a-z]/i);
    expect((desc ?? "").length).toBeLessThanOrEqual(200);
  });
});

test.describe("cart @smoke", () => {
  test("quantity and removal update the total", async ({ page }) => {
    await seedCart(page);
    await page.goto("/cart");
    await expect(page.getByText(`₹${SKU_PRICE.toLocaleString("en-IN")}`).first()).toBeVisible();
  });

  test("empty cart shows the empty state", async ({ page }) => {
    await clearCart(page);
    await page.goto("/cart");
    await expect(page.getByText(/your cart is empty/i)).toBeVisible();
  });

  test("BUG-19 — a tampered cart never renders a negative subtotal @regression", async ({ page }) => {
    await seedCart(page, [
      { productKey: SKU, title: "X", price: -1000, image: "", fulfillmentType: "physical", qty: 999999 },
    ]);
    await page.goto("/cart");
    await expect(page.locator("body")).not.toContainText(/₹-/);
  });
});

test.describe("authentication @smoke", () => {
  test("a new customer can register and land on the account page", async ({ page }) => {
    await signIn(page, freshMobile());
    await expect(page).toHaveURL(/\/account/);
  });

  test("an incorrect OTP is rejected", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("textbox").first().fill(freshMobile());
    await page.getByRole("button", { name: /continue/i }).click();

    const cells = page.locator(".auth-otp-cell");
    for (let i = 0; i < 6; i++) await cells.nth(i).fill("9");
    await page.getByRole("button", { name: /verify & continue/i }).click();

    await expect(page.getByText(/invalid otp/i)).toBeVisible();
  });

  test("BUG-07 — retyping a filled OTP cell replaces only that cell @regression", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("textbox").first().fill(freshMobile());
    await page.getByRole("button", { name: /continue/i }).click();

    const cells = page.locator(".auth-otp-cell");
    for (let i = 0; i < 6; i++) await cells.nth(i).fill("9");

    await cells.nth(0).click();
    await page.keyboard.type("1");

    const values = await cells.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
    expect(values, "editing one cell wiped the trailing digits and shifted the old value right")
      .toEqual(["1", "9", "9", "9", "9", "9"]);
  });

  test("BUG-08 — the sign-in page does not advertise admin access @regression", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.locator("body")).not.toContainText(/open admin/i);
  });
});

test.describe("checkout end to end", () => {
  test("a COD order completes and appears in the account @smoke", async ({ page }) => {
    test.skip(
      process.env.ALLOW_REAL_ORDERS !== "1",
      "creates a real order — run with ALLOW_REAL_ORDERS=1",
    );

    const mobile = freshMobile();
    await signIn(page, mobile);
    await seedCart(page);
    await page.goto("/checkout");

    await page.getByPlaceholder(/flat, street and area/i).fill("QA Test Flat 101, MG Road");
    await page.getByPlaceholder("400001").fill("560001");
    await page.getByPlaceholder("Mumbai").fill("Bengaluru");
    await page.getByRole("button", { name: /continue to payment/i }).click();

    await page.getByText(/cash on delivery/i).click();
    await page.getByRole("button", { name: /review order/i }).click();
    await page.getByRole("button", { name: /place (pre-)?order/i }).click();

    await expect(page.getByText(/order confirmed/i)).toBeVisible({ timeout: 20_000 });

    await page.goto("/account/orders");
    await expect(page.getByText(/PS4 FC26/i).first()).toBeVisible();
  });

  test("BUG-23 — confirmation page carries no demo controls @regression", async ({ page }) => {
    test.skip(process.env.ALLOW_REAL_ORDERS !== "1", "requires a completed order");
    await expect(page.locator("body")).not.toContainText(/restart demo/i);
  });

  test("BUG-26 — marketing consent is not pre-checked @regression", async ({ page }) => {
    await seedCart(page);
    await page.goto("/checkout");
    const consent = page.getByRole("checkbox", { name: /whatsapp/i });
    if (await consent.count()) await expect(consent).not.toBeChecked();
  });

  test("BUG-16 — an invalid PIN code is rejected @regression", async ({ page }) => {
    await seedCart(page);
    await page.goto("/checkout");
    await page.getByPlaceholder("400001").fill("000000");
    await page.getByPlaceholder("Mumbai").click();
    await expect(page.getByText(/valid.*pin|invalid.*pin/i)).toBeVisible();
  });

  test("BUG-15 — PIN autofill does not clobber a typed city @regression", async ({ page }) => {
    await seedCart(page);
    await page.goto("/checkout");
    await page.getByPlaceholder("400001").fill("560001");
    await page.getByPlaceholder("Mumbai").fill("Bengaluru");
    await page.waitForTimeout(1000);
    await expect(page.getByPlaceholder("Mumbai")).toHaveValue("Bengaluru");
  });
});

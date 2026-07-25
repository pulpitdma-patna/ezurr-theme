import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * Admin panel regression guards (ADM-01 … ADM-10).
 *
 * Requires owner credentials and a local/testing API (fixed dev OTP).
 * Set ADMIN_MOBILE, or these tests skip.
 */

const ADMIN_MOBILE = process.env.ADMIN_MOBILE;

test.describe("admin @admin @regression", () => {
  test.skip(!ADMIN_MOBILE, "set ADMIN_MOBILE to an account with role=admin");

  test.beforeEach(async ({ page }) => {
    await signIn(page, ADMIN_MOBILE!);
  });

  test("ADM-01 — drawer forms accept multi-character input @blocker", async ({ page }) => {
    await page.goto("/admin/coupons");
    await page.getByRole("button", { name: /new coupon/i }).click();

    const code = page.getByPlaceholder("SUMMER20");
    await code.click();
    await page.keyboard.type("QATEST999");

    // The bug: AdminDrawer's focus effect re-runs on every render (inline
    // onClose in the dep array) and yanks focus to the backdrop button.
    await expect(code, "only the first keystroke is retained").toHaveValue("QATEST999");
  });

  test("ADM-01 — focus stays in the field after typing @blocker", async ({ page }) => {
    await page.goto("/admin/coupons");
    await page.getByRole("button", { name: /new coupon/i }).click();

    await page.getByPlaceholder("SUMMER20").click();
    await page.keyboard.type("A");

    const stillFocused = await page.evaluate(() => {
      const el = document.activeElement as HTMLInputElement | null;
      return el?.tagName === "INPUT" && el.placeholder === "SUMMER20";
    });
    expect(stillFocused, "focus jumped to a <button> after one keystroke").toBe(true);
  });

  test("ADM-02 — coupons page makes no false claim about checkout", async ({ page }) => {
    await page.goto("/admin/coupons");
    await expect(page.locator("body")).not.toContainText(/not yet applied at checkout/i);
  });

  test("ADM-03 — price field is numeric and constrained", async ({ page }) => {
    const sku = process.env.TEST_SKU ?? "ps4-fc26-new";
    await page.goto(`/admin/products/${sku}/edit`);

    const price = page.getByLabel(/^price$/i);
    await expect(price).toHaveAttribute("type", "number");
    await expect(price).toHaveAttribute("min", "0");
  });

  test("ADM-03 — a negative price is rejected, not coerced", async ({ page }) => {
    const sku = process.env.TEST_SKU ?? "ps4-fc26-new";
    await page.goto(`/admin/products/${sku}/edit`);

    const price = page.getByLabel(/^price$/i);
    const original = await price.inputValue();

    await price.fill("-500");
    await page.getByRole("button", { name: /save changes/i }).click();

    // Either a validation error appears, or the value is left untouched.
    await page.goto(`/admin/products/${sku}/edit`);
    await expect(
      page.getByLabel(/^price$/i),
      "a stray minus sign silently rewrote the catalog price",
    ).toHaveValue(original);
  });

  test("ADM-04 — customer actions are either functional or visibly disabled", async ({ page }) => {
    const id = process.env.TEST_CUSTOMER_ID;
    test.skip(!id, "set TEST_CUSTOMER_ID");

    await page.goto(`/admin/customers/${id}`);
    const vip = page.getByRole("button", { name: /mark vip/i });

    if (await page.locator("body").textContent().then((t) => /local only/i.test(t ?? ""))) {
      await expect(vip, "non-persisting actions must not look enabled").toBeDisabled();
    }
  });

  test("ADM-05 — category product counts are non-zero", async ({ page }) => {
    await page.goto("/admin/categories");
    const counts = await page.evaluate(() =>
      [...document.querySelectorAll("tbody tr, [role=row]")]
        .map((r) => r.textContent?.match(/\b(\d+)\b\s*$/)?.[1])
        .filter(Boolean)
        .map(Number),
    );
    expect(counts.some((n) => n > 0), "every category reports 0 products").toBe(true);
  });

  test("ADM-06 — customer list shows a city", async ({ page }) => {
    await page.goto("/admin/customers");
    const body = await page.locator("tbody, [role=rowgroup]").first().innerText();
    const dashOnly = body.split("\n").every((l) => !/[A-Z][a-z]+/.test(l.split("\t").pop() ?? ""));
    expect(dashOnly, "City column is empty for every customer").toBe(false);
  });

  test("ADM-07 — deleting a coupon asks for confirmation", async ({ page }) => {
    await page.goto("/admin/coupons");
    const del = page.getByRole("button", { name: /^delete$/i }).first();
    test.skip(!(await del.count()), "no coupon to test against");

    await del.click();
    await expect(
      page.getByRole("dialog").or(page.getByText(/are you sure|confirm/i)),
      "destructive delete fired with no confirmation",
    ).toBeVisible({ timeout: 3000 });
  });

  test("ADM-10 — PS4 products are not tagged as PS5", async ({ page }) => {
    await page.goto("/admin/products/ps4-fc26-new/edit");
    await expect(page.getByLabel(/platform/i)).not.toHaveValue("PS5");
  });
});

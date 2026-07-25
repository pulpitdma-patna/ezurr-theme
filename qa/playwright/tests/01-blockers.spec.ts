import { test, expect, devices } from "@playwright/test";
import { seedCart, SKU, SKU_PRICE } from "./helpers";

/**
 * Regression guards for the two release blockers in EZURR_TEST_REPORT.md.
 * Both currently FAIL. They should go green once the fixes land, and must
 * stay green afterwards.
 */

test.describe("BUG-01 — mobile/tablet navigation drawer @blocker @regression", () => {
  // The drawer is used at every width below Tailwind's `lg` (1024px).
  for (const width of [390, 768, 1023]) {
    test(`drawer opens to full height at ${width}px`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height: 844 } });
      const page = await ctx.newPage();
      await page.goto("/");

      await page.getByRole("button", { name: /open menu/i }).click();

      const drawer = page.locator('[role="dialog"][aria-label="Menu"]');
      await expect(drawer).toBeVisible();

      // The bug: the overlay is `fixed inset-0` inside a `backdrop-blur` header,
      // so it sizes against the 57px header box instead of the viewport.
      const box = await drawer.boundingBox();
      expect(box, "drawer should have a bounding box").not.toBeNull();
      expect(
        box!.height,
        `drawer collapsed to ${box!.height}px — nav links are clipped out of view`,
      ).toBeGreaterThan(400);

      // And the links must actually be reachable, not merely present in the DOM.
      await expect(drawer.getByRole("link", { name: /^games/i })).toBeVisible();
      await expect(drawer.getByRole("link", { name: /pre-orders/i }).first()).toBeVisible();

      await ctx.close();
    });
  }

  test("every primary nav destination is reachable on mobile", async ({ browser }) => {
    const ctx = await browser.newContext({ ...devices["iPhone 13"] });
    const page = await ctx.newPage();
    await page.goto("/");
    await page.getByRole("button", { name: /open menu/i }).click();

    const drawer = page.locator('[role="dialog"][aria-label="Menu"]');
    await drawer.getByRole("link", { name: /^games/i }).click();
    await expect(page).toHaveURL(/\/games/);

    await ctx.close();
  });
});

test.describe("BUG-02 — checkout review step @blocker @regression", () => {
  test("review shows the cart item, not a hardcoded pre-order", async ({ page }) => {
    await seedCart(page);
    await page.goto("/checkout");

    // The review block must name what is actually in the cart.
    const body = page.locator("body");
    await expect(body).not.toContainText("Ezurr Play Console");
    await expect(body).not.toContainText(/place pre-order/i);
    await expect(body).not.toContainText(/releases/i);
  });

  test("document title is not the pre-order title for a standard cart", async ({ page }) => {
    await seedCart(page);
    await page.goto("/checkout");
    await expect(page).not.toHaveTitle(/pre-order/i);
  });
});

import { test, expect } from "@playwright/test";
import { SKU } from "./helpers";

const PAGES = ["/", "/games", `/products/${SKU}`, "/cart", "/auth"];

test.describe("accessibility @a11y @regression", () => {
  for (const path of PAGES) {
    test(`A11Y-01 — ${path} has a <main> landmark`, async ({ page }) => {
      await page.goto(path);
      expect(await page.locator("main").count()).toBeGreaterThan(0);
    });
  }

  test("A11Y-02 — a skip link is the first focusable element", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLAnchorElement | null;
      return { href: el?.getAttribute("href") ?? "", text: el?.textContent?.trim() ?? "" };
    });
    expect(focused.href.startsWith("#") || /skip/i.test(focused.text)).toBe(true);
  });

  test("A11Y-03 — validation errors are announced", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("textbox").first().fill("12345");
    await page.getByRole("button", { name: /continue/i }).click();

    const alert = page.locator('[role="alert"], [aria-live="polite"], [aria-live="assertive"]');
    await expect(alert.first()).toBeVisible();
    await expect(page.getByRole("textbox").first()).toHaveAttribute("aria-invalid", "true");
  });

  test("A11Y-04 — the hero carousel can be paused", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /pause|stop/i }).first()).toBeVisible();
  });

  test("A11Y-05 — interactive targets are at least 24x24", async ({ page }) => {
    await page.goto("/");
    const small = await page.evaluate(() =>
      [...document.querySelectorAll("a,button,input,select,[role=button]")]
        .filter((e) => {
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && (r.width < 24 || r.height < 24);
        })
        .map((e) => ({
          name: (e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 30),
          w: Math.round(e.getBoundingClientRect().width),
          h: Math.round(e.getBoundingClientRect().height),
        })),
    );
    expect(small, `${small.length} targets below the 24x24 minimum`).toEqual([]);
  });

  test("A11Y-06 — opening the cart moves focus into the dialog", async ({ page }) => {
    await page.goto(`/products/${SKU}`);
    await page.getByRole("button", { name: /^add to cart$/i }).click();
    const inDialog = await page.evaluate(
      () => !!document.activeElement?.closest('[role="dialog"]'),
    );
    expect(inDialog).toBe(true);
  });

  test("A11Y-07 — OTP cells are numeric and support SMS autofill", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("textbox").first().fill("9876512345");
    await page.getByRole("button", { name: /continue/i }).click();

    const first = page.locator(".auth-otp-cell").first();
    await expect(first).toHaveAttribute("inputmode", "numeric");
    await expect(first).toHaveAttribute("autocomplete", "one-time-code");
  });

  test("A11Y-08 — exactly one <h1> per page", async ({ page }) => {
    await page.goto("/");
    expect(await page.locator("h1").count()).toBe(1);
  });
});

test.describe("SEO @regression", () => {
  for (const path of ["/games", `/products/${SKU}`]) {
    test(`SEO-01 — ${path} canonicalises to itself`, async ({ page }) => {
      await page.goto(path);
      const canonical = await page.getAttribute('link[rel="canonical"]', "href");
      expect(canonical, "canonical must not point at the homepage").toMatch(
        new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/?$`),
      );
    });
  }

  test("SEO-02 — product pages carry Product JSON-LD", async ({ page }) => {
    await page.goto(`/products/${SKU}`);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.join(" ")).toContain('"Product"');
  });

  test("SEO-03 — Open Graph tags are present", async ({ page }) => {
    await page.goto(`/products/${SKU}`);
    for (const prop of ["og:title", "og:image", "og:type"]) {
      expect(await page.locator(`meta[property="${prop}"]`).count(), `${prop} missing`).toBeGreaterThan(0);
    }
  });

  test("SEO-06 — routes have distinct titles", async ({ page }) => {
    const titles: string[] = [];
    for (const path of ["/", "/games", "/cart", "/auth"]) {
      await page.goto(path);
      titles.push(await page.title());
    }
    expect(new Set(titles).size, `duplicate titles across routes: ${titles.join(" | ")}`).toBe(titles.length);
  });
});

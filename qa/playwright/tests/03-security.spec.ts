import { test, expect } from "@playwright/test";
import { API, SKU, SKU_PRICE, COUPON, signIn, getApiToken, freshMobile, seedCart } from "./helpers";

/**
 * Security regression guards. Most of these currently PASS — they exist to
 * make sure the controls stay in place, which is exactly what a regression
 * suite is for. The FAILing ones are marked.
 */

test.describe("authorization @security @regression", () => {
  const ADMIN_ENDPOINTS = [
    "/api/admin/orders",
    "/api/admin/customers",
    "/api/admin/settings",
    "/api/admin/team",
    "/api/admin/export",
  ];

  for (const path of ADMIN_ENDPOINTS) {
    test(`${path} rejects unauthenticated requests`, async ({ request }) => {
      const res = await request.get(`${API}${path}`, { headers: { Accept: "application/json" } });
      expect(res.status()).toBe(401);
    });

    test(`${path} rejects a forged bearer token`, async ({ request }) => {
      const res = await request.get(`${API}${path}`, {
        headers: { Accept: "application/json", Authorization: "Bearer 1|fakefakefakefake" },
      });
      expect(res.status()).toBe(401);
    });
  }

  test("a customer token is forbidden from every admin endpoint", async ({ page, request }) => {
    await signIn(page, freshMobile());
    const token = await getApiToken(page);
    expect(token).toBeTruthy();

    for (const path of ADMIN_ENDPOINTS) {
      const res = await request.get(`${API}${path}`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      expect(res.status(), `${path} should be 403 for a customer`).toBe(403);
    }
  });

  test("tampering with the localStorage role does not grant admin", async ({ page }) => {
    await signIn(page, freshMobile());
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("ezurr_auth_session")!);
      s.role = "admin";
      localStorage.setItem("ezurr_auth_session", JSON.stringify(s));
    });

    await page.goto("/admin/orders");
    // ApiAuthBoot re-derives the role from GET /auth/me and bounces the user.
    await expect(page).toHaveURL(/\/auth/);
  });

  test("mass assignment cannot escalate a customer to admin", async ({ page, request }) => {
    await signIn(page, freshMobile());
    const token = await getApiToken(page);

    await request.put(`${API}/api/account/profile`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      data: { name: "QA", role: "admin", staff_role: "owner" },
    });

    const me = await (
      await request.get(`${API}/api/auth/me`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      })
    ).json();
    expect(me.role).toBe("customer");
    expect(me.staffRole).toBeFalsy();
  });
});

test.describe("price and input integrity @security @regression", () => {
  test("client-supplied prices are ignored by the server", async ({ request }) => {
    const res = await request.post(`${API}/api/checkout/quote`, {
      data: {
        items: [{ productKey: SKU, qty: 2, unit_price: 1, price: 1 }],
        paymentMethod: "cod",
      },
    });
    const q = await res.json();
    expect(q.subtotal, "server must recompute the subtotal from its own catalog price").toBe(SKU_PRICE * 2);
  });

  for (const [label, qty] of [["zero", 0], ["negative", -3]] as const) {
    test(`${label} quantity is rejected`, async ({ request }) => {
      const res = await request.post(`${API}/api/checkout/quote`, {
        data: { items: [{ productKey: SKU, qty }], paymentMethod: "cod" },
      });
      expect(res.status()).toBe(422);
    });
  }

  test("an empty items array is rejected", async ({ request }) => {
    const res = await request.post(`${API}/api/checkout/quote`, {
      data: { items: [], paymentMethod: "cod" },
    });
    expect(res.status()).toBe(422);
  });

  test("a SQL-injection payload in a coupon code is treated as a literal", async ({ request }) => {
    const res = await request.post(`${API}/api/checkout/coupon`, {
      data: { code: "' OR 1=1--", subtotal: 3499 },
    });
    const j = await res.json();
    expect(j.valid).toBe(false);
  });

  test("BUG-05 — the coupon endpoint should derive the subtotal itself", async ({ request }) => {
    const res = await request.post(`${API}/api/checkout/coupon`, {
      data: { code: COUPON, subtotal: 9_999_999 },
    });
    const j = await res.json();
    expect(
      j.discount,
      "endpoint trusts a client subtotal and returns an arbitrary discount for display",
    ).toBeLessThan(100_000);
  });
});

test.describe("data isolation @security @regression", () => {
  test("a customer cannot read another customer's order", async ({ page, request }) => {
    const other = process.env.OTHER_ORDER_ID;
    test.skip(!other, "set OTHER_ORDER_ID to a public order id owned by a different user");

    await signIn(page, freshMobile());
    const token = await getApiToken(page);

    const res = await request.get(`${API}/api/account/orders/${other}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
  });

  test("public tracking gives no enumeration oracle", async ({ request }) => {
    const wrongMobile = await request.post(`${API}/api/track`, {
      data: { public_id: "EZ-AAAAAAAA", mobile: "9999999999" },
    });
    const nonexistent = await request.post(`${API}/api/track`, {
      data: { public_id: "EZ-ZZZZZZZZ", mobile: "9999999999" },
    });
    expect(wrongMobile.status()).toBe(nonexistent.status());
    expect(await wrongMobile.text()).toBe(await nonexistent.text());
  });

  test("API errors leak no stack traces or server paths", async ({ request }) => {
    const res = await request.get(`${API}/api/account/orders/EZ-NOPE0000`, {
      headers: { Accept: "application/json", Authorization: "Bearer 1|invalid" },
    });
    const body = await res.text();
    expect(body, "response leaks an exception class").not.toContain("exception");
    expect(body, "response leaks absolute server paths").not.toMatch(/\/(Users|home|var)\//);
  });
});

test.describe("XSS @security @regression", () => {
  test("a hostile cart item title does not execute", async ({ page }) => {
    await seedCart(page, [
      {
        productKey: SKU,
        title: '<img src=x onerror="window.__XSS=1">SAFE',
        price: SKU_PRICE,
        image: "",
        fulfillmentType: "physical",
        qty: 1,
      },
    ]);
    await page.goto("/cart");
    expect(await page.evaluate(() => (window as any).__XSS)).toBeFalsy();
  });

  test("BUG-24 — server-rendered CMS HTML is sanitized identically to the client", async ({ page }) => {
    const slug = process.env.CMS_TEST_SLUG;
    test.skip(!slug, "set CMS_TEST_SLUG to a CMS page containing the <img/onerror=...> probe");

    const msgs: string[] = [];
    page.on("console", (m) => msgs.push(m.text()));
    await page.goto(`/pages/${slug}`);

    expect(
      msgs.join("\n"),
      "hydration mismatch means the SSR and client sanitizers disagree",
    ).not.toContain("hydrated but some attributes");
  });
});

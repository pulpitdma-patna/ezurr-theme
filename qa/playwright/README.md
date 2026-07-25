# Ezurr QA — automated regression suite

Playwright suite covering the defects in `EZURR_TEST_REPORT.md`. It is written to **fail on the current build** — each failing test is a defect guard that should turn green as the fix lands and stay green afterwards. The `@smoke` tests should pass today.

## Setup

Run this from your own machine, not from a remote sandbox — the suite talks to `localhost:3000` and `127.0.0.1:8000`.

```bash
cd ezurr-qa
npm install
npx playwright install chromium
```

Both services must be running:

```bash
cd ezurr-api   && php artisan serve          # http://127.0.0.1:8000
cd ezurr-theme && npm run dev                # http://localhost:3000
```

## Running

```bash
npm test                    # everything
npm run test:smoke          # happy paths only — should pass on the current build
npm run test:blocker        # the two release blockers
npm run test:regression     # every defect guard
npm run test:security       # authz, price integrity, IDOR, XSS
npm run test:a11y           # WCAG checks
npm run test:ui             # interactive runner
npm run report              # open the last HTML report
```

Target a single project:

```bash
npx playwright test --project=mobile
npx playwright test --project=desktop
```

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `STORE_URL` | `http://localhost:3000` | Storefront origin |
| `API_URL` | `http://127.0.0.1:8000` | Laravel API origin |
| `TEST_SKU` | `ps4-fc26-new` | In-stock physical SKU used throughout |
| `TEST_SKU_PRICE` | `3499` | That SKU's catalog price |
| `TEST_COUPON` | `SAVE20` | Active coupon for the pricing tests |
| `ALLOW_REAL_ORDERS` | unset | Set to `1` to run the full end-to-end order test |
| `OTHER_ORDER_ID` | unset | A public order ID owned by a different user, for the IDOR test |
| `CMS_TEST_SLUG` | unset | A CMS page seeded with the `<img/onerror=…>` probe |
| `ADMIN_MOBILE` | unset | An account with `role=admin`; required for the admin suite |
| `TEST_CUSTOMER_ID` | unset | A customer id for the customer-actions test |

```bash
ALLOW_REAL_ORDERS=1 OTHER_ORDER_ID=EZ-JBXYRQ2M npm test
```

## Important notes

**The OTP flow requires a local/testing API.** `signIn()` uses the fixed dev code `123456`, which the backend only returns when `APP_ENV` is `local` or `testing`. Against staging or production these tests will fail — that is correct behaviour, and `AuthRolesTest.php` in the API repo already asserts the bypass is rejected in production.

**The end-to-end order test creates real records.** It is skipped unless `ALLOW_REAL_ORDERS=1`. Each run adds a user, an order, decrements stock, and increments the coupon's `used_count`. Reset the SQLite database between full runs if you care about clean data.

**Tests run serially** (`workers: 1`, `fullyParallel: false`). They mutate shared cart, session, and stock state, so parallelism would make them flaky rather than fast.

**True phone viewports.** BUG-01 was found at 485px and 900px because Chrome on macOS enforces a minimum window width. The Playwright suite emulates 390px and 768px properly, so it exercises the real mobile case that manual testing could not reach.

## File map

| File | Covers |
|---|---|
| `tests/helpers.ts` | Cart seeding, OTP sign-in, token access, fresh mobile numbers |
| `tests/01-blockers.spec.ts` | BUG-01 mobile navigation, BUG-02 checkout review |
| `tests/02-pricing.spec.ts` | BUG-03 to BUG-06 pricing presentation, BUG-20 stock at quote |
| `tests/03-security.spec.ts` | Authorization, price tampering, IDOR, XSS, error leakage |
| `tests/04-journeys.spec.ts` | Catalog, PDP, cart, auth, checkout end to end |
| `tests/05-a11y-seo.spec.ts` | WCAG 2.1/2.2 AA checks and metadata |
| `tests/06-admin.spec.ts` | ADM-01 drawer focus-steal, price validation, customer actions, category counts |

## Suggested CI gate

```yaml
- run: npm run test:smoke      # must pass — blocks the merge
- run: npm run test:security   # must pass — blocks the merge
- run: npm run test:regression # informational until the fixes land, then required
```

## Recommended addition

Install `@axe-core/playwright` for full automated WCAG coverage — the checks here are targeted at the specific findings, not exhaustive:

```bash
npm i -D @axe-core/playwright
```

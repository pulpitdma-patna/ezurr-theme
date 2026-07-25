# Ezurr Play HQ — QA Test Report

**Build under test** Next.js 16.2.10 storefront (`http://localhost:3000`) + Laravel 12 API (`http://127.0.0.1:8000`)
**Repos** `ezurr-theme` (frontend), `ezurr-api` (backend)
**Test date** 25 July 2026
**Method** Grey-box. Live browser execution against the running dev build (Chrome, real user journeys), direct API probing, and source review of both repositories. Every defect below was reproduced; nothing is inferred from code reading alone unless explicitly marked *code-only*.
**Test account created** `9876512345` (customer, id 11) · **Live order placed** `EZ-5RDAOHZY` (₹3,304, COD, confirmed)
**Admin credentials supplied by client** `9661663666` (owner) — admin panel covered in §11

---

## 1. Executive summary

The **backend is in good shape**. Server-side authorization, price integrity, order ownership and webhook signing are all correctly implemented and were verified by attack, not assumption. Attempts to tamper with prices, escalate a customer to admin, and read another customer's order all failed cleanly. That is a genuinely strong foundation and unusual to find at this stage.

The **frontend is where the risk sits**, and it concentrates in two places: the mobile experience and the money-facing copy at checkout.

Two defects are release blockers. First, the navigation drawer is structurally broken on every viewport below 1024px — phones and tablets cannot reach any category page. For an Indian D2C store where the large majority of traffic is mobile, this alone makes the site unshippable. Second, the checkout review step — the last screen a customer sees before committing — displays the wrong product name, a pre-order release date, and a "Place pre-order — ₹0 today" button for an ordinary cash-on-delivery order. The order is recorded correctly in the database, so this is a display defect, but it is a display defect on the confirmation screen, which is the worst possible place for one.

Below those sit a cluster of pricing-presentation defects that share a single root cause: the storefront advertises prices as tax-inclusive while the store is configured tax-exclusive. Product pages say "Inclusive of all taxes"; checkout adds 18% GST and states "Prices exclude GST unless noted." On the payment step the order summary silently drops the discount line entirely, so the arithmetic shown to the customer does not add up (₹3,499 + ₹504 ≠ ₹3,304), and the cash-on-delivery tile quotes ₹3,499 at the door when the real amount due is ₹3,304. In India this is not merely a UX problem — displaying a price other than the all-inclusive amount payable is a Legal Metrology and Consumer Protection Act exposure, and it is the single most likely source of chargebacks and delivery refusals.

The security picture is better than the code alone suggests. A prior automated review flagged the client-side admin role claim as an escalation path; live testing disproved it. Tampering with the `role` field in localStorage does not grant admin access, because `ApiAuthBoot` re-derives the session from `GET /api/auth/me` on every page load and the API returns 403 for every admin endpoint under a customer token. The real security findings are narrower and mostly latent: digital codes are delivered before payment is captured, stock is never restored when an order fails, and the OTP attempt counter can be reset by requesting a new code.

**Recommendation: do not release.** Fix the two blockers and the four pricing defects, then re-test. Estimated remediation for release-blocking items is 2–3 developer days; the mobile drawer fix is a two-line change.

### Defect counts

| Severity | Count | Meaning |
|---|---|---|
| Blocker | 3 | Prevents core use of the product |
| High | 14 | Revenue, legal, or trust impact; fix before launch |
| Medium | 22 | Fix in the first post-launch sprint |
| Low | 14 | Backlog |
| **Total** | **53** | |

Ten of these (ADM-01 to ADM-10, §11) come from the admin panel pass, which was run after the client supplied owner credentials.

### Coverage

| Area | Coverage | Result |
|---|---|---|
| Functional — catalog, PDP, cart | Full | Pass with defects |
| Functional — auth (OTP register/login) | Full | Pass with defects |
| Functional — checkout end-to-end incl. order placement | Full | Pass with defects |
| Functional — account, orders, tracking | Full | Pass |
| Security — authn/authz, IDOR, price & coupon tampering, injection | Full | **Pass** |
| Security — source review both repos | Full | Findings below |
| Responsive — 485px / 900px / 1440px | Partial¹ | **Fail** |
| Accessibility — WCAG 2.1/2.2 AA, automated + manual | Partial² | Fail |
| SEO / metadata | Full | Fail |
| Performance | Indicative³ | Not assessed |
| Admin panel — orders, products, coupons, customers, categories | Full | **Fail** — see §11 |
| Admin panel — CMS, automations, integrations, team, reports, media | Partial⁴ | See §11 |

¹ Chrome on macOS enforces a ~485px minimum window width, so a true 360–390px phone viewport could not be rendered. The blocker found at 485px and 900px is structural and applies to all widths < 1024px.
² Colour-contrast ratios were not measured programmatically; screen-reader testing with NVDA/VoiceOver was not performed.
³ The build runs in `next dev` with Turbopack and HMR. Timing numbers from a dev build are meaningless. Performance must be re-tested against `next build && next start`.
⁴ ADM-01 blocks data entry in every drawer-based admin form, so these areas cannot be meaningfully exercised until it is fixed.

---

## 2. Blockers

### BUG-01 · Mobile and tablet navigation is completely unreachable
**Severity** Blocker · **Area** Frontend / responsive · **Repro rate** 10/10

On every viewport below 1024px the navigation drawer opens as a 56px-tall white strip showing only "MENU" and a close icon. All ten navigation links exist in the DOM but are clipped out of view. There is no other route to Games, Accessories, Consoles, Game Cards, Pre-orders, or Price guarantee — the desktop nav bar is hidden at these widths. Mobile visitors can reach the homepage and nothing else.

Measured at two viewports:

| Viewport | Overlay computed height | Drawer height | Links in DOM | Links visible |
|---|---|---|---|---|
| 485 × 844 | 56px | 352 × 56 | 10 | 0 |
| 900 × 723 | 72px | 352 × 72 | 10 | 0 |

**Root cause — confirmed by computed-style inspection.** The overlay is `fixed inset-0 z-[65] bg-black/30 lg:hidden`, and the drawer inside it is `h-full`. `inset-0` should resolve against the viewport, but the overlay is a DOM descendant of:

```html
<header class="sticky top-0 z-50 border-b border-black/[0.06] bg-white/82 backdrop-blur-[24px]">
```

`backdrop-filter: blur(24px)` establishes a containing block for `position: fixed` descendants. The overlay therefore sizes against the header's own 57px box instead of the viewport, and `h-full` on the drawer resolves to 56px. Verified: the drawer's `scrollHeight` is 93px against a `clientHeight` of 56px, and no ancestor other than the header has a `transform`, `filter`, `perspective`, `contain`, or `will-change`.

**Fix (either):**
1. Render the drawer through `createPortal(drawer, document.body)` so it is not a descendant of the blurred header — preferred, and correct for a modal regardless.
2. Move `backdrop-blur-[24px]` off the `<header>` onto an inner wrapper that does not contain the overlay.

**Regression test** `tests/mobile-nav.spec.ts` in the accompanying suite asserts the drawer's bounding height exceeds 400px at 390px, 768px and 1023px width.

---

### BUG-02 · Checkout review step shows the wrong product and a pre-order CTA
**Severity** Blocker · **Area** Frontend / checkout · **Repro rate** 5/5

Cart contained one unit of *PS4 FC26 (New)*, an in-stock physical game, paying cash on delivery. The Review & confirm step rendered:

| Field | Displayed | Correct value |
|---|---|---|
| ITEM | **Ezurr Play Console** | PS4 FC26 (New) |
| RELEASES | **1 Sept 2026** | n/a — item is in stock |
| LOCKED | ₹3,304 | ₹3,304 ✓ |
| CTA | **"Place pre-order — ₹0 today"** | "Place order — ₹3,304 on delivery" |

The document title on `/checkout` is also `Pre-order checkout · Ezurr`. The generic cart checkout route is rendering the GTA-VI pre-order template with a hardcoded item label and release date.

The backend recorded the order correctly — `order_items` row shows `product_key: ps4-fc26-new`, `unit_price: 3499`, `qty: 1`; stock decremented 7 → 6 — so this is presentation only. That does not reduce the severity: the customer's final confirmation screen names a product they are not buying, and the CTA tells them they are placing a pre-order for ₹0 when they are committing to pay ₹3,304 on delivery. This is a chargeback and refund-dispute generator, and arguably a misrepresentation.

**Fix** Split the pre-order checkout template from the standard cart checkout, or bind the review block to the live cart items rather than a hardcoded pre-order constant.

---

### ADM-01 · Every drawer-based admin form accepts only one character
**Severity** Blocker · **Area** Admin · **Repro rate** 4/4

Creating a coupon is impossible. Typing `QATEST999` into the Code field produces `Q`; typing `500` into % Off produces `5`. Each field accepts exactly the first keystroke and then stops responding.

**Root cause — confirmed by inspecting `document.activeElement` immediately after one keystroke.** After the first character, focus is no longer on the input — it has jumped to a `<button>`. `src/components/admin/AdminDrawer.tsx:28-66`:

```tsx
useEffect(() => {
  if (!open) return;
  ...
  focusables?.[0]?.focus();
  ...
}, [open, onClose]);
```

Every consumer passes an inline arrow — `onClose={() => setDrawerOpen(false)}` (`src/app/admin/coupons/page.tsx:443`) — so `onClose` has a new identity on every render. One keystroke changes form state, React re-renders, `onClose` is a new function, the effect tears down and re-runs, and `focusables[0].focus()` moves focus to the drawer's backdrop close button. Every subsequent keypress lands on that button instead of the field.

**Blast radius — nine components import `AdminDrawer`:** categories, brands, coupons, integrations, message templates, products (quick edit), team, `AutomationBuilder`, and `CheckoutRuleBuilder`. Coupon marketing, catalog taxonomy, staff invitations, automation rules and checkout rules are all un-authorable through the UI.

**Fix** Change the dependency array to `[open]` and read `onClose` from a ref inside the handler. One line. The same anti-pattern exists in `AdminShell.tsx:1120` for the mobile admin drawer and should be fixed alongside it.

---

## 3. High-severity defects

### Pricing and money presentation

These four share one root cause and should be fixed together. The store's settings carry `taxRatePct: 18` and `taxInclusiveMessage: "Prices exclude GST unless noted."` (confirmed in the `policy_snapshot` of order `EZ-5RDAOHZY`), while product pages claim the opposite.

**BUG-03 · Product pages claim "Inclusive of all taxes"; checkout adds 18% GST on top.**
PDP for PS4 FC26 displays `₹3,499` with the caption *"Inclusive of all taxes"*. Checkout for the same single unit: subtotal ₹3,499, GST (18%) ₹567, total ₹3,717 — a 16.2% increase over the advertised price, and the checkout page simultaneously states *"Prices exclude GST unless noted."* Two screens in the same funnel make directly contradictory tax claims. In India, the price displayed to a consumer must be the all-inclusive amount payable; this is a Legal Metrology (Packaged Commodities) Rules and Consumer Protection Act 2019 exposure, not only a UX issue. Either make catalog prices genuinely tax-inclusive and back the GST out for the invoice, or remove the "Inclusive of all taxes" caption and show the GST-inclusive figure on the PDP.

**BUG-04 · Order summary omits the discount line, so the totals do not add up.**
With coupon SAVE20 applied and Cash on delivery selected, the summary reads: Subtotal ₹3,499 · GST (18%) ₹504 · Shipping FREE · On delivery ₹3,304. There is no discount row at all. ₹3,499 + ₹504 = ₹4,003, not ₹3,304 — the ₹699 discount is applied to the total but invisible in the breakdown. A customer cannot reconcile what they are being charged.

**BUG-05 · The coupon discount is displayed under the label "Prepaid (10%)".**
On the Prepaid path the summary shows `Prepaid (10%) −₹699`. ₹699 is the SAVE20 coupon discount (20% of ₹3,499, floored); the actual prepaid discount is ₹349. The backend applies the larger of coupon-or-prepaid and does not stack them, which is correct policy, but the UI attributes the coupon's value to the prepaid line and never renders a coupon line. The customer sees a 10% label against a 20% number.

**BUG-06 · Payment tiles quote amounts the customer will never pay.**
On the payment step: the COD tile reads *"Pay ₹3,499 at door"* and the helper text below repeats *"Pay ₹3,499 in cash or UPI when the courier arrives"* — while the summary panel on the same screen says ₹3,304. The Prepaid tile advertises *"Save 10% · ₹3,149"*, a price that is unobtainable, because selecting Prepaid yields ₹3,304 (the coupon wins and GST is added). Three different figures for one order on one screen. The tile amounts appear to be computed from the raw subtotal, ignoring both GST and any applied coupon.

### Authentication and account

**BUG-07 · Typing into a filled OTP cell corrupts the entered code.**
Reproduced deterministically. With all six cells populated (`999999`), clicking cell 1 and typing `1` yields `["1","9","","","",""]` — the trailing four digits are wiped and the previous value of cell 1 is shifted into cell 2. A customer who mistypes one digit and tries to correct it silently produces a wrong code and cannot tell. Backspace navigation works correctly, so the workaround exists but is undiscoverable. Secondary issue on the same component: after a failed verification, focus is dropped to `<body>` rather than returned to the first cell, so the next keystroke goes nowhere.

**BUG-08 · The public sign-in page advertises the admin backdoor.**
`/auth` displays, to every unauthenticated visitor: *"Demo access: numbers ending in 0000 open Admin."* This is a live instruction on how to attempt privilege escalation. It is currently ineffective against the API-backed build (see §5), but it is a direct invitation to probe, and it makes any future misconfiguration immediately exploitable by anyone who has read the login page.

**BUG-09 · Admin access is fully open in any build without `NEXT_PUBLIC_API_URL`.** *(code-only)*
`src/app/auth/page.tsx:311-314` — when the API URL is unset, `verifyOtp` sleeps 700ms and mints a session without validating the OTP at all. `src/lib/auth.ts:48-51` then assigns `role: "admin"` purely from the phone-number pattern. Any deploy that misses this one non-secret environment variable — a preview branch, a staging box, a Vercel deploy where the var was not copied — grants unauthenticated admin to anyone entering a number ending `0000` and any six digits. The failure is silent. Delete the non-API branch, or throw at module load when the variable is absent in a production build.

### Backend

**BUG-10 · Digital codes are delivered to the buyer before payment is captured.** *(code-only, currently latent)*
`OrderService.php:348` creates prepaid orders as `pending_payment`, but `:491` emits `digital_code_delivered` immediately after commit with no status check, and the recipient resolves to the client-supplied `mobile`. An attacker can POST an unauthenticated prepaid order for N digital units, receive the codes, and never pay. Latent only because no product currently has `fulfillment_type: digital`. Move the emit to the payment-capture path before shipping any digital SKU.

**BUG-11 · Stock and digital codes are never restored on cancellation or payment failure.** *(code-only)*
`OrderService.php:327` is the only stock write in the application; there is no `increment('stock')` anywhere, and `digital_codes.status` is never returned to `available`. Neither `OrderStatusService::transition()`, nor the `payment_failed` webhook path, nor `SweepPendingPayments` restocks. Because `POST /api/checkout/orders` is unauthenticated at `throttle:20,1`, one request with `qty` equal to current stock permanently zeroes a SKU without any payment; twenty requests per minute per IP can empty the catalog. Add a compensating restock on transition into `cancelled` / `payment_failed` / `refunded`, guarded by a `stock_released_at` column for idempotency.

**BUG-12 · Coupon per-customer limits are keyed on a client-supplied mobile number.** *(code-only)*
`OrderService.php:102` takes the identity for `per_customer_limit` and `first_order_only` from `$input['mobile']`, validated only as `['nullable','string']`. Worse, `CouponService.php:54` guards the check with `&& $mobile`, so omitting the field skips the limit entirely. Even for an authenticated buyer, `$user->mobile` is never consulted. Any single-use or first-order coupon is unlimited. Force the authenticated user's mobile server-side, and fail closed when it is absent.

### SEO

**BUG-13 · Every category page canonicalises to the homepage.**
`/games` emits `<link rel="canonical" href="https://ezurr.com/">`. This instructs search engines that the category page is a duplicate of the homepage, which will de-index the entire browsable catalog. Product pages canonicalise correctly, so this is specific to category routes. Highest-ROI SEO fix on the list.

---

## 4. Medium-severity defects

**Frontend / functional**

- **BUG-14 · Hydration mismatch on every product page.** React logs *"A tree hydrated but some attributes of the server rendered HTML didn't match… This won't be patched up"* on the PDP description. The server emits `<p><span data-sheets-root="1">…` and the client emits `<p><span>…`. This is the observable symptom of BUG-24 below: the server and client sanitizers produce different output. It also costs the page its hydration and forces a client re-render.
- **BUG-15 · PIN-code autofill clobbers the City field.** Entering PIN `560001` then typing in City produced `BangaloreBengaluru` — the async autofill writes into the field after the user has begun typing, concatenating rather than replacing. Reproduced on first attempt.
- **BUG-16 · Invalid PIN codes are accepted silently.** `000000` is accepted with no validation message; the state autofill simply fails without feedback. Indian PIN codes cannot begin with 0.
- **BUG-17 · Last name is auto-populated with the customer's phone number.** The default account name `User 9876512345` is split on whitespace into First=`User`, Last=`9876512345`. The order placed in this run carries `"lastName":"9876512345"` in `shipping_address`, which will print on the courier label.
- **BUG-18 · Unknown product URLs return HTTP 200 (soft 404).** `/products/definitely-not-a-product-9999` returns 200 with title `Product · Ezurr`, body "Product not found", and no `noindex`. Should be a real 404 via `notFound()`.
- **BUG-19 · Cart accepts absurd quantities and negative prices.** A tampered cart with `qty: 999999, price: -1000` rendered a subtotal of −₹99,99,99,000 and a cart badge reading "999999" that overflows the header icon. The server correctly rejects these at order time, so there is no financial exposure, but the client should clamp quantity to available stock and never render a negative subtotal. Negative quantities are correctly dropped.
- **BUG-20 · No stock validation at quote time.** `POST /api/checkout/quote` returns HTTP 200 for `qty: 999999` against a product with `stock: 7`. The customer completes address entry and payment selection before discovering the order cannot be fulfilled. Mirror the availability check into `computeQuote`.

**Frontend / content**

- **BUG-21 · Developer copy is visible to customers.** `/games` renders, under the category description: *"When NEXT_PUBLIC_API_URL is set, products load from Laravel."*
- **BUG-22 · Category heading contradicts its contents.** `/games` is titled "PS5 Games" and described as *"Physical discs for PlayStation 5"*, but all 24 listed titles are PS4 SKUs.
- **BUG-23 · "Restart demo" button on the order confirmation screen.** Demo scaffolding on a live post-purchase page.
- **BUG-25 · Product meta descriptions contain raw HTML.** The PDP emits `<meta name="description" content="&lt;p&gt;&lt;span data-sheets-root=&quot;1&quot;&gt;Step onto the pitch…">` — unstripped markup and Google-Sheets paste artifacts. Strip tags and truncate to ~155 characters.
- **BUG-26 · Marketing consent is pre-checked.** *"Send me order updates and offers on WhatsApp"* is checked by default at checkout. Bundling transactional and marketing consent, pre-ticked, is not defensible under the DPDP Act 2023 or TRAI commercial-communication rules. Split the two and default the marketing box to unchecked.

**Security**

- **BUG-24 · The server-side HTML sanitizer is a bypassable regex denylist.** *(code-only)* `src/lib/cms/sanitizeHtml.ts:49-63` runs DOMPurify only in the browser; on the server it falls back to `serverStrip`, a regex chain the file's own docstring describes as previously abandoned for being bypassable. Two verified failures: `<img/onerror=…>` passes untouched because the handler regex requires a leading whitespace character, and the non-recursive `javascript:` replacement *constructs* a working scheme from `jajavascript:vascript:`. The SSR path is live — `/pages/[slug]` renders `PageRenderer` server-side. Production CSP (`strict-dynamic` + nonce, no `unsafe-inline`) currently contains this, but that is a single control, and the dev CSP disables it. Run DOMPurify under jsdom on the server and delete `serverStrip`.
- **BUG-27 · OTP lockout resets on resend.** *(code-only)* `AuthController.php:24` deletes the challenge row on every send, taking the `attempts` counter with it. After five failures an attacker simply requests a new code. There is no per-mobile counter and no backoff; the only ceiling is a per-IP `throttle:20,1`, which a rotating proxy pool defeats. Move the counter to `RateLimiter` keyed on the mobile.
- **BUG-28 · OTP send has no per-mobile cooldown.** *(code-only)* `throttle:10,1` is keyed on the attacker's IP, not the victim's number, so any number can be SMS-bombed at 10 messages/minute/IP with real MSG91 spend. Because each send deletes the in-flight challenge, a sustained flood also locks the victim out of logging in.
- **BUG-29 · Deployment guard checks neither `APP_DEBUG` nor non-production environments.** *(code-only)* `AppServiceProvider.php:50` returns early for anything that is not `local`, and `APP_DEBUG` is never referenced; `DeploymentGuardTest.php:46` explicitly asserts production is a no-op. A staging deploy inherits `APP_DEBUG=true`. This is already observable: 403 responses currently return `"exception":"Symfony\\…\\HttpException"` plus absolute server file paths.
- **BUG-30 · Coupon limit enforcement is a TOCTOU race.** *(code-only)* `computeQuote` validates the coupon outside the transaction (`OrderService.php:288`); the increment happens inside it (`:423`) with no re-check, no row lock, and no unique index on `coupon_redemptions(coupon_id, mobile)`. Concurrent requests all read the same pre-limit `used_count` and all pass. Gate the increment on a conditional atomic UPDATE and abort when it affects zero rows.
- **BUG-31 · API auth token is stored in localStorage.** *(code-only)* `apiClient.ts:7` keeps the Sanctum token where any script in the origin can read it. Given BUG-24, an XSS becomes full account takeover. Prefer an HttpOnly `SameSite=Lax` cookie with Sanctum's SPA cookie mode.
- **BUG-36 · Signing out never revokes the token server-side.** The API exposes `POST /auth/logout` (`routes/api.php:85`), and it correctly calls `currentAccessToken()->delete()` — but a full-text search of the frontend for any logout call returns nothing. `clearSession()` only deletes the two localStorage keys. The Sanctum token therefore stays valid for its full 14-day TTL after the user has "signed out". Anyone holding a copy — from an XSS, a shared or public machine, a browser extension, or a profile backup — retains full account access. One line: call `POST /auth/logout` before clearing local state. Sign-out itself was verified to work correctly on the client side, on both the account sidebar and the active-session screen.

---

## 5. Security testing — what was attacked and what held

This is the strongest part of the build. Each item below was actively attacked in the live environment, not read from source.

| Attack | Method | Result |
|---|---|---|
| **Price tampering** | Sent `unit_price: 1, price: 1` for a ₹3,499 product to `/checkout/quote` | **Blocked.** Server returned subtotal ₹6,998 for qty 2 — client price fields ignored entirely |
| **Privilege escalation via localStorage** | Signed in as a real customer, set `ezurr_auth_session.role = "admin"`, loaded `/admin/orders` | **Blocked.** `ApiAuthBoot` re-derives the session from `GET /api/auth/me` on every load and overwrote the role back to `customer`; redirected to `/auth` |
| **Admin API with a customer token** | `GET /admin/orders`, `/admin/customers`, `/admin/settings`, `/admin/team`, `/admin/export` with a valid customer Bearer token | **Blocked.** 403 Forbidden on all five |
| **Admin API unauthenticated / forged token** | Same endpoints with no token and with `Bearer 1\|fakefake…` | **Blocked.** 401 on all |
| **Mass-assignment escalation** | `PUT /account/profile` with `{role:"admin", staff_role:"owner"}` | **Blocked.** Request succeeded but `role` remained `customer` |
| **IDOR on orders** | Requested three other customers' orders by public ID with a valid customer token | **Blocked.** 403 on all three |
| **Order enumeration via public tracking** | `/api/track` with correct ID + wrong mobile, and with a nonexistent ID | **Blocked.** Identical 404 for both — no oracle |
| **SQL injection** | `' OR 1=1--` as a coupon code | **Blocked.** Returned "Coupon not found" |
| **Stored XSS via cart** | Injected `<img src=x onerror=…>` as a cart item title in localStorage | **Blocked.** React escaped it; payload did not execute |
| **Quantity manipulation** | qty `0`, `-3`, `1.5`, empty items array against `/checkout/quote` | **Blocked.** 422 with field-level validation errors |
| **Coupon subtotal spoofing** | `subtotal: 9999999` against SAVE20 (min ₹2,000) | **Partial.** Validation endpoint returns `valid:true, discount:1999999` — but nothing persists and order creation re-checks `min_order` against the server subtotal. Display-layer only; see BUG-05 |

Additionally verified correct in source: Razorpay and Cashfree webhook HMAC using `hash_equals` with amount reconciliation and replay dedupe; Shopify webhook HMAC over raw bytes; MSG91 and Shiprocket webhooks failing closed on an unconfigured secret; outbound-webhook SSRF guard rejecting private and link-local ranges including `169.254.169.254`, re-checked at egress with redirects disabled; upload validation deriving the extension from finfo content type with a random 40-character filename; no injectable raw SQL anywhere in `app/`; CORS not a wildcard with `supports_credentials: false`; Sanctum tokens expiring at 14 days and rotating on login; `eval()` removed from checkout rules on both sides; the CMS custom-code iframe correctly sandboxed with `allow-scripts` and no `allow-same-origin`.

**One correction to note.** An automated pre-review of this codebase flagged the localStorage `role` claim as a live escalation path. Live testing disproved it — `ApiAuthBoot` makes the server authoritative on every page load. The residual risk is a narrow timing window: `ApiAuthBoot` runs once on mount with an empty dependency array, so if `/auth/me` hangs rather than fails, a tampered role could render the admin shell transiently. Every API call behind it still returns 403, so the exposure is UI reconnaissance, not data. Worth closing by gating `AdminShell` on the resolved `/auth/me` response rather than on the cached session.

---

## 6. Accessibility

Tested against WCAG 2.1 AA and 2.2 AA using DOM and computed-style inspection. Not a substitute for screen-reader testing.

| ID | Finding | Criterion | Severity |
|---|---|---|---|
| A11Y-01 | No `<main>` landmark on any page tested — homepage, category, PDP, cart, checkout all return zero `<main>` elements | 1.3.1 Info and Relationships (A) | Medium |
| A11Y-02 | No skip link; the first focusable element is the logo, so keyboard users traverse the full header on every page | 2.4.1 Bypass Blocks (A) | Medium |
| A11Y-03 | Form validation errors are plain `<p>` elements with no `role="alert"` or `aria-live`, and inputs carry no `aria-invalid` or `aria-describedby` — screen-reader users get no announcement | 3.3.1 Error Identification (A) | Medium |
| A11Y-04 | Hero carousel auto-advances with no pause, stop, or hide control (prev/next and slide dots only) | 2.2.2 Pause, Stop, Hide (A) | Medium |
| A11Y-05 | 24 interactive elements below the 24×24 CSS-px minimum: all footer links at 20px tall, legal links at 16px, cart button 22×22, carousel dots 20px wide | 2.5.8 Target Size Minimum (AA) | Medium |
| A11Y-06 | Opening the cart drawer leaves focus on the "Add to cart" button behind the overlay instead of moving it into the dialog | 2.4.3 Focus Order (A) | Medium |
| A11Y-07 | OTP cells are `type="text"` with no `inputmode="numeric"` and no `autocomplete="one-time-code"` — mobile users get an alphabetic keyboard and iOS SMS autofill does not work | 1.3.5 Identify Input Purpose (AA) | Low |
| A11Y-08 | Homepage renders three `<h1>` elements, one per carousel slide | 1.3.1 (A) | Low |

**Implemented correctly** — filter and sort controls carry proper `aria-label`, `aria-expanded`, `aria-haspopup` and `aria-controls`; product card links and wishlist buttons all have accessible names; the mobile menu is a correct `role="dialog"` with `aria-modal="true"`; Escape closes drawers and restores body scroll; the admin drawer implements a real focus trap; `prefers-reduced-motion` media queries are present; `lang="en"` is set. The accessibility fundamentals are better than the list above suggests — the gaps are specific, not systemic.

---

## 7. SEO and metadata

| ID | Finding | Impact |
|---|---|---|
| SEO-01 | Category pages canonicalise to the homepage (BUG-13) | Critical — de-indexes the catalog |
| SEO-02 | No JSON-LD structured data anywhere; no `Product`, `Offer`, `AggregateRating`, or `BreadcrumbList` | High — no rich results, no Merchant Center eligibility |
| SEO-03 | Zero Open Graph and Twitter Card tags on all pages | High — no preview when shared to WhatsApp, the dominant sharing channel in this market |
| SEO-04 | Product meta descriptions contain raw HTML (BUG-25) | Medium |
| SEO-05 | Soft 404s on unknown products (BUG-18) | Medium |
| SEO-06 | `/auth` and `/cart` inherit the generic homepage `<title>` | Low |
| SEO-07 | Category pages reuse the site-wide meta description verbatim | Low |
| SEO-08 | LCP image not marked `loading="eager"` — Next.js emits this warning on both the category grid and the PDP | Medium (re-test on a production build) |

---

## 8. Not covered, and why

- **True phone viewports.** Chrome on macOS enforces a ~485px minimum window width. Re-test at 360px and 390px once BUG-01 is fixed.
- **Performance.** Dev-build timings are not meaningful. Run Lighthouse and Core Web Vitals against `next build && next start`.
- **Payment gateway.** All testing used cash on delivery. The Razorpay prepaid path, webhook capture, refunds, and partial-deposit flows are untested.
- **Cross-browser.** Chrome only. Safari and Firefox untested — worth prioritising Safari given the iOS share of the Indian market.
- **Colour contrast.** Not measured programmatically. The light-grey secondary text on white (`#424245`-family on `#fff`) should be checked against 4.5:1.
- **Load and concurrency.** The coupon TOCTOU race (BUG-30) and stock-oversell behaviour were identified in source but not proven under concurrent load; proving them requires a k6 or Artillery run that would create many real orders.
- **Automated test suites.** Neither repo's suite could be executed. The frontend's `node_modules` was installed on macOS and cannot run in the Linux analysis VM (missing `@rollup/rollup-linux-arm64-gnu`); the backend requires PHP, which is not present in that VM. Both should be run locally — the backend has 279 feature tests across 47 files, which is substantial coverage worth confirming green. Frontend `tsc --noEmit` is clean; `eslint src` reports 50 errors and 21 warnings, dominated by `react-hooks/set-state-in-effect`.

---

## 9. Recommended fix order

**Before release**
1. ADM-01 — `AdminDrawer` focus-steal (one line, unblocks nine admin forms)
2. BUG-01 — mobile navigation drawer (two-line fix, highest customer impact)
3. BUG-02 — checkout review template
4. BUG-03 / 04 / 05 / 06 — pricing presentation, fixed as one unit
5. ADM-03 — product price validation
6. ADM-04 — customer actions that silently do nothing
7. ADM-02 — remove the false coupon banner
8. BUG-13 — canonical URLs
9. BUG-07 — OTP cell overwrite
10. BUG-08, BUG-09 — remove the demo-admin copy and the no-API auth branch

**First post-launch sprint**
7. BUG-11, BUG-10 — stock restoration and digital-code delivery ordering
8. BUG-12, BUG-30 — coupon identity and atomicity
9. BUG-24 — server-side sanitizer
10. BUG-27, BUG-28 — OTP rate limiting
11. BUG-29 — deployment guard, before anything reaches staging
12. BUG-26 — marketing consent
13. A11Y-01 through A11Y-06
14. SEO-02, SEO-03 — structured data and Open Graph

**Backlog**
15. Remaining Medium and Low items, including ADM-05 to ADM-10
16. Re-test CMS, automations, integrations, team and reports once ADM-01 is fixed
17. Performance baseline against a production build

---

## 10. Sign-off

**Not approved for release.**

Three blockers prevent core use of the product: mobile visitors cannot navigate the store, the checkout review screen misrepresents the order at the point of commitment, and the admin panel cannot accept typed input in any drawer form. Four high-severity pricing defects create legal and trust exposure in the target market, and three more high-severity admin defects mean the operator either cannot make a change or believes they have made one that never happened.

The backend security posture remains the strongest part of this build and the API is ready. The failures are concentrated in the frontend, and encouragingly, the two most damaging ones — ADM-01 and BUG-01 — are each a one-to-two-line fix with disproportionate payoff.

Re-test scope after fixes: full regression of §2, §3 and §11, the responsive suite at 360/390/768/1023px, one complete end-to-end order on both COD and prepaid paths, and a fresh pass over the admin areas that ADM-01 currently blocks.

---

## 11. Admin panel

Tested as the seeded owner (`9661663666`, `role: admin`, `staff_role: owner`). Every claim below was verified by making the change in the UI and then reading the SQLite database directly, so "persists" and "does nothing" are measured, not inferred.

### What works

The parts that are wired up are wired up properly. Marking order `EZ-5RDAOHZY` as packed wrote `status: packed` to the database and appended an audit event recording the acting admin. Editing a product price persisted. Creating and deleting a coupon persisted. The dashboard KPIs are accurate — booked sales of ₹86,558 is the exact sum of all seven orders in the database, and the order count and AOV reconcile. The orders list, customers list and product list all read live API data with correct totals and statuses. Admin authorization holds throughout, as established in §5.

The problem is not that the admin panel is a shell. It is that a handful of specific defects make it unusable or, worse, misleading.

### ADM-02 · The coupons page tells the operator something untrue
**Severity** High

A persistent banner on `/admin/coupons` reads: *"Coupons are saved to the server, but they are not yet applied at checkout (coming in the checkout integration)."*

This is false. Coupons **are** applied at checkout — order `EZ-5RDAOHZY` received a ₹699 SAVE20 discount, a `coupon_redemptions` row was written, and the coupons page itself displays "USES 1/100" for that very coupon on the same screen as the banner. An operator reading this will either not build promotions at all, or will create codes believing them inert and then be surprised when live discounts start applying. Delete the banner.

### ADM-03 · Product price accepts malformed input and saves it silently
**Severity** High

Entering `-500` in the Price field on `/admin/products/[key]/edit` and clicking Save redirected to the product list with no error, no confirmation, and no toast — and wrote `price = 500` to the database. A ₹3,499 product silently became ₹500 on the live storefront because of one stray minus sign.

The Price and Compare-at fields are `type="text"` with no `min`, no `step`, and no `inputmode`, while the Stock field on the same form is correctly `type="number" min="0"`. The minus is stripped by a JS digit filter rather than rejected. Make them `type="number" min="0"`, reject rather than coerce, warn when price exceeds compare-at, and show a confirmation on save. Price is the single most dangerous field in the catalog and currently has the weakest validation on the form.

*(The test price was restored to ₹3,499 before this report was written.)*

### ADM-04 · Customer actions are complete no-ops with no feedback
**Severity** High

Clicking **Mark VIP** on a customer produced no database write (`users.tags` remained `null`, `updated_at` unchanged) and no visible change in the UI — no badge, no toast, no error. The same applies to Mark active, Ban customer, tags, and notes.

The page does carry an honest banner: *"Profile & orders are live from the API. VIP/ban/notes/tags edits are not yet persisted server-side (local only)."* That is better than silence, but the actions are still rendered as fully enabled controls, with **Mark VIP** styled as the primary button and **Ban customer** in destructive red. An operator dealing with a fraudulent buyer will click Ban customer, see nothing contradict them, and move on — while the customer keeps ordering. Either disable the controls with a tooltip until the endpoints exist, or build them: the `users` table already has a `tags` column, so the schema is ready and only the write path is missing.

### ADM-05 · Every category reports zero products
**Severity** Medium

All 33 rows on `/admin/categories` show `0` in the Products column. The database says otherwise: `games` 208, `accessories` 47, `game-cards` 26, `consoles` 17. The count aggregation is broken, so the operator has no visibility into catalog distribution from the one screen designed to show it.

### ADM-06 · Customer list city column is always empty
**Severity** Medium

Every row on `/admin/customers` shows `—` for City, and the customer detail header renders `11 · +91 98765 12345 · —`. All seven orders carry a city in `shipping_address` (Bengaluru, Bangalore, New Delhi, Delhi). The field is simply not being derived from the customer's orders.

### ADM-07 · Coupon deletion has no confirmation
**Severity** Medium

A single click on Delete permanently removed a coupon — no dialog, no undo, no toast. Destructive actions on shared business objects need a confirmation step, particularly one sitting directly beside Edit and Disable in the same button group.

### ADM-10 · PS4 titles are tagged with platform PS5
**Severity** Medium

The product edit form for *PS4 FC26 (New)* shows **Platform: PS5**. This is the root cause of BUG-22 in §4 — the storefront's "PS5 Games" category is populated by PS4 discs because the platform attribute is wrong in the imported data, not because the category page is filtering incorrectly. Fix the data (or the Shopify import mapping) rather than the category page.

### ADM-08 · Inconsistent and unformatted dates
**Severity** Low

Three date formats appear across the admin: `25 Jul 2026` in the orders list, `25/7/2026` in the customer's order history, and a raw `2026-07-25T08:16:36.000000Z` in the customer Lifetime card. The last is an unformatted ISO string in UTC shown to an operator working in IST.

### ADM-09 · Seeded category data is dirty
**Severity** Low

Typos and duplicates are visible in the category list: *"Acessories Nintendo"* (missing a c, and its slug is just `nintendo`), *"Accessories Playstaion"* (transposed), and *"Accessories Logitech"* carrying the slug `accessories-playstaion-copy` — a leftover duplicate. Price-band entries (`<2000` with slug `2000`, `2K-3K` with slug `2999`) are mixed into the same list as product categories. Twenty-nine of the 33 categories have no products at all; only four slugs are actually in use.

### Still not covered

CMS pages and widgets, automations, integrations, team management, reports, media library, digital codes, inventory, checkout rules and preorders were not meaningfully testable, because ADM-01 prevents entering data into their forms. These should be re-tested once that one-line fix lands. Based on the repo's own `ADMIN_AUDIT_2.md`, several are likely to show the same local-write-only pattern as ADM-04, so budget for verification rather than assuming they work.

---

*Test cases and edge cases: `EZURR_TEST_CASES.md`. Automated regression suite: `tests/` — see `README.md` for setup.*

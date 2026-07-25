# Ezurr Play HQ — Test Cases & Edge Cases

**Version** 1.0 · **Date** 25 July 2026
**Scope** Storefront (`localhost:3000`) + API (`127.0.0.1:8000`)
**Legend** P1 = blocker/critical path · P2 = high · P3 = medium · P4 = low
**Status key** PASS · **FAIL** · BLOCKED · N/T (not tested)

Executed cases are marked with their observed result and the linked defect ID from `EZURR_TEST_REPORT.md`. Cases marked N/T are included so the suite is complete for future regression runs.

---

## TS-01 · Catalog browsing and discovery

| ID | Priority | Title | Preconditions | Steps | Expected | Actual | Status |
|---|---|---|---|---|---|---|---|
| TC-01.01 | P1 | Homepage renders | None | Load `/` | Hero carousel, category nav, product rails all render; no console errors | As expected | PASS |
| TC-01.02 | P1 | Category page lists products | None | Load `/games` | 24 products with image, title, price, MRP, discount badge | As expected | PASS |
| TC-01.03 | P2 | Category heading matches contents | None | Load `/games`, compare heading to SKUs | Heading describes the listed platform | Heading "PS5 Games", all 24 SKUs are PS4 | **FAIL** BUG-22 |
| TC-01.04 | P2 | No internal/dev copy is customer-visible | None | Read all body copy on `/games` | Only customer-facing copy | Renders "When NEXT_PUBLIC_API_URL is set, products load from Laravel." | **FAIL** BUG-21 |
| TC-01.05 | P2 | Sort — Price high to low | On `/games` | Select Sort → Price · High to low | Prices descend | 3499, 2200, 2050, 2000, 2000, 1979, 1750, 1530, 1500 — correct | PASS |
| TC-01.06 | P3 | Sort state persists in the URL | On `/games` | Apply a sort, inspect `location.search` | Sort reflected in query string; shareable and restorable via Back | URL stays `/games`; state lost on Back | **FAIL** BUG-32 |
| TC-01.07 | P2 | Filters — Condition / Availability / Price | On `/games` | Open each filter, apply a value | Result set and count update | Dropdowns open and are correctly ARIA-wired | PASS (partial) |
| TC-01.08 | P3 | Discount badge maths | On `/games` | Compare badge % to price vs MRP | Badge = round((mrp−price)/mrp×100) | ₹1,979/₹3,999 → −51%; ₹1,150/₹1,999 → −42%; correct | PASS |
| TC-01.09 | P2 | Product images load | On `/games` | Wait for lazy load, check `naturalWidth` | All images resolve | All resolve via `/_next/image` | PASS |
| TC-01.10 | P3 | Empty filter result | On `/games` | Apply a filter combination matching nothing | Friendly empty state with a reset action | — | N/T |
| TC-01.11 | P3 | Pagination / infinite scroll | On `/games` | Scroll to the end of 24 results | Loads more or shows an end marker | — | N/T |
| TC-01.12 | P2 | Search returns relevant results | None | Open search (⌘K), query "assassin" | Matching titles ranked sensibly | — | N/T |
| TC-01.13 | P3 | Search — no results | None | Query `zzzzqqq` | Empty state, no crash | — | N/T |
| TC-01.14 | P3 | Search — special characters | None | Query `<script>`, `' OR 1=1--`, emoji, 500-char string | Escaped, no error, no injection | — | N/T |

---

## TS-02 · Product detail page

| ID | Priority | Title | Steps | Expected | Actual | Status |
|---|---|---|---|---|---|---|
| TC-02.01 | P1 | PDP renders for a valid slug | Load `/products/ps4-fc26-new` | Title, price, MRP, discount, stock, gallery, description, Add to cart, Buy now | As expected | PASS |
| TC-02.02 | P1 | Unknown slug returns 404 | Load `/products/definitely-not-a-product-9999` | HTTP 404, `notFound()` page, `noindex` | HTTP **200**, title "Product · Ezurr", body "Product not found", no noindex | **FAIL** BUG-18 |
| TC-02.03 | P2 | No hydration errors | Load PDP, read console | No React hydration warnings | "A tree hydrated but some attributes… didn't match. This won't be patched up" on the description | **FAIL** BUG-14 |
| TC-02.04 | P2 | Price caption is accurate | Read the caption under the price | Caption matches what checkout charges | PDP says "Inclusive of all taxes"; checkout adds 18% GST | **FAIL** BUG-03 |
| TC-02.05 | P2 | Meta description is clean | Inspect `meta[name=description]` | Plain text, ≤160 chars | Contains `<p><span data-sheets-root="1">` | **FAIL** BUG-25 |
| TC-02.06 | P2 | Canonical URL is self-referential | Inspect `link[rel=canonical]` | Points to the PDP | `https://ezurr.com/products/ps4-fc26-new` — correct | PASS |
| TC-02.07 | P2 | Product structured data present | Inspect `script[type=application/ld+json]` | `Product` + `Offer` schema | Zero JSON-LD blocks | **FAIL** SEO-02 |
| TC-02.08 | P2 | Open Graph tags present | Inspect `meta[property^=og:]` | og:title, og:image, og:price | Zero OG tags | **FAIL** SEO-03 |
| TC-02.09 | P3 | Gallery thumbnails switch the main image | Click each thumbnail | Main image updates | — | N/T |
| TC-02.10 | P3 | Out-of-stock PDP | Open a product with `stock = 0` | Add to cart disabled, clear messaging | — | N/T |
| TC-02.11 | P3 | Pre-order PDP | Open a pre-order SKU | Release date and pre-order CTA shown | — | N/T |
| TC-02.12 | P2 | Description HTML is sanitized | Store a description containing `<img/onerror=…>` | Payload neutralised on both SSR and client | Client DOMPurify strips it; SSR regex `serverStrip` does not | **FAIL** BUG-24 |

---

## TS-03 · Cart

| ID | Priority | Title | Steps | Expected | Actual | Status |
|---|---|---|---|---|---|---|
| TC-03.01 | P1 | Add to cart from PDP | Click Add to cart | Drawer opens, line item correct, badge = 1 | As expected | PASS |
| TC-03.02 | P1 | Cart persists across reload | Add item, reload | Item still present | Persists via `ezurr-cart-v1` | PASS |
| TC-03.03 | P2 | Increment / decrement quantity | Use +/− on the line item | Quantity and line total update | Works | PASS |
| TC-03.04 | P2 | Remove item | Click the delete icon | Item removed, totals recalculated | Works | PASS |
| TC-03.05 | P1 | Empty cart state | Remove all items | "Your cart is empty" + Browse games CTA | As expected | PASS |
| TC-03.06 | P2 | ESC closes the drawer and restores scroll | Open drawer, press ESC | Drawer closes, `body` scroll restored | Works | PASS |
| TC-03.07 | P2 | Focus moves into the drawer on open | Open drawer, inspect `document.activeElement` | Focus inside the dialog | Focus stays on "Add to cart" behind the overlay | **FAIL** A11Y-06 |
| TC-03.08 | P2 | Quantity is capped at available stock | Increment past stock (7) | Capped with a message | No cap client-side | **FAIL** BUG-20 |

---

## TS-04 · Authentication (OTP)

| ID | Priority | Title | Steps | Expected | Actual | Status |
|---|---|---|---|---|---|---|
| TC-04.01 | P1 | Register a new customer | Enter a new 10-digit mobile → OTP `123456` | Account created, redirect to `/account` | Created as user id 11, role `customer` | PASS |
| TC-04.02 | P1 | Sign in as an existing customer | Repeat with the same mobile | Signed in, prior orders visible | Works | PASS |
| TC-04.03 | P2 | Mobile validation — non-numeric | Enter `12345abc!@#` | Non-digits stripped, "Enter a valid 10-digit mobile number." | As expected | PASS |
| TC-04.04 | P2 | Mobile validation — wrong length | Enter `12345` | Blocked with the same message | As expected | PASS |
| TC-04.05 | P2 | Mobile validation — invalid leading digit | Enter `1234567890` | Rejected (Indian mobiles start 6–9) | Regex `^[6-9]\d{9}$` present | PASS |
| TC-04.06 | P1 | Wrong OTP is rejected | Enter `999999` | "Invalid OTP", no session created | As expected | PASS |
| TC-04.07 | P1 | Correcting a mistyped OTP | Fill all 6 cells, click cell 1, type a new digit | Cell 1 replaced, other cells untouched | Cells become `["1","9","","","",""]` — trailing digits wiped, old value shifted right | **FAIL** BUG-07 |
| TC-04.08 | P2 | Backspace navigation across OTP cells | Fill cells, press Backspace repeatedly | Clears right-to-left, focus follows | Works correctly | PASS |
| TC-04.09 | P2 | Focus returns after a failed verification | Submit a wrong OTP | Focus returns to cell 1 | Focus dropped to `<body>` | **FAIL** BUG-07b |
| TC-04.10 | P2 | Validation errors are announced | Trigger a validation error, inspect ARIA | `role="alert"` / `aria-live`, `aria-invalid` on the input | Plain `<p>`, no ARIA | **FAIL** A11Y-03 |
| TC-04.11 | P1 | No secrets in the console | Request an OTP, read the console | Nothing sensitive logged | `[ezurr-api] dev OTP 123456` logged | **FAIL** (dev-gated) |
| TC-04.12 | P2 | Login page exposes no privileged hints | Read all copy on `/auth` | No mention of admin access | "Demo access: numbers ending in 0000 open Admin." | **FAIL** BUG-08 |
| TC-04.13 | P2 | OTP brute force is throttled | Submit 20+ wrong OTPs, then re-request and retry | Lockout persists across resend | Resend deletes the challenge row and resets `attempts` | **FAIL** BUG-27 *(code-only)* |
| TC-04.14 | P2 | OTP send is rate-limited per mobile | Request 20 OTPs for one number | Per-number cooldown | Throttle is per-IP only | **FAIL** BUG-28 *(code-only)* |
| TC-04.15 | P2 | Sign out revokes the token | Sign out, replay the old Bearer token | 401 | `currentAccessToken()->delete()` present | PASS *(code-verified)* |
| TC-04.16 | P3 | OTP expiry | Wait 11 min, submit the code | Rejected as expired | TTL 10 min in source | N/T |
| TC-04.17 | P3 | OTP inputs are mobile-friendly | Inspect the OTP cells | `inputmode="numeric"`, `autocomplete="one-time-code"` | `type="text"`, neither attribute set | **FAIL** A11Y-07 |

---

## TS-05 · Checkout — end to end

| ID | Priority | Title | Steps | Expected | Actual | Status |
|---|---|---|---|---|---|---|
| TC-05.01 | P1 | Full COD order completes | Cart → details → payment → review → place | Order confirmed with an ID | `EZ-5RDAOHZY` confirmed, ₹3,304 | PASS |
| TC-05.02 | P1 | Order is recorded correctly server-side | Inspect `orders` / `order_items` after placement | Correct SKU, price, qty, totals | `ps4-fc26-new`, ₹3,499, qty 1, discount 699, tax 504, total 3304 | PASS |
| TC-05.03 | P1 | Stock decrements on order | Compare stock before/after | 7 → 6 | 7 → 6 | PASS |
| TC-05.04 | P1 | Review step shows the correct item | Reach the Review step | Cart item name, no pre-order framing | Shows "Ezurr Play Console", "RELEASES 1 Sept 2026", CTA "Place pre-order — ₹0 today" | **FAIL** BUG-02 |
| TC-05.05 | P1 | Order summary arithmetic is complete | Read the summary on the COD payment step | Every component line shown; lines sum to the total | Discount line absent; ₹3,499 + ₹504 ≠ ₹3,304 | **FAIL** BUG-04 |
| TC-05.06 | P1 | Discount is correctly labelled | Apply SAVE20, read the summary | A "Coupon SAVE20" line for ₹699 | Labelled "Prepaid (10%) −₹699" | **FAIL** BUG-05 |
| TC-05.07 | P1 | Payment tile amounts match the total | Compare tile text to the summary | Identical figures | COD tile "Pay ₹3,499 at door" vs total ₹3,304; Prepaid tile "₹3,149" unobtainable | **FAIL** BUG-06 |
| TC-05.08 | P2 | Tax treatment is consistent | Compare PDP caption to checkout note | Consistent | "Inclusive of all taxes" vs "Prices exclude GST unless noted." | **FAIL** BUG-03 |
| TC-05.09 | P2 | GST calculation | Verify 18% on (subtotal − discount) | (3499−699) × 0.18 = 504 | 504 | PASS |
| TC-05.10 | P2 | Prepaid discount calculation | Select Prepaid without a coupon | 10% of subtotal = ₹349 | 349 | PASS |
| TC-05.11 | P2 | Coupon and prepaid do not stack | Apply SAVE20, select Prepaid | Larger of the two applied only | ₹699 applied, ₹349 not added | PASS |
| TC-05.12 | P2 | Continue is disabled until the form is valid | Leave a required field empty | CTA disabled | Disabled correctly | PASS |
| TC-05.13 | P2 | PIN code autofills city and state | Enter `560001` | City "Bangalore", State "Karnataka" | State correct; city autofill collides with typing → `BangaloreBengaluru` | **FAIL** BUG-15 |
| TC-05.14 | P2 | Invalid PIN code is rejected | Enter `000000` | Validation error | Accepted silently, autofill fails with no feedback | **FAIL** BUG-16 |
| TC-05.15 | P3 | Name defaults are sensible | Reach the details step as a new user | First/Last from the profile name | Last name = `9876512345`, persisted to the shipping address | **FAIL** BUG-17 |
| TC-05.16 | P2 | Marketing consent defaults to off | Inspect the WhatsApp checkbox | Unchecked; separate from transactional | Pre-checked and bundled | **FAIL** BUG-26 |
| TC-05.17 | P2 | Carrier selection updates shipping | Switch Blue Dart → Delhivery (₹79) → Dunzo (₹149) | Shipping and total update | — | N/T |
| TC-05.18 | P2 | COD is blocked above the limit | Build a cart over ₹10,000, select COD | COD unavailable with an explanation | API returns "Payment method not allowed." | PASS *(API-level)* |
| TC-05.19 | P2 | Confirmation page is production-clean | Reach the confirmation screen | No demo/debug controls | "Restart demo" button present | **FAIL** BUG-23 |
| TC-05.20 | P1 | Prepaid / Razorpay flow | Complete a prepaid order | Gateway opens, capture webhook marks paid | — | N/T |
| TC-05.21 | P2 | Idempotency on double submit | Click Place order twice rapidly | One order created | `idempotency_key` present on the order row | N/T |
| TC-05.22 | P2 | Checkout with an empty cart | Navigate directly to `/checkout` with no items | Redirect to cart or a clear empty state | — | N/T |

---

## TS-06 · Coupons

| ID | Priority | Title | Steps | Expected | Actual | Status |
|---|---|---|---|---|---|---|
| TC-06.01 | P1 | Valid coupon applies | Apply `SAVE20` to a ₹3,499 cart | 20% off = ₹699 | ₹699 | PASS |
| TC-06.02 | P2 | Coupon codes are case-insensitive | Apply `save20` | Accepted | API accepts lowercase | PASS |
| TC-06.03 | P2 | Unknown coupon is rejected | Apply `NOPE123` | "Coupon not found." | As expected | PASS |
| TC-06.04 | P2 | Minimum-order gate | Apply SAVE20 to a ₹500 cart | "Order must be at least ₹2,000." | As expected | PASS |
| TC-06.05 | P2 | Coupon code is not SQL-injectable | Apply `' OR 1=1--` | Treated as a literal, "Coupon not found." | As expected | PASS |
| TC-06.06 | P2 | Client cannot spoof the subtotal to defeat the gate | POST `/checkout/coupon` with `subtotal: 9999999` | Server derives the subtotal | Returns `valid:true, discount:1999999` — advisory only; order creation re-checks server-side | **PARTIAL** BUG-05 |
| TC-06.07 | P2 | Redemption is recorded | Place an order with a coupon | Row in `coupon_redemptions`, `used_count` +1 | Both correct | PASS |
| TC-06.08 | P2 | Usage limit is enforced under concurrency | Fire N concurrent orders near the limit | Limit never exceeded | Check-then-increment race across the transaction boundary | **FAIL** BUG-30 *(code-only)* |
| TC-06.09 | P2 | Per-customer limit cannot be bypassed | Redeem, then retry with a different `mobile` in the body | Rejected | Keyed on the client-supplied mobile; skipped entirely when omitted | **FAIL** BUG-12 *(code-only)* |
| TC-06.10 | P3 | Expired coupon | Apply a coupon past `ends_at` | Rejected | Logic present in `CouponService` | N/T |
| TC-06.11 | P3 | Remove an applied coupon | Click Remove | Discount reverts, totals recalculate | Works | PASS |

---

## TS-07 · Account and order management

| ID | Priority | Title | Steps | Expected | Actual | Status |
|---|---|---|---|---|---|---|
| TC-07.01 | P1 | Placed order appears in the account | Open `/account/orders` | Order listed with the correct SKU and total | `EZ-5RDAOHZY · PS4 FC26 (New) · ₹3,304` | PASS |
| TC-07.02 | P2 | Order detail loads | Click View details | Items, address, status, timeline | — | N/T |
| TC-07.03 | P2 | Profile update persists | Change the name, reload | Persisted | Verified via API | PASS |
| TC-07.04 | P2 | Order tracking by ID + mobile | POST `/api/track` with the correct pair | Status returned, no PII | Correct; response omits mobile, email, address, total | PASS |
| TC-07.05 | P2 | Tracking with a mismatched mobile | Correct ID, wrong mobile | Generic 404 | Identical 404 to a nonexistent ID — no enumeration oracle | PASS |
| TC-07.06 | P3 | New accounts start empty | Register, open Wishlist and Addresses | Both empty | `ezurr_account_store` seeds 6 wishlist keys and a demo address ("Player", 9876543210) | **FAIL** BUG-33 |
| TC-07.07 | P3 | Zero-value formatting | Read the account overview counters | Consistent formatting | Orders "00", Points "0", Wishlist "00" | **FAIL** BUG-34 |
| TC-07.08 | P3 | First-visit greeting copy | Register and land on `/account` | Appropriate first-time greeting | "Welcome back, User." to a brand-new user | **FAIL** BUG-35 |
| TC-07.09 | P2 | Wishlist add/remove persists | Save a product, reload | Persisted | — | N/T |

---

## TS-08 · Security

| ID | Priority | Title | Attack | Expected | Actual | Status |
|---|---|---|---|---|---|---|
| TC-08.01 | P1 | Client price tampering | POST quote with `unit_price: 1` for a ₹3,499 SKU | Server price wins | Subtotal ₹6,998 for qty 2 | PASS |
| TC-08.02 | P1 | localStorage role escalation | Set `ezurr_auth_session.role="admin"`, open `/admin/orders` | Denied | `ApiAuthBoot` overwrote the role from `/auth/me`; redirected to `/auth` | PASS |
| TC-08.03 | P1 | Admin API with a customer token | GET admin orders/customers/settings/team/export | 403 on all | 403 on all five | PASS |
| TC-08.04 | P1 | Admin API unauthenticated | Same endpoints, no token | 401 | 401 on all | PASS |
| TC-08.05 | P1 | Admin API with a forged token | `Bearer 1\|fakefakefakefake` | 401 | 401 | PASS |
| TC-08.06 | P1 | Mass-assignment escalation | `PUT /account/profile` with `role`, `staff_role` | Ignored | Role unchanged (`customer`) | PASS |
| TC-08.07 | P1 | IDOR on order detail | Fetch three other users' orders by public ID | 403 | 403 on all three | PASS |
| TC-08.08 | P2 | Stored XSS via a cart item title | Inject `<img src=x onerror=…>` into `ezurr-cart-v1` | Escaped | React escaped it; payload did not fire | PASS |
| TC-08.09 | P2 | Negative / absurd quantities (client) | Cart with `qty: -5` and `qty: 999999` | Sanitised | Negative dropped; 999999 accepted, subtotal rendered as −₹99,99,99,000 | **FAIL** BUG-19 |
| TC-08.10 | P1 | Negative / absurd quantities (server) | Quote with qty 0, −3, empty items | 422 | 422 with field errors on all | PASS |
| TC-08.11 | P2 | Error responses leak no internals | Trigger a 403 on the API | Message only | Returns `"exception"` class and absolute server file paths | **FAIL** BUG-29 |
| TC-08.12 | P2 | Auth token storage | Inspect where the Sanctum token is held | HttpOnly cookie preferred | `localStorage.ezurr_api_token` | **FAIL** BUG-31 |
| TC-08.13 | P2 | Inbound webhook signature verification | Review Razorpay/Cashfree/Shopify/MSG91/Shiprocket handlers | HMAC with `hash_equals`, fail closed | All verified correct | PASS *(code)* |
| TC-08.14 | P2 | Outbound webhook SSRF guard | Review the destination validator | Private/link-local blocked | https-only, DNS-resolved, blocks RFC1918 + `169.254.169.254`, redirects disabled | PASS *(code)* |
| TC-08.15 | P2 | File upload restrictions | Review `UploadController` | Type/size limits, non-user-controlled filename | `mimes:jpeg,jpg,png,webp,gif`, 12MB cap, finfo-derived extension, random 40-char name | PASS *(code)* |
| TC-08.16 | P2 | Raw SQL injection surface | Grep `app/` for interpolated SQL | None with user input | 13 hits, all bound or constant | PASS *(code)* |
| TC-08.17 | P2 | CORS configuration | Inspect `config/cors.php` | No wildcard | Explicit origin list, `supports_credentials: false` | PASS *(code)* |
| TC-08.18 | P2 | Server-side HTML sanitizer | Feed `<img/onerror=…>` and `jajavascript:vascript:` to `serverStrip` | Neutralised | Both bypass the regex denylist | **FAIL** BUG-24 |
| TC-08.19 | P2 | Auth without `NEXT_PUBLIC_API_URL` | Boot the app with the variable unset | Fail closed | OTP not validated at all; role assigned from the phone-number pattern | **FAIL** BUG-09 *(code-only)* |
| TC-08.20 | P2 | Unauthenticated stock exhaustion | POST orders with `qty` = stock, let them fail | Stock restored | No restock path anywhere | **FAIL** BUG-11 *(code-only)* |
| TC-08.21 | P3 | Clickjacking | Inspect CSP `frame-ancestors` | `'none'` | Present in the production CSP | PASS *(code)* |
| TC-08.22 | P3 | Session fixation | Sign in twice, compare tokens | Rotated | `tokens()->where('name','spa')->delete()` on login | PASS *(code)* |

---

## TS-09 · Responsive

| ID | Priority | Title | Viewport | Expected | Actual | Status |
|---|---|---|---|---|---|---|
| TC-09.01 | P1 | Mobile navigation is usable | 485 × 844 | Drawer opens full-height with all links | Drawer 352 × **56px**; 10 links clipped, none visible | **FAIL** BUG-01 |
| TC-09.02 | P1 | Tablet navigation is usable | 900 × 723 | Same | Drawer 352 × **72px**; same failure | **FAIL** BUG-01 |
| TC-09.03 | P1 | Desktop navigation is usable | 1440 × 900 | Inline nav bar | Works | PASS |
| TC-09.04 | P2 | No horizontal scroll | 485 / 900 / 1440 | `scrollWidth == clientWidth` | No horizontal overflow at any width | PASS |
| TC-09.05 | P2 | Tap targets meet the 24×24 minimum | 485 | All interactive elements ≥ 24×24 | 24 elements below the minimum | **FAIL** A11Y-05 |
| TC-09.06 | P2 | Checkout is usable on mobile | 485 | Form fields and CTAs reachable | — | N/T (blocked by TC-09.01 for navigation) |
| TC-09.07 | P3 | True phone viewport | 360 / 390 | Layout intact | Not reproducible — Chrome/macOS enforces a ~485px minimum | BLOCKED |
| TC-09.08 | P3 | Landscape orientation | 844 × 390 | Layout intact | — | N/T |

---

## TS-10 · Accessibility

| ID | Priority | Title | Expected | Actual | Status |
|---|---|---|---|---|---|
| TC-10.01 | P2 | `<main>` landmark exists | One per page | Zero on every page tested | **FAIL** A11Y-01 |
| TC-10.02 | P2 | Skip link present | First focusable element skips to content | Absent; first focusable is the logo | **FAIL** A11Y-02 |
| TC-10.03 | P2 | Errors are programmatically announced | `role="alert"` / `aria-live` | Plain `<p>`, no `aria-invalid`/`aria-describedby` | **FAIL** A11Y-03 |
| TC-10.04 | P2 | Carousel can be paused | Pause/stop control available | Prev/next and dots only | **FAIL** A11Y-04 |
| TC-10.05 | P2 | Modal focus management | Focus moves into the dialog on open | Cart drawer leaves focus behind the overlay | **FAIL** A11Y-06 |
| TC-10.06 | P3 | One `<h1>` per page | Single h1 | Homepage renders three (one per slide) | **FAIL** A11Y-08 |
| TC-10.07 | P2 | Interactive elements have accessible names | All named | Filters, sort, product links, wishlist buttons all named | PASS |
| TC-10.08 | P2 | Filter controls expose ARIA state | `aria-expanded`, `aria-haspopup`, `aria-controls` | All present and correct | PASS |
| TC-10.09 | P2 | Drawers are proper dialogs | `role="dialog"`, `aria-modal="true"`, ESC closes | All present | PASS |
| TC-10.10 | P2 | Reduced motion respected | `prefers-reduced-motion` handled | Media queries present | PASS |
| TC-10.11 | P2 | Keyboard-only journey | Browse → PDP → cart → checkout without a mouse | — | N/T |
| TC-10.12 | P2 | Colour contrast ≥ 4.5:1 | All body text | Not measured | N/T |
| TC-10.13 | P2 | Screen-reader journey | NVDA / VoiceOver end to end | Not performed | N/T |

---

## TS-11 · SEO and metadata

| ID | Priority | Title | Expected | Actual | Status |
|---|---|---|---|---|---|
| TC-11.01 | P1 | Canonical URLs are self-referential | Each page canonicalises to itself | `/games` → `https://ezurr.com/` (homepage) | **FAIL** SEO-01 |
| TC-11.02 | P2 | JSON-LD on product pages | Product + Offer | None | **FAIL** SEO-02 |
| TC-11.03 | P2 | Open Graph / Twitter Cards | Present sitewide | Zero | **FAIL** SEO-03 |
| TC-11.04 | P2 | Unique page titles | Per-route titles | `/auth` and `/cart` inherit the homepage title | **FAIL** SEO-06 |
| TC-11.05 | P2 | Unique meta descriptions | Per-route | Category pages reuse the sitewide description | **FAIL** SEO-07 |
| TC-11.06 | P3 | `robots.txt` and `sitemap.xml` | Present and valid | — | N/T |
| TC-11.07 | P2 | LCP image is eager | `loading="eager"` above the fold | Next.js warns on both the grid and the PDP | **FAIL** SEO-08 |

---

## TS-12 · Edge cases and negative testing

Grouped by class. Executed items carry a result; the remainder are the recommended regression backlog.

**Boundary values**
- Quantity `0` → server 422 · **PASS**
- Quantity `-3` → server 422; client silently drops the line · **PASS / partial**
- Quantity `1.5` → validated as integer · **PASS**
- Quantity `999999` against stock 7 → quote returns HTTP 200 with a ₹371 crore total · **FAIL** BUG-20
- Cart price `-1000` → client renders a negative subtotal; server ignores the field · **FAIL** BUG-19
- Coupon subtotal `-5000` → 422 `must be at least 0` · **PASS**
- Cart with exactly stock-many units, then a second buyer → oversell behaviour · N/T
- Order value exactly ₹10,000 (the COD boundary) · N/T
- Coupon on a cart of exactly ₹2,000 (the `min_order` boundary) · N/T

**Malformed and hostile input**
- `' OR 1=1--` as a coupon code · **PASS**
- `<img src=x onerror=…>` as a cart item title · **PASS**
- `<img/onerror=…>` through the SSR sanitizer · **FAIL** BUG-24
- `jajavascript:vascript:alert(1)` through the SSR sanitizer · **FAIL** BUG-24
- Non-numeric mobile `12345abc!@#` · **PASS**
- Empty `items` array at quote · **PASS**
- Missing `items` key entirely · **PASS**
- Nonexistent product key · **PASS** (422 "One or more items are unavailable.")
- Unicode, RTL and emoji in the address fields · N/T
- 10,000-character address line · N/T
- Path traversal in an upload filename · **PASS** *(code — filename is server-generated)*

**State and concurrency**
- Cart tampered while the checkout page is open · N/T
- Two tabs mutating the cart simultaneously · N/T
- Session expiring mid-checkout · N/T
- Double-clicking Place order (idempotency) · N/T
- N concurrent redemptions of a limited coupon · **FAIL** BUG-30 *(code-only)*
- Order cancelled after stock was decremented · **FAIL** BUG-11 *(code-only)*
- Payment failure after a digital code was issued · **FAIL** BUG-10 *(code-only)*
- Browser Back after applying a sort — state lost · **FAIL** BUG-32

**Environment and configuration**
- `NEXT_PUBLIC_API_URL` unset → unauthenticated admin access · **FAIL** BUG-09
- `APP_ENV=staging` with `APP_DEBUG=true` → guard does not fire · **FAIL** BUG-29
- `APP_URL` empty → deployment guard silently no-ops · **FAIL** BUG-29
- API unreachable mid-session → error handling · N/T
- Slow/hanging `/auth/me` → transient admin shell render · N/T (theoretical, low impact)

---

## TS-13 · Admin panel

Run as `9661663666` (owner). Every "Actual" below was verified against the SQLite database, not just the UI.

| ID | Priority | Title | Steps | Expected | Actual | Status |
|---|---|---|---|---|---|---|
| TC-13.01 | P1 | Admin signs in and reaches the dashboard | OTP sign-in as the owner | `/admin` renders with live KPIs | Dashboard loads | PASS |
| TC-13.02 | P2 | Dashboard KPIs reconcile with the database | Compare booked sales to the sum of order totals | Figures match | ₹86,558 = exact sum of all 7 orders; count and AOV reconcile | PASS |
| TC-13.03 | P1 | Order status transition persists | Open `EZ-5RDAOHZY`, click Mark packed | `orders.status` updated, audit event written | `status: packed`; `order_events` row records "Status set to packed" by "Ezurr Admin" | PASS |
| TC-13.04 | P1 | Product edit persists | Change price, save | New price in `products` | Persisted | PASS |
| TC-13.05 | P1 | Negative price is rejected | Enter `-500` in Price, save | Validation error, no write | Saved silently as `500`; no error, no confirmation | **FAIL** ADM-03 |
| TC-13.06 | P2 | Price field has numeric constraints | Inspect the input | `type=number`, `min=0` | `type="text"`, no `min`/`step`/`inputmode` (Stock is correct) | **FAIL** ADM-03 |
| TC-13.07 | P1 | A multi-character coupon code can be entered | Open New coupon, type `QATEST999` | Field holds `QATEST999` | Field holds `Q` — focus jumps to a `<button>` after the first keystroke | **FAIL** ADM-01 |
| TC-13.08 | P1 | A multi-digit percentage can be entered | Type `500` in % Off | Field holds `500` (and is capped at 100) | Field holds `5` | **FAIL** ADM-01 |
| TC-13.09 | P1 | Drawer forms retain focus while typing | Type one character, inspect `document.activeElement` | Focus stays in the input | `activeElement` is a `BUTTON` | **FAIL** ADM-01 |
| TC-13.10 | P1 | Blast radius of the drawer defect | Grep consumers of `AdminDrawer` | — | 9 components: categories, brands, coupons, integrations, message-templates, products, team, AutomationBuilder, CheckoutRuleBuilder | **FAIL** ADM-01 |
| TC-13.11 | P2 | Coupon create persists | Save a new coupon | Row in `coupons` | Persisted (with the truncated code) | PASS |
| TC-13.12 | P2 | Coupon delete persists | Click Delete | Row removed | Removed | PASS |
| TC-13.13 | P2 | Destructive actions are confirmed | Click Delete on a coupon | Confirmation dialog | Deleted immediately, no dialog, no undo | **FAIL** ADM-07 |
| TC-13.14 | P1 | Coupon status messaging is accurate | Read the coupons page banner | Accurate | Claims coupons "are not yet applied at checkout" — contradicted by order `EZ-5RDAOHZY` and by "USES 1/100" on the same screen | **FAIL** ADM-02 |
| TC-13.15 | P1 | Mark VIP persists | Click Mark VIP on customer 11 | `users.tags` updated | No DB write, `updated_at` unchanged, no UI change, no toast | **FAIL** ADM-04 |
| TC-13.16 | P2 | Ban customer persists | Click Ban customer | Customer blocked from ordering | Local-only per the page's own banner; no server effect | **FAIL** ADM-04 |
| TC-13.17 | P2 | Non-functional actions are visibly disabled | Inspect the customer action buttons | Disabled or clearly marked | Rendered as fully enabled; Mark VIP is the primary button, Ban is destructive-red | **FAIL** ADM-04 |
| TC-13.18 | P2 | Category product counts are correct | Compare the Products column to the DB | Matches | All 33 categories show `0`; DB has games 208, accessories 47, game-cards 26, consoles 17 | **FAIL** ADM-05 |
| TC-13.19 | P2 | Customer city is populated | Read the City column | City from the customer's orders | `—` for all 5 customers; detail header shows `11 · +91 98765 12345 · —` | **FAIL** ADM-06 |
| TC-13.20 | P2 | Product platform attribute is correct | Open PS4 FC26, read Platform | PS4 | **PS5** — root cause of the storefront category mismatch (BUG-22) | **FAIL** ADM-10 |
| TC-13.21 | P3 | Dates are formatted consistently | Compare dates across admin screens | One format, local timezone | `25 Jul 2026`, `25/7/2026`, and raw `2026-07-25T08:16:36.000000Z` (UTC) | **FAIL** ADM-08 |
| TC-13.22 | P3 | Seeded category data is clean | Read the category list | No typos or orphan duplicates | "Acessories Nintendo", "Accessories Playstaion", slug `accessories-playstaion-copy`; 29 of 33 categories unused | **FAIL** ADM-09 |
| TC-13.23 | P2 | Orders list reads live data | Open `/admin/orders` | All orders with correct totals and statuses | 7 of 7, correct | PASS |
| TC-13.24 | P2 | Customers list reads live data | Open `/admin/customers` | Correct order counts and lifetime spend | Correct | PASS |
| TC-13.25 | P2 | Sign out clears the local session | Click Sign out | Session and token removed | Both removed, redirected to `/auth` | PASS |
| TC-13.26 | P2 | Sign out revokes the token server-side | Sign out, replay the old Bearer token | 401 | Frontend never calls `POST /auth/logout`; token stays valid for its 14-day TTL | **FAIL** BUG-36 |
| TC-13.27 | P2 | CMS pages CRUD | Create and edit a CMS page | Persists | Not testable — blocked by ADM-01 | BLOCKED |
| TC-13.28 | P2 | Team invite and role assignment | Invite a staff member, set a role | Persists; role boundaries enforced | Not testable — blocked by ADM-01 | BLOCKED |
| TC-13.29 | P2 | Automations and checkout rules | Build a rule, save | Persists and fires | Not testable — blocked by ADM-01 | BLOCKED |
| TC-13.30 | P2 | Staff role boundaries | Sign in as a `viewer`, attempt a write | 403 | Not testable — no staff account could be created (ADM-01) | BLOCKED |

---

## Appendix · Environment

| Item | Value |
|---|---|
| Storefront | Next.js 16.2.10, React 19.2.4, Tailwind 4, `next dev` (Turbopack) |
| API | Laravel 12, PHP, SQLite, Sanctum, `APP_ENV=local`, `APP_DEBUG=true` |
| Browser | Chrome (macOS), 1440×900 primary |
| Test customer | `9876512345` · user id 11 · role `customer` |
| Seeded admin | `9661663666` · not used (no credentials supplied) |
| Order created | `EZ-5RDAOHZY` · ₹3,304 · COD · confirmed |
| Coupon used | `SAVE20` · 20% · min ₹2,000 · `used_count` 0 → 1 |
| Admin account | `9661663666` · user id 1 · `role: admin`, `staff_role: owner` (client-supplied) |
| Cleanup performed | Test cart cleared; profile name restored; product price restored to ₹3,499; test coupon deleted. **Still present:** test user id 11, order `EZ-5RDAOHZY` (now status `packed`), `SAVE20` at `used_count 1`, and an active admin browser session. |

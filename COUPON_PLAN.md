# Coupons — Analysis & Implementation Plan (validity + rules)

## 1. Current state

| Aspect | Today |
|---|---|
| Storage | **Theme localStorage only** (`adminStore.coupons`); no API, no DB table. |
| Fields | `id, code, percentOff, active, uses, maxUses, createdAt` — that's it. |
| Validity | **None** — no start/end dates. |
| Rules | **None** — no min-order, per-customer limit, scope, discount type, cap, first-order-only, stacking. |
| Discount type | Percent only (1–90%); no fixed-amount option. |
| Checkout integration | **None.** `OrderService::create()` / the new `/checkout/quote` only apply `prepaidDiscountPct` from policy. The storefront checkout has no "apply code" field. A coupon can never actually discount an order. |
| Duplicate guard | None (`CPN-${Date.now()}` id; two `SUMMER20` allowed). |

**Conclusion:** coupons are a UI mock. Making them real means (a) a backend coupon store + rules engine, (b) checkout wiring, and (c) an admin form for validity + rules. This is a proper feature, not a tweak.

## 2. Proposed data model — `coupons` table (migration)

```
id                bigint pk
code              string unique            (normalized upper-case)
description       string nullable
discount_type     enum('percent','fixed')  default 'percent'
value             unsigned int             (percent 1–100, or paise/rupees for fixed)
max_discount      unsigned int nullable    (cap for percent coupons, in ₹)
min_order         unsigned int default 0   (min subtotal in ₹ to qualify)
starts_at         timestamp nullable       (validity window start)
ends_at           timestamp nullable       (validity window end / expiry)
usage_limit       unsigned int nullable    (total redemptions; null = unlimited)
per_customer_limit unsigned int nullable   (redemptions per mobile; null = unlimited)
used_count        unsigned int default 0
first_order_only  boolean default false
category_slug     string nullable          (scope: only carts with a matching item)
brand_slug        string nullable
stackable         boolean default false    (with prepaid discount)
active            boolean default true
timestamps
```
Plus a **`coupon_redemptions`** table (`coupon_id, order_id, mobile, amount, created_at`) to enforce `per_customer_limit` and give an audit/report trail.

## 3. Backend (ezurr-api)

**Models:** `Coupon`, `CouponRedemption` (belongsTo Coupon).

**Admin CRUD** (under `/admin`, gated `coupons.write` — add that permission to `EnsureStaffCan` usage):
- `GET /admin/coupons` · `POST /admin/coupons` · `PUT /admin/coupons/{code}` · `DELETE /admin/coupons/{code}`.
- Validation: unique code, `discount_type in:percent,fixed`, `value` range by type, `ends_at after_or_equal:starts_at`, non-negative limits.

**Coupon engine** — a `CouponService::evaluate(code, ctx)` returning `{ valid, reason, discount }`:
1. exists + `active`
2. within `[starts_at, ends_at]` (validity)
3. `subtotal >= min_order`
4. `used_count < usage_limit`
5. redemptions for this `mobile` `< per_customer_limit`
6. `first_order_only` → no prior orders for mobile
7. scope: cart contains an item matching `category_slug`/`brand_slug`
8. compute discount: percent → `min(subtotal*value/100, max_discount ?? ∞)`; fixed → `min(value, subtotal)`
9. stacking: if `!stackable`, coupon replaces the prepaid discount (take the larger, or coupon-wins — decide in step 4 of §5)

**Checkout wiring (the critical part):**
- `POST /checkout/quote` and `OrderService` accept an optional `couponCode`. Run `CouponService::evaluate` against the **server-derived** subtotal (never client value), fold the coupon discount into the existing discount math, and return `{ couponApplied, couponDiscount, reason? }` so the theme can show applied/rejected state.
- On successful order create, insert a `coupon_redemptions` row and `increment('used_count')` **inside the order transaction** (atomic with stock decrement).
- Add a public `POST /checkout/coupon` (validate-only, throttled) so the storefront can show "applied ✓ / why not" before placing the order.

**Tests:** expired coupon rejected; min-order gate; usage-limit + per-customer-limit enforced; percent-with-cap; fixed ≤ subtotal; redemption row written on order; self/duplicate code rejected.

## 4. Frontend (ezurr-theme)

**Admin coupons page + drawer:** add fields — discount type (percent/fixed), value, max-discount (percent only), min-order, **starts/ends date pickers**, usage limit, per-customer limit, first-order-only, category/brand scope, stackable. Wire the page to the new API (list/create/update/delete + error banner + loading), replacing the localStorage store and removing the demo banner once backed. Add a duplicate-code guard and show validity status (Scheduled / Active / Expired) as a badge derived from the dates.

**Storefront checkout:** add an "Apply coupon" input that calls `POST /checkout/coupon` (or re-quotes), shows the applied discount line and a rejection reason, and includes `couponCode` in the order payload. Render the coupon discount as its own line in the totals (which already come from the API after the C-3 fix).

**Types:** extend the coupon DTO/type with the new fields; map snake↔camel in `apiMappers`.

## 5. Decisions to confirm before building
1. **Discount types:** percent + fixed-amount, or percent only for v1?
2. **Stacking:** can a coupon stack with the prepaid discount, or is it either/or (take the larger)?
3. **Scope granularity:** cart-level category/brand match (simpler) vs per-line-item discounting (complex)?
4. **Guest coupons:** enforce `per_customer_limit`/`first_order_only` by mobile (works for guests) — confirm mobile is the identity key.
5. **Storefront placement:** coupon field on the checkout page only, or also a cart drawer?

## 6. Suggested rollout
- **Phase A (backend):** migration + models + admin CRUD API + `CouponService` + tests. *(No UI change; coupons still mock in the theme.)*
- **Phase B (admin UI):** wire the coupons page to the API with validity + rules fields; drop the demo banner.
- **Phase C (checkout):** quote/order coupon application + redemption tracking + storefront "apply code" UI.

Estimated size: ~1 backend migration + 2 models + 1 controller + 1 service + ~6 tests; ~2 theme files (coupons admin + checkout) + apiClient/mappers.

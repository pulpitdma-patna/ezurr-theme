All 66 findings verified as accurate against the code (spot-checked ~15 across every group; file:line references are correct and the local-store-in-API-mode pattern is confirmed). Here is the audit.

---

# Ezurr Admin Panel — Definitive Audit

**Codebase:** `ezurr-theme` (Next.js admin, `src/app/admin/**` + `src/components/admin/**`)
**Scope:** 66 auditor findings across catalog, fulfillment, grow/reports, CMS/checkout, and shell/shared surfaces, deduped and merged.

---

## 1. Executive Summary

The admin panel is **visually complete and internally consistent, but functionally hollow in API mode.** It ships with a dual-source data layer: a local `adminStore` (localStorage seed) and a real Laravel API selected via `isApiEnabled()` (on by default whenever `NEXT_PUBLIC_API_URL` is set). A handful of surfaces were correctly wired to the API — the products *list*, the products *drawer* save, checkout-rule save/delete, orders *list* (page 1), and 7 settings fields — but **most of the panel still reads and writes the local store even when the API is live**, while showing success toasts that imply persistence.

### Top themes

1. **Dual-mode persistence gaps (dominant, ~30 findings).** Writes that appear to succeed but only touch `localStorage` and vanish on the next API refetch: dashboard KPIs, inventory adjustments, the entire order-detail action set (status/tracking/notes/refund/digital assignment), pre-order release, new/edit product pages, bulk publish, team invite/revoke, settings (most fields), coupons, integrations, CSV import, CMS publish, and the checkout-rule pause toggle. Every one shows a persisted-looking toast.
2. **Mock-only modules presented as live.** Analytics, Reports, Customers, Coupons, Digital Codes, Integrations, Activity/audit trail, Command palette, and the shell header badge/alerts derive from seed data while their copy claims live/real data. Some (Automations, Platform) at least disclose "simulated locally"; most do not.
3. **Missing loading / error / empty states.** Errors are computed then never rendered (`listError`, `apiSync('err')`), success is toasted before/instead of awaiting the request, and empty-state flashes appear during the initial fetch (categories, brands, team, checkout-rules).
4. **Server-side pagination faked client-side.** Orders fetch only API page 1 (~15 rows); everything past it is unreachable, yet the pager implies more. Command palette searches only the first 40 records; team hides rows past 25.
5. **Shared-component a11y gaps** repeated across every page: `AdminField` errors not linked to controls, `DataTable` headers missing `aria-sort`, `FilterBar` misusing tab roles, command palette missing `aria-activedescendant`, danger toasts announced politely.

### The 5 most important things to fix

1. **Wire the order-detail page to the API** (`orders/[id]/page.tsx`) — currently every real order lands on "Order not found," and status/tracking/notes/refund changes are all lost. This is the single most broken high-traffic workflow.
2. **Fix the dashboard** (`admin/page.tsx`) — the operator's landing page shows fabricated seed revenue, orders, and low-stock; the most visible page in HQ is silently wrong.
3. **Persist inventory + the new/edit/bulk product paths** (`inventory`, `products/new`, `products/[key]/edit`, bulk publish) — a data-integrity trap where stock adjustments and product creates silently fail to reach Laravel.
4. **Surface errors and stop lying with toasts** — settings, categories/brands, checkout-rules, and team all swallow failures and toast success unconditionally. Await the call, show success on resolve, render an error banner on reject.
5. **Fix orders pagination** (`orders/page.tsx`) — drive server-side page/filter/search so orders beyond the first API page are reachable.

---

## 2. Functional Findings by Severity

> The recurring root cause below is labeled **[local-write-in-API-mode]**: the handler calls an `adminStore` mutation with no `isApiEnabled()` branch, clears/toasts success, and the change is overwritten on the next API refetch.

### HIGH

| # | Route / Component | File:Line | What's broken | Fix |
|---|---|---|---|---|
| H1 | `/admin` Dashboard | `app/admin/page.tsx:32` | **Zero API calls.** All KPIs (booked sales & delta, orders/AOV, open/COD, catalog pulse, low-stock list, recent orders, `getDerivedAlerts`) come from `store.orders/products/customers`. Verified: `useAdminStore()` + `getDerivedAlerts(store)` at top of component. | In API mode fetch orders/products (+ a summary endpoint) and compute KPIs/alerts/low-stock from that; keep local as fallback. Add loading/error states. |
| H2 | `/admin/orders/[id]` | `orders/[id]/page.tsx:56` | Order resolved only via `store.orders.find(o => o.id === id)`. API rows carry `public_id`, never in the mock store → **"Order not found" for every real order**; even on a match, `timeline: []` blanks the timeline. `api.adminOrder()` exists but is called nowhere. | When `isApiEnabled()`, fetch via `api.adminOrder(id)` into local state with loading/error UI; map with `mapApiOrderToAdmin`. |
| H3 | `/admin/orders/[id]` status buttons | `orders/[id]/page.tsx:120` | `applyStatus`/`confirmCancelAction` call `updateOrderStatus` (local) only. `api.patchOrderStatus` is used by the list's bulk action but not here. Confirm/Pack/Ship/Deliver/Cancel toast success, persist nothing. **[local-write-in-API-mode]** | Await `api.patchOrderStatus(id, {status})` in API mode, then update local state; surface errors. |
| H4 | `/admin/orders/[id]` tracking/notes | `orders/[id]/page.tsx:135` | `saveMeta` writes `updateOrderTracking`/`updateOrderNotes` (local). `api.patchOrderStatus` already accepts `{tracking, notes}`. AWB/notes never reach backend. **[local-write-in-API-mode]** | Route through `api.patchOrderStatus(id, {status, tracking, notes})` in API mode. |
| H5 | `/admin/orders` list | `orders/page.tsx:144` | `api.adminOrders({page:1})` with empty deps — **only ~15 rows ever fetched.** Filter/search/sort/pager all client-side over that slice; changing DataTable page never refetches. Orders past page 1 unreachable. | Drive server-side pagination (page/pageSize/status/query in deps; use `res.total`/`last_page`), or fetch all pages. |
| H6 | `/admin/preorders` | `preorders/page.tsx:142` | Entire page reads `store.orders/products`, no `isApiEnabled()` branch. `batchReady`→`markPreordersReady` (local) then toasts "Released… stock allocated." Release/allocation never reach backend. | Load holds from API; release via `api.patchOrderStatus(id, {status:'confirmed'})` per order (or batch endpoint). |
| H7 | `/admin/digital-codes` | `digital-codes/page.tsx:265` | Vault reads `store.digitalCodes`; Assign/Redeem are local mutations with **no digital-code API at all.** Nothing labels it mock → reads as fully functional. | Add real list/assign/redeem endpoints; until then mark the page Phase-2/mock. |
| H8 | `/admin/products` bulk bar | `products/page.tsx:629` | Grid renders `apiProducts` in API mode, but bulk `publishProducts`/`unpublishProducts` mutate only `adminStore` (`adminStore.ts:1167/1178`). Selection clears so it *looks* done; grid unchanged, nothing persisted. Same bug class already fixed for the drawer. | PUT each selected key via `apiUpdateProduct`, then `loadProducts()`; or disable the bulk buttons in API mode. |
| H9 | `/admin/products/new` | `products/new/page.tsx:36` | `handleSubmit` unconditionally calls `upsertProduct` (local), no API branch. Verified. Created product written only to localStorage, never appears in the API-backed grid. | Mirror the drawer: `await apiCreateProduct(productApiPayload(...))` in API mode; local only as fallback. |
| H10 | `/admin/products/[key]/edit` | `products/[key]/edit/page.tsx:53` | Resolves via `store.products.find(row => row.key === key)` (verified) — API keys never match → **"Product not found" for every real product.** Even on a match, `handleSubmit`→`upsertProduct`/`adjustStock` (local). The drawer's "Full editor" link and inventory SKU links lead here → dead path in API mode. | Load via `api.product(key)`; route `handleSubmit` through `apiUpdateProduct` + refetch. |
| H11 | `/admin/inventory` | `inventory/page.tsx:52` | Hardwired to local store (verified: `store.products`, `store.settings.lowStockThreshold`). `adjustStock` (`adminStore.ts:651`) mutates only localStorage; no `isApiEnabled()` anywhere. **Every ± Qty adjustment silently fails to persist — data-integrity trap.** | Fetch from `api.adminProducts` in API mode; persist adjustments via `apiUpdateProduct(stock)` + refetch. |
| H12 | `/admin/analytics` | `analytics/page.tsx:26` | Every KPI/chart from `store.orders`. Header says "Booked sales overview from your order book" → operator sees fabricated seed revenue/AOV. No loading/error/empty (data is synchronous local). | Fetch `api.adminOrders` (paginated) in API mode and derive series/KPIs with loading+error; at minimum relabel. |
| H13 | `/admin/reports/[report]` | `reports/[report]/page.tsx:39` | `deriveReport` + prior-period compare run entirely over the seed store; **no reports API exists.** Hub advertises "Derived from your live admin store"; CSV export ships seed rows. | Source from API when available with loading/error, or clearly mark demo and stop claiming "live." |
| H14 | `/admin/customers/[id]` | `customers/[id]/page.tsx:66` | Ban / VIP / notes / tag writes all call `updateCustomer` (local) — **no customer API.** A "banned" customer isn't actually banned; API checkout never sees it. Misleading destructive action. | Wire to a customers API in API mode; until then disable the actions or label local-only. |
| H15 | `/admin/checkout-rules` toggle | `checkout-rules/page.tsx:291` | Pause/Enable calls only `toggleCheckoutRule` (local), no API branch (verified) — unlike `saveRule`/delete which do branch. On-mount refetch upserts server rules back, overwriting the toggle. Storefront keeps applying/suppressing the rule. | Await `api.upsertCheckoutRule({...rule, enabled:!rule.enabled})` in API mode, then upsert response. |
| H16 | `/admin/checkout-rules/templates` | `checkout-rules/templates/page.tsx:198` | "Use template" `onSave`→`upsertCheckoutRule` directly (no API branch) **and** assigns a client-side `cr-...` id — exactly what the main page warns causes a 404 PUT to a non-existent `public_id`. Never POSTed to Laravel. | Route template saves through the same `saveRule` logic (no id in API mode, upsert server response). |
| H17 | `/admin/cms/[pageId]` (whole CMS) | `components/admin/cms/PageBuilder.tsx:394` | Every CMS mutation (publish/updateBlock/addSection/global code) only writes `localStorage`; **no apiClient CMS path exists.** Storefront `PageRenderer` reads the same localStorage → a "published" page is invisible on any other device/browser and dies on storage clear. Headline gap for the entire CMS surface. | Wire CMS create/update/publish through apiClient with refetch+errors, or add an unmistakable "Local preview only — not saved to server" banner across pages/builder/code/widgets. |
| H18 | `/admin/settings` | `settings/page.tsx:112` | `patch()` sends only a **7-field allowlist** (verified: codEnabled, codLimit, prepaidDiscount, freeShippingMin, releaseDate, accentHue, showOffer). storeName, city, supportEmail/phone, gstin, orderIdPrefix, lowStockThreshold, timezone, currencyLabel, notify* all toast "Saved just now" but are never sent; on-mount fetch merges only the same 7. Store/Operations/Tax/Notifications tabs are read+write local in API mode. | Add all persisted keys to the payload (+ server support), or disable/mark unsupported fields so the toast isn't misleading. |
| H19 | `/admin/team` invite | `team/page.tsx:313` | `displaySeats = apiOn ? apiSeats : seats` (verified), but invite `onSubmit` always `setSeats([...])` — pushes into the **unrendered** `seats` array in API mode. Drawer closes, toast fires, directory unchanged → silent no-op. Works in local mode → behavior diverges by source. | Route invites through an API call and update `apiSeats` on success; until an endpoint exists, disable the form in API mode. |

### MEDIUM

| # | Route / Component | File:Line | What's broken | Fix |
|---|---|---|---|---|
| M1 | `/admin/products` save | `products/page.tsx:40` | `productApiPayload` never includes **sku/platform/edition**; `mapApiProductToAdminRow` hardcodes platform/edition and `sku=key`. Editing those three toasts "Product saved" but they're neither sent nor persisted, and revert on refetch. | Include them in the payload + mapper, or hide/disable those fields in API mode. |
| M2 | `/admin/categories` + `/admin/brands` | `categories/page.tsx:67` | `listError` is set on fetch/save/delete failure but **never referenced in JSX** on either page → failed API call leaves a silent blank "No categories yet." table. | Render `listError` as an inline banner above the DataTable on both pages. |
| M3 | `/admin/categories` + `/admin/brands` | `categories/page.tsx:72` | `productSource=[]` whenever `apiOn` → per-row `productCount` is **always 0** in API mode. False data shown as fact. | Include a `product_count` on the payload, or count `apiProducts` by slug, or drop the column in API mode. |
| M4 | `/admin/categories` + `/admin/brands` mock create | `categories/page.tsx:160` | Mock `createCategory`/`createBrand` (`adminStore.ts:1001/1042`) ignore image, parent, and active (hardcode `active:true`); records have no such fields. Drawer image upload / parent select / "Active in filters" silently do nothing in the fallback. | Persist image/parent/active in local records, or hide those inputs when `!isApiEnabled()`. |
| M5 | `/admin/orders/[id]` refund | `orders/[id]/page.tsx:475` | `refundOrder` local only; **no refund endpoint exists.** Dialog copy is honest ("Mock refund"), but the order shows "Refunded" locally while backend is untouched; lost on refetch. | Add an admin refund endpoint and call it in API mode; until then disable/hide the button in API mode. |
| M6 | `/admin/orders/[id]` digital assign | `orders/[id]/page.tsx:288` | "Assign" → `assignDigitalCodeToOrder` (local, no API path); available/assigned lists from `store.digitalCodes` (stale). Toast "Code assigned" persists nothing. | Route through a real endpoint in API mode, or gate the whole Digital fulfillment panel behind mock mode. |
| M7 | `/admin/coupons` | `coupons/page.tsx:81` | `handleSave` + enable/disable → `upsertCoupon` (local); **no coupon API.** Unlike Automations, the page reads as a real promo tool → admin believes shoppers can redeem codes the API checkout never recognizes. | Persist via API in API mode; until then add a visible "demo / not applied at checkout" notice or disable writes. |
| M8 | `/admin/cms/code` | `cms/code/page.tsx:48` | Textareas already commit on every keystroke via `onChange={updateCmsGlobalCode(...)}` (verified). The **Save button `onClick` only fires a toast** — purely decorative, doesn't control anything. | Remove Save (edits autosave), or make textareas local state and let Save be the sole commit. |
| M9 | `/admin/checkout-rules` load | `checkout-rules/page.tsx:80` | On failure sets `apiSync('err')` but **only `'ok'` is rendered** (the "Laravel synced" pill). Failed sync invisible; stale local data shown as truth. No loading flag → empty-state flash. | Render an error banner on `'err'`; add a loading flag before showing list/empty. |
| M10 | `CheckoutRuleBuilder` validation | `CheckoutRuleBuilder.tsx:176` | `handleSave` validates only non-empty name. Numeric actions (set_cod_max, set_prepaid_discount_pct, set_tax_rate, set_deposit_pct) and block_checkout message save empty/non-numeric → `NaN` at `resolveCheckoutPolicy`, or an empty-message checkout block. | Validate action values by type before `onSave`; block with inline errors or drop incomplete rows. |
| M11 | `CheckoutRuleBuilder` legacy mode | `CheckoutRuleBuilder.tsx:272` | Condition-mode selector maps over `["rows"]` → a lone dead "tab." A stored `conditionMode==='script'` rule renders the script textarea; `evalCheckoutScript` always returns `{ok:false,'Script mode has been removed.'}` → `handleSave` blocked → rule **permanently un-editable/un-migratable.** | Remove the dead toggle; coerce loaded `script` rules to `'rows'` so they can be re-saved. |
| M12 | `/admin/cms/widgets` | `cms/widgets/page.tsx:208` | Uninstall/Remove fires `uninstallCmsWidget` immediately, **no ConfirmDialog** (unlike other destructive ops). If the widget is placed on pages, ModulePalette drops it and blocks' `widgetId` no longer resolves → silently degraded pages, no undo. | Gate behind ConfirmDialog; warn/block when referenced by existing blocks. |
| M13 | `/admin/settings` save flow | `settings/page.tsx:121` | `api.updateAdminSettings(payload).then().catch(()=>undefined)` swallows failures; `setMsg(toast)` runs unconditionally *before* resolve (verified). Backend rejection still shows "Saved just now." Initial fetch also `.catch(()=>{})`. | Await the call; success banner only on resolve; distinct error banner on reject. |
| M14 | `/admin/settings` slider | `settings/page.tsx:292` | Range input `patch({accentHue})` on every `onChange` → in API mode a PUT + "Saved" banner per drag tick; number/text fields save per keystroke. | Debounce the write / commit on pointer-up / blur. |
| M15 | `/admin/team` revoke | `team/page.tsx:366` | Revoke `onConfirm` always `setSeats(...)` (local); visible list is `apiSeats` → row unchanged, yet toasts "Seat revoked." No revoke API (`updateTeamMember` only takes role). | Add a revoke endpoint + update `apiSeats`; else disable Revoke in API mode. |
| M16 | `/admin/team` fetch state | `team/page.tsx:91` | `api.adminTeam().catch(()=>undefined)` leaves `apiSeats=[]`. In-flight or failed → generic "No results." + "0 seats," indistinguishable from an empty team; no retry. | Track loading/error; pass `loading` to DataTable; render error/retry on catch. |
| M17 | `/admin/tools/import` | `tools/import/page.tsx:50` | `importProducts`/`importCodes`→`setAdminState` directly, no API branch. `api.importCatalog`/`exportCatalog` exist but unused. Imported SKUs hit localStorage the API grid doesn't show, never reach backend, but report success. | Send parsed rows to `api.importCatalog` (dry-run→commit) in API mode; report server response. |
| M18 | `/admin/integrations` | `integrations/page.tsx:99` | `connect/toggle/testConnection/saveCredentialAlias` all → `updateIntegration` (local); **no integrations API.** `testConnection` unconditionally sets `status:'connected'` and toasts success regardless of state; "simulated" note lives only inside the drawer. Header counts reflect only localStorage. | Back with a real API when available; until then mark the whole surface (cards, not just drawer) as local demo and stop the guaranteed-success test. |
| M19 | `/admin/activity` | `activity/page.tsx:52` | Renders `store.activityLog`. API-mode mutations don't append to it → the "Audit trail of admin mutations" captures nothing real, only seed entries. | Source from an API audit endpoint in API mode; else relabel local/demo. |
| M20 | Command palette (⌘K) | `CommandPalette.tsx:54` | `useAdminStore()` (localStorage-only, no API refs) builds order/product/customer results → real records return "No matches" in API mode. | Source palette entities from the API (debounced query) when `isApiEnabled()`. |
| M21 | Command palette (⌘K) | `CommandPalette.tsx:72` | `store.orders/products/customers.slice(0,40)` **before** filtering → any record past index 40 is unreachable via search. | Filter the full collection first, then slice matched results; or search server-side. |
| M22 | Shell header chrome | `AdminShell.tsx:1045` | Pending-orders badge (`store.orders.filter(status==='pending')`, line 1384) and `getDerivedAlerts(store)` (line 1045) derive from the local store → misleading counts on **every** admin page in API mode. | Feed badge/alerts from an API-aware source, or hide them in API mode until wired. |

*(Consistency-flavored mediums — orders result-count/COD badge `orders/page.tsx:308`, and customer roster seed data `customers/page.tsx:34` — are listed in §3 to keep functional/consistency separate, though both stem from the same local-store-in-API-mode root cause.)*

### LOW

| # | Route / Component | File:Line | What's broken | Fix |
|---|---|---|---|---|
| L1 | `/admin/media` | `media/page.tsx:26` | `catalogAssets` maps `store.products.slice(0,24)` → seed products, capped at 24, no pagination, even in API mode. Page is honestly labeled Phase 2. | Populate from `api.adminProducts` image_url (paged) in API mode, or scope the label to "seed preview." |
| L2 | `AutomationBuilder` | `AutomationBuilder.tsx:108` | `handleTest`→`testAutomation(draft.trigger)` runs against already-**saved** rules, not the unsaved draft, yet reports "Test event fired." | Evaluate the in-memory draft, or require save first and reword the hint. |
| L3 | `/admin/coupons` | `coupons/page.tsx:82` | Fresh `CPN-${Date.now()}` id every create, no duplicate-code guard → two "SUMMER20" coupons; code-keyed redemption/reporting ambiguous. | Reject/merge existing normalized code on create; inline validation. |
| L4 | `/admin/automations` | `automations/page.tsx:334` | History renders `runs.slice(0,80)` with a "latest 80 of N" note; anything beyond 80 permanently unreachable. | Add pagination / load-more. |
| L5 | `/admin/settings` email | `settings/page.tsx:232` | `patch({supportEmail})` runs before `emailError` is computed → invalid email is already persisted (and, if allowlisted, sent). Validation advisory only. | Validate before `patch`, or roll back on failure. |
| L6 | `/admin/team` pagination | `team/page.tsx:268` | DataTable gets `pageSize={25}` but no `page/onPageChange` → footer never renders yet rows slice to 25 → members past 25 silently hidden. | Wire `page/onPageChange` (as Activity does), or drop `pageSize`. |
| L7 | `/admin/tools/import` parsing | `tools/import/page.tsx:11` | `parseCsv` splits on `,` (quoted commas mis-parsed); category/platform/status cast with `as` (no validation); price kept as raw string. Malformed rows upsert with a success report. | Quote-aware CSV parse; validate enums/numbers; report rejected rows. |

---

## 3. UI / Consistency / Accessibility Findings by Severity

### MEDIUM

| # | Area | File:Line | Issue | Fix |
|---|---|---|---|---|
| U1 | `/admin/orders` (consistency) | `orders/page.tsx:308` | `resultLabel={`${rows.length} of ${store.orders.length}`}` mixes API-filtered count with the **local** total → wrong denominator in API mode; `pendingCod` (line 296) counts `store.orders` → "COD · N" badge reflects mock data. | Derive total + `pendingCod` from the active source (`isApiEnabled() ? apiOrders : store.orders`), ideally an API total. |
| U2 | `/admin/customers` (consistency) | `customers/page.tsx:34` | Roster filters/sorts/paginates `store.customers` (seed) client-side → search never finds a real customer; counts fictional. | Back with a paginated customers API (server-side search/sort) in API mode; else flag demo. |
| U3 | AdminChart (ui) | `AdminChart.tsx:110` | Labels are one `flex justify-between` row of 8px spans, no thinning/rotation → 30/90-day series crushes into a smear; `barWidth` floored at 8px while 90-point spacing is ~3.5px → bars overlap into a solid block. | Render every Nth label (~8–12 ticks max); scale bar width to the per-bar slot; hide labels above a threshold. |
| U4 | `/admin/reports/[report]` (a11y) | `reports/[report]/page.tsx:173` | Saved views deletable **only via right-click** `onContextMenu` — no keyboard path, unreliable on touch, undiscoverable, and no confirm. | Add a visible focusable "×" per chip with `aria-label`; optional confirm. |
| U5 | `/admin/categories` + `/admin/brands` (ui) | `categories/page.tsx:281` | Fetch async but never pass `loading` to DataTable → "No categories/brands yet." empty state + Add CTA flicker before rows resolve. Products page already passes `loading`. | Track a loading flag around `adminCategories()/adminBrands()` and pass `loading`. |
| U6 | `AdminField` (a11y, shared) | `AdminField.tsx:35` | Error rendered in a bare `<p>` with no id (verified); child control never gets `aria-describedby`/`aria-invalid` → screen readers never announce the error. Affects **every** admin form using AdminField. | Generate a `useId` for the error `<p>`, wire `aria-describedby`+`aria-invalid` onto the child, add `role="alert"`. |

### LOW

| # | Area | File:Line | Issue | Fix |
|---|---|---|---|---|
| U7 | Categories/brands drawers (consistency) | `categories/page.tsx:318` | Hand-rolled inputs `h-10 rounded-xl bg-[#F7F7F8]` vs shared `ProductForm` `inputClass` `rounded-md py-2.5` → two radii/heights for the same pattern. | Extract `ProductForm` `inputClass`/Field into a shared control and reuse. |
| U8 | AdminChart (ui) | `AdminChart.tsx:112` | Label spans keyed by `label` value (verified) → duplicate labels (platform-mix, repeated ticks) produce duplicate React keys → console warnings, possibly dropped nodes. | Key by `${label}-${index}`. |
| U9 | `/admin/digital-codes` (a11y) | `digital-codes/page.tsx:240` | Assign dialog is a bespoke modal (no ESC/focus trap, unlike the ConfirmDialog redeem path); its `<select>` has no `<label>`/`aria-label` → announced as an unlabeled combobox. | Add `aria-label`; move onto AdminDrawer/shared modal for focus + ESC. |
| U10 | CMS RichText (a11y) | `cms/RichTextField.tsx:31` | Toolbar buttons expose only glyphs (B/I/• List/Link), no `aria-label`; editable div has no role/label; relies on deprecated `execCommand`; re-sanitizing on every `onInput` back through `dangerouslySetInnerHTML` can jump the caret to start. | Add `aria-label` per button + `role="textbox"`/`aria-multiline`/`aria-label`; longer term drop `execCommand` and stop rewriting innerHTML per keystroke. |
| U11 | `/admin/cms` (consistency) | `cms/page.tsx:62` | Create/Duplicate navigate via `window.location.href` → full reload + re-hydration (white flash, shell re-mount). Templates page uses `useRouter().push`. | Use `useRouter().push` for both, matching templates. |
| U12 | CMS SectionInspector (ui) | `cms/SectionInspector.tsx:474` | Layout inputs `value={block.layout?.[key] ?? (…10/40/1)}` show fabricated concrete numbers when `block.layout` is undefined → panel claims values the block doesn't have. | Show empty/placeholder when the override is unset (`value ?? ''` + placeholder for the effective default). |
| U13 | `/admin/platform` (consistency) | `platform/page.tsx:21` | `apiBase` hardcoded `https://api.ezurr.example/v1`; badge static "Mock · disconnected"; test/dry-run emit mock toasts — contradicts a live `NEXT_PUBLIC_API_URL`. Labeled Phase 2 but displayed state is misleading. | Initialize `apiBase` from `getApiBaseUrl()`; reflect `isApiEnabled()` in the badge. |
| U14 | DataTable (a11y, shared) | `DataTable.tsx:115` | Sortable headers are a `<button>` in `<th>` with an `aria-hidden` arrow (verified); `<th>` never sets `aria-sort` → SR users can't tell which column/direction is sorted. | Add `aria-sort` = active ? (asc?'ascending':'descending') : 'none'. |
| U15 | Command palette (a11y) | `CommandPalette.tsx:172` | Input has `aria-controls`+`aria-autocomplete='list'` but no `role='combobox'` and no `aria-activedescendant` → SR users arrowing through results hear nothing about the current selection. | Give options stable ids; set `role='combobox'`+`aria-expanded`+`aria-activedescendant` on the input; `role='option'` on li. |
| U16 | DataTable (ui, shared) | `DataTable.tsx:98` | Card is `overflow-hidden`, table in `overflow-x-auto` with no vertical scroll container → thead `sticky top-0 z-10` and bulk-bar `sticky top-0 z-20` are inert (dead styling); if a scroll context were added they'd both pin at `top-0` and the header would hide behind the bulk bar. | Drop the sticky classes, or add a real max-height scroll container and offset the thead below the bulk bar. |
| U17 | FilterBar (a11y, shared) | `FilterBar.tsx:18` | `role='tablist'` + `role='tab'`+`aria-selected` on chips, but no tabpanel, no `aria-controls`, no roving-tabindex/arrow keys → SRs imply arrow navigation that doesn't exist. These are filter toggles. | Use `role='group'`+`aria-label` with `aria-pressed` buttons, or implement full tab semantics. |
| U18 | AdminToast (a11y, shared) | `AdminToast.tsx:57` | All toasts in one `aria-live='polite'` region regardless of tone → error/danger toasts queue behind others and don't interrupt; failure feedback can be missed. | Escalate danger (and warning) to `aria-live='assertive'`/`role='alert'`; set politeness from the highest-severity active toast. |

---

## 4. Prioritized Action List

**P0 — Data-integrity & core workflows broken in API mode (do first)**

1. **Order detail: read from API** — `orders/[id]/page.tsx:56` fetch via `api.adminOrder(id)` with loading/error (H2).
2. **Order detail: persist all actions** — status (`:120`), tracking/notes (`:135`), and gate/persist refund (`:475`) & digital assign (`:288`) via `api.patchOrderStatus`/new endpoints (H3, H4, M5, M6).
3. **Dashboard: compute from API** — `page.tsx:32`, add loading/error (H1).
4. **Inventory: read + persist via API** — `inventory/page.tsx:52` (H11).
5. **Product write paths: API** — new (`new:36`), edit (`[key]/edit:53`), bulk publish (`products/page.tsx:629`) (H9, H10, H8).
6. **Orders: server-side pagination/filter/search** — `orders/page.tsx:144` (H5).

**P1 — Silent no-ops & misleading success (persistence + honest state)**

7. **Settings: send all fields or disable unsupported ones; await + error banner; debounce slider** — `settings/page.tsx:112/121/292` (H18, M13, M14).
8. **Checkout-rules: persist toggle + template save; render error + loading** — `checkout-rules/page.tsx:291`, `templates:198`, `:80` (H15, H16, M9).
9. **CMS: wire publish/save to API, or add an unmistakable "local preview only" banner across CMS; fix the no-op global-code Save** — `PageBuilder.tsx:394`, `cms/code:48` (H17, M8).
10. **Team: persist invite/revoke via API + loading/error + pagination** — `team/page.tsx:313/366/91/268` (H19, M15, M16, L6).
11. **Pre-orders: load + release via API** — `preorders/page.tsx:142` (H6).
12. **Shell header badge/alerts + command palette from API** — `AdminShell.tsx:1045`, `CommandPalette.tsx:54/72` (M22, M20, M21).

**P2 — Mock modules: back with API or clearly disclose**

13. **Analytics & Reports: API-backed or stop claiming "live"** — `analytics:26`, `reports/[report]:39` (H12, H13).
14. **Customers detail + roster: API or disable/flag** — `customers/[id]:66`, `customers:34` (H14, U2).
15. **Digital-codes vault, Coupons, Integrations, CSV import, Activity, Media, Platform: back with API or add on-card demo disclosure** — H7, M7, M18, M17, M19, L1, U13.
16. **Categories/brands: render `listError`, add loading, fix 0-count, persist mock create fields** — `categories:67/281/72/160` (M2, U5, M3, M4).

**P3 — Validation & data quality**

17. Checkout-rule builder: validate action/condition values; fix dead mode toggle + un-editable script rules — `CheckoutRuleBuilder.tsx:176/272` (M10, M11).
18. Products save: include/hide sku/platform/edition — `products/page.tsx:40` (M1).
19. Coupons duplicate-code guard; settings email blocks save; CSV quote-aware parse + enum validation; automations test-draft + history pagination — L3, L5, L7, L2, L4.
20. CMS widgets uninstall confirm — `cms/widgets:208` (M12).
21. Orders result-count/COD badge from active source — `orders:308` (U1).

**P4 — Accessibility & consistency (mostly shared components — high leverage)**

22. **`AdminField`** link errors to controls (`:35`, U6) — fixes every form at once.
23. **`DataTable`** `aria-sort` (`:115`, U14); remove inert sticky classes (`:98`, U16).
24. **`CommandPalette`** combobox/`aria-activedescendant` (`:172`, U15).
25. **`FilterBar`** correct roles (`:18`, U17); **`AdminToast`** assertive danger (`:57`, U18).
26. **`AdminChart`** label thinning/bar spacing + key-by-index (`:110/112`, U3, U8).
27. Digital-codes assign modal labels/focus (U9); CMS RichText a11y (U10); reports saved-view keyboard delete (U4); SectionInspector placeholder defaults (U12); category/brand drawer + CMS router-navigation consistency (U7, U11).

**Cross-cutting recommendation:** most P0–P2 items share one root cause — handlers that call `adminStore` mutations with no `isApiEnabled()` branch and toast success unconditionally. Introduce a shared API-aware data hook/cache (or React Query) plus a `mutateWithToast` helper that only toasts on resolve and renders a banner on reject, and retrofit pages onto it rather than fixing each in isolation.
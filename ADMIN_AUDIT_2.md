# Admin Panel Re-Audit — Functional + UI (2026-07-24)

Multi-agent audit of all 32 admin routes (post P0/coupons/uploads work). 14 reviewers (10 functional page-groups + 4 UI/UX lenses); every finding adversarially verified against the code before inclusion. Verification was cut short by a session limit, so this is a **lower bound** — a few groups (products-inventory, customers-team, settings-tools, cms-media, automations-integrations) had verifiers drop out; their un-reconfirmed findings are not listed here.

**Confirmed: 40** — 8 high, 20 medium, 12 low. By type: 5 mock-unlabeled, 20 functional, 12 ui, 3 missing.

> Note: some findings below are duplicates raised by different reviewers (e.g. the preorders and checkout-rules issues). They are grouped when fixing.

## HIGH

### Report detail pages present local demo data as real (and label it "live") with no demo banner in API mode
- **Type:** mock-unlabeled · **Page:** `admin/reports/[report]` · **Where:** `src/app/admin/reports/[report]/page.tsx:101`
- **Defect:** The reports subsystem is 100% local-derived: useAdminStore (src/hooks/useAdminStore.ts) reads adminStore.ts, which is seeded + localStorage only and is never hydrated from the API (adminStore.ts has no fetch/api.* anywhere). deriveReport(store, ...) ([report]/page.tsx:39-47) builds every KPI, chart, table row, and the CSV export from that local store. There are NO report/analytics/dashboard endpoints — confirmed by grepping apiClient.ts (only exportCatalog -> /admin/export) and routes/api.php (only /admin/export, /admin/import). The HUB page honestly warns in API mode via AdminNotice tone="demo" (src/app/admin/reports/page.tsx:19-23, 'Reports are derived from local demo data — not your live server data yet'). The DETAIL page renders NO such banner anywhere (src/app/admin/reports/[report]/page.tsx:101-206 return block; grep for AdminNotice/demo in src/app/admin/reports and src/components/admin/reports finds it only on the hub; there is no reports/layout.tsx). Worse, derive.ts affirmatively labels this local demo data as live: 'Ops queue · live' (derive.ts:114), 'Live pre-order holds' (:115), 'Live customer book' (:258), 'CRM profile count is live' (:284), 'Stock levels are live snapshots' (:338). A merchant deep-linking to /admin/reports/sales, /orders, /inventory, or /tax-gst sees fabricated numbers with no indication they are not their real server data.
- **User impact:** In production (API mode) an admin viewing any report detail page, or exporting its CSV (filename ezurr-<report>-<range>.csv), sees seed/demo figures — sales, AOV, GST readiness, inventory, customers — presented as real and explicitly annotated 'live', with no honest demo label. Business/tax decisions could be made on fabricated data.

### Batch-release preorders does not persist in API mode (local-write-in-API-mode)
- **Type:** functional · **Page:** `admin/preorders` · **Where:** `src/app/admin/preorders/page.tsx:142`
- **Defect:** The entire preorders page has zero API integration — it never imports `api` or `isApiEnabled` (verified: grep for isApiEnabled/api./apiClient in the file returns nothing). `batchReady()` (lines 137-149) calls `markPreordersReady(selected)` (adminStore.ts:1196), which only mutates the local adminStore, then unconditionally toasts `Released N holds · stock allocated` (lines 143-146). There is no API branch. Confirmed there is no preorder method in apiClient.ts and no preorder route in routes/api.php (only GET /admin/orders, GET /admin/orders/{id}, PATCH /admin/orders/{id}/status exist). In production (API mode) clicking 'Release & allocate' or 'Batch release' changes nothing on the server yet reports success.
- **User impact:** Admin selects preorder holds, confirms the release dialog, sees a green 'Released · stock allocated' toast, but the orders are never moved to Confirmed and no stock is allocated on the backend. Silent data loss.

### Preorders page renders local seed data as real, with no demo label, in API mode
- **Type:** mock-unlabeled · **Page:** `admin/preorders` · **Where:** `src/app/admin/preorders/page.tsx:30`
- **Defect:** All three data sources on the page read exclusively from the local adminStore with no isApiEnabled branch: `preorderOrders` = store.orders filtered by status preorder (lines 30-41), `catalogPreorders` = store.products where category==='preorders' (lines 43-46), and `holdsByTitle` groups store.orders/store.products (lines 48-63). Because no code path ever fetches from api.adminOrders (and no preorder endpoint exists), in production this page shows stale localStorage seed orders/products as though they were live, with no 'demo' or 'sample data' indicator. The holds count, catalog list, and 'N on hold' groupings are all fabricated relative to the real database.
- **User impact:** Admin views the Pre-orders screen in production and sees seed/sample orders and catalog rows presented as genuine pending holds; real backend preorders are never shown.

### Editing a coupon silently wipes maxDiscount, per-customer limit, description, first-order-only, and category/brand scope in API mode
- **Type:** functional · **Page:** `admin/coupons` · **Where:** `src/app/admin/coupons/page.tsx:197`
- **Defect:** CouponRow (lines 24-35) and apiToRow (lines 37-50) only carry id/code/discountType/value/minOrder/starts/ends/usedCount/usageLimit/active. They DROP the six fields the ApiCoupon type actually returns: description, maxDiscount, perCustomerLimit, firstOrderOnly, categorySlug, brandSlug (see apiClient.ts ApiCoupon, lines 132-150). Consequently openEdit()'s API branch (lines 161-179) hardcodes maxDiscount:"", perCustomerLimit:"", description:"", firstOrderOnly:false, categorySlug:"", brandSlug:"" because it has no source values to load. handleSave() then always builds a FULL payload including those emptied fields (lines 192-207: maxDiscount->null, perCustomerLimit->null, description->null, firstOrderOnly->false, categorySlug->null, brandSlug->null) and sends it via api.updateCoupon (apiClient.ts:395, PUT /admin/coupons/{code}, route api.php:82). The Laravel controller writes every key that is PRESENT in the payload: toColumns() uses array_key_exists (CouponController.php lines 112-116) and update() calls $coupon->update($this->toColumns(...)) (update method). Since these keys are always present (as null/false), the server overwrites the stored values. Any admin opening Edit on a coupon that had a discount cap, per-customer limit, first-order restriction, or category/brand scope, then saving even an unrelated change, destroys those settings.
- **User impact:** The edit drawer misrepresents the coupon (shows 'No cap', 'Unlimited', unchecked first-order, 'Any category' regardless of stored values), and saving from it permanently erases the coupon's discount cap, per-customer limit, description, first-order flag, and category/brand scope on the server. Data loss on every edit.

### Pause/Enable toggle on the rules list only mutates localStorage in API mode (local-write-in-API-mode)
- **Type:** functional · **Page:** `admin/checkout-rules` · **Where:** `src/app/admin/checkout-rules/page.tsx:299`
- **Defect:** The list-row Pause/Enable button onClick (lines 296-305) calls toggleCheckoutRule(rule.id, !rule.enabled) and immediately setToast('Paused'/'Enabled'). toggleCheckoutRule (adminStore.ts:2018-2025) is a pure localStorage mutation with no network call. There is NO isApiEnabled() branch here and no api.* call, even though the endpoint exists and the rules already have valid server ids: api.upsertCheckoutRule would PUT /admin/checkout-rules/{publicId} with the enabled flag (apiClient.ts:415-424; route api.php:61; controller CheckoutRuleController::update writes 'enabled'). Contrast the drawer's saveRule() (lines 106-127), which DOES branch to api.upsertCheckoutRule. So enabling/disabling from the drawer persists, but the far more common inline toggle does not.
- **User impact:** In production (API mode) clicking Pause or Enable shows a success toast but the change is written only to the browser's localStorage; the server rule keeps its old enabled state and the storefront keeps applying (or not applying) the rule. On reload from another device/browser the toggle appears to have done nothing.

### 'Use template' save writes only to localStorage in API mode; the rule never reaches the server (local-write-in-API-mode)
- **Type:** functional · **Page:** `admin/checkout-rules/templates` · **Where:** `src/app/admin/checkout-rules/templates/page.tsx:198`
- **Defect:** The CheckoutRuleBuilder onSave handler (lines 197-202) calls upsertCheckoutRule({ ...rule, id: rule.id || `cr-${Date.now()}` }) — the adminStore localStorage mutation (adminStore.ts:1991) — then toasts 'Rule saved from template' and router.push()es to /admin/checkout-rules. This file never imports isApiEnabled or api at all (imports only upsertCheckoutRule from adminStore, line 9), so there is no API path whatsoever. The correct pattern exists on the main page (checkout-rules/page.tsx saveRule, lines 106-127) which calls api.upsertCheckoutRule (POST /admin/checkout-rules, apiClient.ts:415-424, route api.php:60, controller store()). Because it assigns a client-side `cr-...` id, the rule is also created as if pre-existing rather than a clean server POST. The rule only appears afterward on the rules list because that page merges API results into the same local store (page.tsx:71-82 upserts, does not replace), masking the failure until a fresh load on a device without the localStorage entry.
- **User impact:** In production, creating a checkout rule from any template appears to succeed (toast + redirect, rule visible in the list) but is never persisted to the backend. The rule silently vanishes on another device or after localStorage is cleared, and the storefront never applies it.

### Saving a checkout rule from a template never persists to the server (API mode)
- **Type:** functional · **Page:** `admin/checkout-rules/templates` · **Where:** `ezurr-theme/src/app/admin/checkout-rules/templates/page.tsx:198`
- **Defect:** The onSave handler for the CheckoutRuleBuilder here calls only `upsertCheckoutRule({ ...rule, id: rule.id || `cr-${Date.now()}` })` (adminStore, localStorage-only) and never calls `api.upsertCheckoutRule`, with no `isApiEnabled()` branch. Contrast the main list page (src/app/admin/checkout-rules/page.tsx:106-127 `saveRule`) which explicitly branches: in API mode it awaits `api.upsertCheckoutRule(rule)`. Checkout-rules HAVE full CRUD API (routes/api.php:59-62). So a rule created from a template is written to local store only; it is then shown because the list page seeds local store from the API on mount, giving the illusion it saved. This is the [local-write-in-API-mode] bug class.
- **User impact:** Admin picks a template, edits, clicks Save; sees 'Rule saved from template' and the rule appears in the list — but in production it was never written to the backend and vanishes/never applies at checkout for other sessions or after cache clear.

### Pause/Enable toggle on a checkout rule does not persist in API mode
- **Type:** functional · **Page:** `admin/checkout-rules` · **Where:** `ezurr-theme/src/app/admin/checkout-rules/page.tsx:299`
- **Defect:** The row Pause/Enable button calls `toggleCheckoutRule(rule.id, !rule.enabled)` (adminStore, local-only, defined adminStore.ts:2018) with no API call. On the same page, `saveRule` (108-121) and the delete ConfirmDialog (353-355) both branch on `isApiEnabled()` and call `api.upsertCheckoutRule` / `api.deleteCheckoutRule`. The enabled flag is a persisted column the PUT endpoint accepts, but toggling it here bypasses the API entirely.
- **User impact:** Admin pauses/enables a rule, sees the 'Paused'/'Enabled' toast and the badge flips locally, but the storefront/back-end never learns the rule was disabled — the rule keeps (or stops) applying opposite to what the UI shows until the next full save.

## MEDIUM

### Dashboard swallows API load failures with no error or loading state
- **Type:** functional · **Page:** `admin` · **Where:** `src/app/admin/page.tsx:60`
- **Defect:** In API mode (apiOn), loadData (page.tsx:39-63) fetches api.adminOrders and api.adminProducts (both real GET routes: routes/api.php:85 and :66). Any rejection is caught by an empty catch at page.tsx:60 (`catch { /* keep whatever we already have */ }`): the error is never stored in state, no error banner is rendered anywhere on the page, and there is no loading indicator. apiOrders/apiProducts start as [] on mount (page.tsx:36-37). So if the API is unreachable or errors, the dashboard renders bookedSales ₹0, 0 orders in period, the green 'All clear — no COD backlog, low stock, or release holds' state (page.tsx:157), and empty Low-stock/Recent-orders lists — visually identical to a healthy empty store. Unlike the Settings page (settings/page.tsx:131 surfaces 'Not saved: ...') and the Analytics/Activity pages (which carry demo notices), the dashboard gives the admin zero signal that data failed to load.
- **User impact:** On an API outage or error the 'needs attention' dashboard silently shows all zeros and 'All clear', so an admin can miss a real COD backlog, low-stock, or release-hold situation and has no indication the figures are stale or that loading failed.

### Stock adjustment swallows API errors and closes modal as if it succeeded
- **Type:** functional · **Page:** `admin/inventory` · **Where:** `ezurr-theme/src/app/admin/inventory/page.tsx:156`
- **Defect:** In applyAdjust (lines 147-162), the API branch does `void apiUpdateProduct(adjustKey, { stock: nextStock }).then(() => loadProducts()).catch(() => undefined)` and then unconditionally runs `setAdjustKey(null)` to close the modal. The `.catch(() => undefined)` discards the error, and the inventory page has NO banner/toast/error state at all (no useAutoBanner import, no error useState). If the PUT fails (network, 403 from EnsureStaffCan products.write, validation), the modal closes with no message and the stock badge is unchanged, so the admin believes the adjustment was applied. The endpoint PUT /admin/products/{key} exists (routes/api.php:68) and accepts a partial {stock} body (ProductController::update uses 'sometimes'), so the call is shaped correctly; the defect is purely the swallowed rejection.
- **User impact:** A failed +/- Qty adjustment gives zero feedback and the dialog closes as if it worked; the admin walks away thinking stock was changed when it was not.

### Digital-code assignment does not persist in API mode (local-write-in-API-mode)
- **Type:** functional · **Page:** `admin/orders/[id]` · **Where:** `src/app/admin/orders/[id]/page.tsx:358`
- **Defect:** The Assign button in the Digital fulfillment section (lines 356-365) calls `assignDigitalCodeToOrder(code.id, order.id)` (adminStore.ts:901) and then `setSavedMsg('Code assigned to order')` with no isApiEnabled() branch. The available/assigned code lists themselves are read from the local store (`assignedCodes` line 148, `availableForLines` line 149 = store.digitalCodes), never from the API. Confirmed there is no assignDigitalCode method in apiClient.ts and no digital-codes route in routes/api.php. The section still renders in API mode because mapApiOrderToAdmin sets item.fulfillmentType from the API's fulfillment_type (apiMappers.ts:152-153), so any order with a digital line shows this UI. Assigning a code mutates only localStorage and toasts success; the assignment is never sent to the backend.
- **User impact:** On an order with digital line items, admin assigns a vault code and sees 'Code assigned to order', but nothing is persisted server-side — the code stays unassigned in the real system.

### Orders list API load error is captured but never rendered
- **Type:** ui · **Page:** `admin/orders` · **Where:** `src/app/admin/orders/page.tsx:135`
- **Defect:** `listError` is declared (line 135) and set on fetch failure (`setListError(err.message)` line 161, cleared on success line 157), but it is never referenced in the JSX — grep for `listError` in the file returns only lines 135/157/161, no render. When api.adminOrders() throws, the catch sets apiOrders=[] (line 160) and listError, so the DataTable simply shows its generic `emptyMessage="No orders match this filter."` (line 483) with no indication that loading failed.
- **User impact:** If the orders API is down or returns an error, the admin sees an empty 'No orders match this filter' table indistinguishable from a genuinely empty result — the actual error is swallowed.

### Brand Delete button is dead in local (non-API) mode
- **Type:** functional · **Page:** `admin/brands` · **Where:** `src/app/admin/brands/page.tsx:156`
- **Defect:** handleDelete begins with `if (!editing?.slug) return;` (brands/page.tsx:156). This guard runs BEFORE the apiOn branch. Local brand records come from store.brands when apiOn is false (page.tsx:66), and AdminBrandRecord is typed `{id, name, active}` with no slug (src/data/admin.ts:21-25); createBrand also produces no slug (src/lib/adminStore.ts:1049-1057). So in local mode editing.slug is always undefined, the guard returns immediately — window.confirm (line 158) never fires and the local-mode `deleteBrand(editing.id)` call (line 169) is unreachable dead code. Delete only works in API mode. The Categories page does NOT have this bug: its handleDelete keys off editing.key (categories/page.tsx:179,187), which local category records do have.
- **User impact:** In localStorage/demo mode (NEXT_PUBLIC_API_URL unset) clicking Delete on a brand does absolutely nothing — no confirmation prompt, no removal, no feedback.

### Brand save/delete API errors render behind the modal drawer and are invisible
- **Type:** ui · **Page:** `admin/brands` · **Where:** `src/app/admin/brands/page.tsx:256`
- **Defect:** On an API failure, handleSave (.catch at brands/page.tsx:140) and handleDelete (.catch at line 166) set listError and leave the drawer OPEN (closeDrawer is only called inside .then). listError is rendered by <AdminNotice> in the page body at line 256, but AdminDrawer is a full-screen `fixed inset-0 z-50` overlay with a 35% dimming + 2px-blur backdrop over the whole page (components/admin/AdminDrawer.tsx:72-75). There is no error region inside the drawer form. So a failed brand create/edit/delete surfaces its error only behind the dimmed/blurred overlay where the user (focused in the drawer) cannot see it.
- **User impact:** When a brand save or delete fails in production (API mode — e.g. duplicate name, or the 422 'brand still has products' from BrandController::destroy), the drawer just stays open with no visible reason; the action silently appears to do nothing.

### Category save/delete API errors render behind the modal drawer and are invisible
- **Type:** ui · **Page:** `admin/categories` · **Where:** `src/app/admin/categories/page.tsx:282`
- **Defect:** Same defect as the brands page. handleSave (.catch at categories/page.tsx:157) and handleDelete (.catch at line 184) set listError while leaving the drawer OPEN (closeDrawer only runs in .then). listError is rendered via <AdminNotice> in the page body at line 282, which sits behind the full-screen dimming/blurring AdminDrawer overlay (components/admin/AdminDrawer.tsx:72-75). No error is shown inside the drawer form itself.
- **User impact:** When a category save/delete fails in API mode (e.g. B:CategoryController::destroy returns 422 'Cannot delete a category that still has products', or a duplicate slug on create), the user sees the drawer stay open with no visible error and cannot tell why the change did not persist.

### Rule delete is optimistic with an unconditional success toast; API failure is barely surfaced
- **Type:** functional · **Page:** `admin/checkout-rules` · **Where:** `src/app/admin/checkout-rules/page.tsx:350`
- **Defect:** The delete ConfirmDialog onConfirm (lines 350-358) calls deleteCheckoutRule(deleteId) (adminStore.ts:2011, local removal) FIRST, then fires api.deleteCheckoutRule(deleteId).catch(() => setApiSync('err')) without awaiting it, and unconditionally setToast('Rule deleted'). The success toast is shown before/independent of the server result, and on server failure the row is already gone from the local store while it still exists server-side — the only signal is the small 'Laravel synced' chip flipping to the generic error banner (lines 166-170). Delete IS wired to the API (unlike findings 2 and 3), so this is an error-handling/ordering defect rather than a missing call: the user is told the delete succeeded even when it did not, and the UI diverges from the backend (the rule reappears on the next api.checkoutRules() load).
- **User impact:** If the DELETE request fails, the admin still sees 'Rule deleted' and the row disappears, but the rule remains active on the server and re-appears on reload — a confusing, misleading success state.

### Checkout rule 'Script' condition mode is unreachable from the builder UI
- **Type:** functional · **Page:** `admin/checkout-rules` · **Where:** `ezurr-theme/src/components/admin/CheckoutRuleBuilder.tsx:272`
- **Defect:** The condition-mode switcher maps over the literal array `(['rows'] as CheckoutConditionMode[])`, so only a single 'Row conditions' button renders. The script-mode editor (288-317) and `evalCheckoutScript` preview are fully implemented and the data model supports `conditionMode: 'script'`, but there is no control to switch a rule INTO script mode. Worse, if a rule already has script mode (e.g. from seeded data), the lone visible button is 'Row conditions' and clicking it sets mode back to 'rows', discarding the script with no way to return.
- **User impact:** Admins cannot author script-based checkout conditions at all, and can accidentally destroy an existing script rule by clicking the only mode button. A shipped feature is dead/half-wired in the UI.

### Invite staff and Revoke seat have no visible effect in API mode
- **Type:** ui · **Page:** `admin/team` · **Where:** `ezurr-theme/src/app/admin/team/page.tsx:324`
- **Defect:** The table renders `displaySeats = apiOn ? apiSeats : seats` (line 113). But the invite form onSubmit (321-338) prepends to the local `seats` state via `setSeats`, and the revoke ConfirmDialog onConfirm (377-385) also mutates `seats` via `setSeats`. Neither touches `apiSeats`. So when the API is enabled, both actions fire their toasts ('Invite queued', 'Seat revoked (mock)') while the rendered list (`apiSeats`) is never updated. The role-change dropdown (145-165) is correctly branched to `api.updateTeamMember`, which highlights the omission.
- **User impact:** In production an admin invites a teammate or revokes a seat, gets a success toast, but the staff table shows no new/changed row — the action appears to silently do nothing.

### Pre-orders page shows local seed orders and releases them locally, ignoring the API
- **Type:** mock-unlabeled · **Page:** `admin/preorders` · **Where:** `ezurr-theme/src/app/admin/preorders/page.tsx:32`
- **Defect:** The page reads `store.orders` and `store.products` (localStorage seed) with no `isApiEnabled()` branch (30-63), and the batch-release action calls `markPreordersReady(selected)` (adminStore, local-only) at line 142. Orders are otherwise served by the API (see orders/page.tsx and orders/[id]/page.tsx which fetch `api.adminOrders`). So in API mode this page displays stale local seed orders as if they were the live pre-order hold queue, and 'Release & allocate' updates only localStorage. There is no honest demo banner, unlike customers, digital-codes, analytics, reports, and activity which all render an AdminNotice tone="demo" in API mode.
- **User impact:** In production, the pre-orders queue is fabricated (seed data), and releasing holds toasts 'Released N holds · stock allocated' while nothing happens on the server — real pre-orders are neither shown nor released.

### CMS Pages and Widget marketplace persist only to localStorage with no honest label
- **Type:** mock-unlabeled · **Page:** `admin/cms` · **Where:** `ezurr-theme/src/app/admin/cms/page.tsx:58`
- **Defect:** There is no CMS API anywhere in routes/api.php. The Pages screen (createCmsPage:58, publishCmsPage:132/144, deleteCmsPage:168, duplicateCmsPage:155) and the Widget marketplace (src/app/admin/cms/widgets/page.tsx: installCmsWidget:184, uninstallCmsWidget:209, createCustomCmsWidget:134) all mutate adminStore (localStorage) only and toast 'Page created'/'Published'/'Installed'. The PageBuilder 'Publish' (src/components/admin/cms/PageBuilder.tsx:394) is likewise local-only. Notably the sibling Custom Code page (src/app/admin/cms/code/page.tsx:48) DOES label itself ('Custom code saved to local store') — so the missing label on Pages/Widgets is inconsistent.
- **User impact:** In production a merchant builds/publishes storefront pages and installs widgets, sees success toasts, but nothing reaches a server — all CMS work lives only in that one browser's localStorage and is presented as real published content.

### Orders list API error is captured but never rendered
- **Type:** missing · **Page:** `admin/orders` · **Where:** `src/app/admin/orders/page.tsx:161`
- **Defect:** The fetch effect declares `listError` (line 135) and sets it in the catch on API failure (line 161), clearing it on success (line 157). But `listError` is never referenced anywhere in the returned JSX (grep confirms zero render sites). On failure the code also does `setApiOrders([])`, so the DataTable simply shows `emptyMessage="No orders match this filter."`. This is the 'error computed but never rendered' class: there is no AdminNotice/alert path for the failure.
- **User impact:** When the orders API is down or returns an error in production (API mode), the admin sees an empty table labeled 'No orders match this filter' with no indication that a load actually failed — indistinguishable from a store that genuinely has no matching orders.

### Products list API error is captured but never rendered
- **Type:** missing · **Page:** `admin/products` · **Where:** `src/app/admin/products/page.tsx:151`
- **Defect:** Same defect as orders: `listError` is declared (line 126), set in the catch (line 151) and cleared on success (line 148), but it is never rendered in JSX (confirmed no render site). On error `setApiProducts([])` runs, so the DataTable falls through to `emptyMessage="No products match this filter."` with an Add-product CTA.
- **User impact:** A products API failure in API mode is silently shown as an empty catalog with an 'Add product' prompt — the admin gets no error state and may believe the catalog is empty.

### Sidebar highlights two nav items at once on CMS sub-routes
- **Type:** ui · **Page:** `admin/cms (Online store nav group)` · **Where:** `src/components/admin/AdminShell.tsx:464`
- **Defect:** `isActive` (lines 463-466) treats a route as active when `pathname === href || pathname.startsWith(href + '/')`. In the 'Online store' submenu (nav defs lines 431-433) 'Pages' points to `/admin/cms`, 'Widgets' to `/admin/cms/widgets`, 'Custom code' to `/admin/cms/code`. Because `/admin/cms` is a prefix of the others, visiting `/admin/cms/widgets` or `/admin/cms/code` marks BOTH the parent 'Pages' item and the actual item as active (white pill). The breadcrumb `pageTitles` list avoids this via ordered matching, but the nav does not.
- **User impact:** On the Widgets and Custom-code pages the sidebar shows two simultaneously 'active' items, so the highlighted location is ambiguous/wrong.

### Product create/save submit button never disables while the API call is in flight
- **Type:** functional · **Page:** `admin/products` · **Where:** `src/components/admin/ProductForm.tsx:291`
- **Defect:** ProductForm's submit button (lines 291-296) is a plain `type="submit"` with no `disabled`/pending state, and the form keeps no `isSubmitting` state. The parent `handleSave` in products/page.tsx is async and awaits `apiCreateProduct`/`apiUpdateProduct` (lines 259-338) before closing the drawer; nothing disables the button during that await. Repeated clicks re-fire `handleSubmit` → `onSubmit` → another API create/update.
- **User impact:** In API mode, double-clicking 'Create product' / 'Save changes' (or clicking again during a slow request) fires duplicate create/update calls — duplicate products or racing saves — with no in-flight/disabled feedback.

### Product save API errors are shown in a green 'success' banner
- **Type:** ui · **Page:** `admin/products` · **Where:** `src/components/admin/ProductForm.tsx:130`
- **Defect:** On API failure, products/page.tsx `handleSave` calls `setToast("Could not create product: ...")` / `setToast("Could not save product: ...")` (lines 283-285, 333-335) and passes it as `toastMessage` to ProductForm. ProductForm renders any non-empty `toastMessage` in a single green success-styled box (`border-[#A6D5B0] bg-[#EAF6ED] text-[#2D6B3C]`, lines 130-134) with no tone branching. Failure text is therefore styled identically to success.
- **User impact:** A failed create/save renders 'Could not create product…' inside a green success banner, so the admin can misread a failure as a successful save.

### CMS Pages table has no mobile horizontal-scroll handling
- **Type:** ui · **Page:** `admin/cms` · **Where:** `src/app/admin/cms/page.tsx:71`
- **Defect:** The pages table is wrapped in `overflow-hidden` with a `w-full` table (lines 71-72) carrying 5 columns — Page, Path, Status, Updated (a long `toLocaleString('en-IN')` timestamp), and an Actions cell with up to four buttons (Edit / Publish-Unpublish / Duplicate / Delete). Unlike the shared DataTable, which wraps in `overflow-x-auto` with `min-w-[640px]` (DataTable.tsx line 96-97), this table provides no horizontal scroll affordance and no `hideOnMobile` columns, and the surrounding `overflow-hidden` clips overflow instead of scrolling.
- **User impact:** On a phone-width viewport the CMS Pages table is severely cramped/wrapped with content clipped and no way to scroll to the right-hand columns/actions.

### Pre-orders reads local seed data and 'Release' never persists in API mode; page is unlabeled
- **Type:** functional · **Page:** `admin/preorders` · **Where:** `src/app/admin/preorders/page.tsx:142`
- **Defect:** The page derives all holds from `useAdminStore().orders` (lines 30-63) and `batchReady`/`markPreordersReady` (lines 137-149) mutate only the local adminStore, then toast success — there is no `isApiEnabled()` branch, unlike the sibling Orders page which loads from `api.adminOrders`. So in API mode this page shows local seed orders (not the real order book) and the 'Release & allocate' confirm updates nothing on the server. It also carries no demo/Phase2 label, unlike Customers which renders an AdminNotice demo banner in API mode.
- **User impact:** In production (API mode) pre-order holds shown here are stale local seed data presented as real, and releasing holds silently fails to persist while still toasting 'Released … stock allocated'.

### Command palette keyboard selection doesn't scroll into view and lacks combobox semantics
- **Type:** ui · **Page:** `admin (global CommandPalette)` · **Where:** `src/components/admin/CommandPalette.tsx:137`
- **Defect:** Arrow Up/Down only update the `active` index (lines 137-144); there is no ref or `scrollIntoView` on the active option. The list can hold up to 28 results in a `max-h-[360px]` scroll container (line 185), so arrowing past the visible area moves the highlighted item off-screen with no scroll follow. Additionally the input has `aria-autocomplete="list"`/`aria-controls` but no `role="combobox"` and no `aria-activedescendant` pointing at the active option, so assistive tech is not told which item is selected.
- **User impact:** Keyboard users lose sight of the highlighted result when navigating a long result set, and screen-reader users are not told which option is active as they arrow through the palette.

## LOW

### Dashboard low-stock threshold reads local store settings, not the API, in API mode
- **Type:** functional · **Page:** `admin` · **Where:** `src/app/admin/page.tsx:118`
- **Defect:** The low-stock threshold (page.tsx:118, `store.settings.lowStockThreshold ?? 5`) driving the 'Catalog pulse' low-stock count (page.tsx:214) and the alerts feed (page.tsx:73 -> getDerivedAlerts -> adminStore.ts:1254) is read from useAdminStore (localStorage seed, default 5). Even in API mode the dashboard never calls api.adminSettings(), and there is no global settings hydration in the admin layout (confirmed: no api.adminSettings/updateSettings call in app/admin/layout.tsx or components/admin). lowStockThreshold IS API-backed: SettingController.php:39 validates it, and settings/page.tsx saves it via api.updateAdminSettings (line 129) and hydrates the local store from api.adminSettings() on mount (lines 98-112). Because the dashboard depends on that Settings-page hydration to sync the local store, a fresh session that lands on the dashboard first computes low-stock counts and alerts against the seed default (5) rather than the admin-configured value.
- **User impact:** The dashboard's low-stock 'needs attention' alerts and low-stock SKU count can be computed against the default threshold (5) instead of the value the admin configured in Settings, until the Settings page is opened to sync local state.

### Orders list result count and COD badge read local store in API mode
- **Type:** ui · **Page:** `admin/orders` · **Where:** `src/app/admin/orders/page.tsx:315`
- **Defect:** In API mode `rows` is correctly derived from `apiOrders` (line 176), but two adjacent UI figures still read the local store: the toolbar `resultLabel={`${rows.length} of ${store.orders.length}`}` (line 315) uses the local `store.orders.length` as the denominator, and `pendingCod` (lines 303-305) counts COD/pending from `store.orders` to drive the 'COD · N' quick-filter badge (lines 375-387). Both should use apiOrders in API mode; instead they reflect the stale localStorage seed count.
- **User impact:** The 'X of Y' total and the red COD count badge show numbers from local seed data rather than the real order book, so they are wrong/misleading in production.

### Order detail Timeline is always empty in API mode
- **Type:** ui · **Page:** `admin/orders/[id]` · **Where:** `src/lib/apiMappers.ts:169`
- **Defect:** The order detail page renders `<OrderTimeline events={order.timeline} />` (page.tsx:382), but `mapApiOrderToAdmin` hardcodes `timeline: []` (apiMappers.ts:169) — it never maps any status-history/audit events from the API response. So for every API-loaded order the Timeline section shows an empty timeline regardless of the order's actual history (the backend does write AuditLog rows on status changes, but the mapper ignores them and the /admin/orders/{id} response is not surfaced into timeline). Half-wired feature in API mode.
- **User impact:** In production the order Timeline panel is permanently empty for all orders, giving no fulfillment history even though status changes did occur.

### 'Active in filters' checkbox is ignored when creating in local mode
- **Type:** functional · **Page:** `admin/categories` · **Where:** `src/app/admin/categories/page.tsx:161`
- **Defect:** In Add mode the drawer shows an 'Active in filters' checkbox (categories/page.tsx:365-373; brands 316-324). In local (non-API) mode, handleSave calls createCategory({ label, description, key }) at categories/page.tsx:161 — the `active` state is never passed, and createCategory/createBrand hardcode active:true (adminStore.ts:1008-1023 and 1049-1057; createBrand only takes a name at brands/page.tsx:144). So a user who unchecks Active before creating gets an active record anyway. API mode correctly forwards `active` (categories:132, brands:117), so this is local/demo-mode only.
- **User impact:** In localStorage/demo mode, unchecking 'Active in filters' while creating a category or brand has no effect — the record is always created active.

### Stock adjustment in API mode fails silently and gives no confirmation
- **Type:** functional · **Page:** `admin/inventory` · **Where:** `ezurr-theme/src/app/admin/inventory/page.tsx:156`
- **Defect:** `applyAdjust` (147-162) in API mode calls `apiUpdateProduct(adjustKey, { stock: nextStock }).then(() => loadProducts()).catch(() => undefined)` and then synchronously `setAdjustKey(null)` closes the panel optimistically (157) before the request resolves. There is no success toast, and the `.catch(() => undefined)` swallows any error with no user-facing message (errors computed-but-never-rendered class).
- **User impact:** If the stock PUT fails (permission, network, validation), the adjustment panel closes as if it worked; the admin gets no feedback and the stock number silently never changes.

### Customer detail performs write actions with success toasts but omits the demo banner its list page shows
- **Type:** mock-unlabeled · **Page:** `admin/customers` · **Where:** `ezurr-theme/src/app/admin/customers/[id]/page.tsx:65`
- **Defect:** This page mutates local store via `updateCustomer` for status/VIP/ban (setStatus:65-71), tag add/remove (170-193) and notes (saveNotes:73-77), each with a success banner. There is no customers admin API (no route in routes/api.php), and the list page (src/app/admin/customers/page.tsx:112-116) renders an AdminNotice 'Customer data here is a local demo — not backed by the API yet.' The detail page has no such notice despite being where all the write actions live.
- **User impact:** An admin banning a customer or saving notes on the profile page sees a success message with no indication these changes are local-only and never reach the backend.

### CSV import writes only to localStorage even though a real /admin/import API exists
- **Type:** functional · **Page:** `admin/tools/import` · **Where:** `ezurr-theme/src/app/admin/tools/import/page.tsx:50`
- **Defect:** `importProducts` (38-95) and `importCodes` (97-136) both mutate state via `setAdminState` (localStorage) with no `isApiEnabled()` branch, even though `api.importCatalog` and the `/admin/import` route (routes/api.php:90) exist and `apiClient.ts` exposes `importCatalog`. The page header text ('validates against the mock store') partially discloses this, so it is lower severity, but the real import endpoint is never used.
- **User impact:** In production a bulk CSV upload reports 'Imported N rows' and updates the on-screen local store, but the catalog/vault on the server is untouched.

### Products support create and update but there is no delete anywhere
- **Type:** missing · **Page:** `admin/products` · **Where:** `ezurr-theme/src/app/admin/products/page.tsx:469`
- **Defect:** The products list actions column (469-482) offers only View and Edit; the drawer (676-726) and full editor expose no delete. A repo-wide search finds no product delete handler, and routes/api.php only defines POST and PUT for products (67-68) — no DELETE route. So the entire product surface is missing the delete leg of CRUD, both UI and API.
- **User impact:** Admins can never remove a mistakenly-created or discontinued SKU from the catalog; the only workaround is unpublishing.

### Orders list total count and COD quick-filter badge read local seed data in API mode
- **Type:** ui · **Page:** `admin/orders` · **Where:** `ezurr-theme/src/app/admin/orders/page.tsx:315`
- **Defect:** The ListToolbar resultLabel is `${rows.length} of ${store.orders.length}` (315) and the COD pill count `pendingCod` (303-305) is computed from `store.orders`, but the rendered rows come from `apiOrders` in API mode (source selected at 176). So the 'of N' denominator and the 'COD · N' badge reflect the local seed order set, not the live API order book.
- **User impact:** In production the orders header shows an inconsistent total (e.g. '20 of 8') and a COD-pending badge count that does not match the real orders shown.

### Settings fire an API write on every keystroke with no debounce
- **Type:** functional · **Page:** `admin/settings` · **Where:** `ezurr-theme/src/app/admin/settings/page.tsx:226`
- **Defect:** Every text field calls `patch({...})` on each onChange (e.g. storeName:226, city:233, supportEmail:245, gstin:273), and `patch` (114-136) issues `api.updateAdminSettings(payload)` in API mode. Typing a store name thus fires one PUT per character, racing responses and flashing the 'Saved just now' banner repeatedly; last-write-wins ordering is not guaranteed. Additionally the email field still calls `patch` even when `emailError` is set (243-251), so invalid emails are sent to the server.
- **User impact:** Heavy redundant network traffic and potential out-of-order/partial saves while editing settings; invalid email values can be persisted despite the inline error.

### Inconsistent destructive-confirm pattern: native window.confirm vs ConfirmDialog
- **Type:** ui · **Page:** `admin/cms, admin/brands, admin/categories` · **Where:** `src/app/admin/cms/page.tsx:167`
- **Defect:** Delete/discard confirmations use the browser-native `window.confirm` in cms/page.tsx (line 167), brands/page.tsx (line 158), categories/page.tsx (line 176), cms/PageBuilder.tsx (line 373) and ProductForm.tsx (lines 114, 310), while the rest of the admin (orders, coupons, team, preorders, digital-codes, automations, settings, customers/[id]) uses the accessible, focus-trapped, theme-styled `ConfirmDialog` component. The native dialog is unstyled, not focus-managed by the app, and visually inconsistent.
- **User impact:** Destructive actions present two different confirmation experiences across the admin; the native-confirm surfaces break the visual/interaction consistency and focus handling the ConfirmDialog provides elsewhere.

### Orders count labels use local store counts even in API mode
- **Type:** functional · **Page:** `admin/orders` · **Where:** `src/app/admin/orders/page.tsx:315`
- **Defect:** The ListToolbar `resultLabel` is `${rows.length} of ${store.orders.length}` (line 315); in API mode `rows` come from `apiOrders` while `store.orders` is the local seed, so the denominator is the seed count (e.g. '40 of 8'). Likewise the 'COD · N' quick-filter badge and `pendingCod` (lines 303-305) count `store.orders` (local), not the loaded API orders.
- **User impact:** In production the 'X of Y' order count and the pending-COD badge show numbers derived from local seed data, misrepresenting how many orders exist and how many COD orders are pending.


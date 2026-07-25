# QA — Ezurr Play HQ

Grey-box QA pass of the storefront, API and admin panel. 25 July 2026.

| File | What it is |
|---|---|
| `EZURR_TEST_REPORT.md` | The report. 53 defects, 3 blockers. Start with §1 (executive summary) and §9 (fix order). |
| `EZURR_TEST_CASES.md` | 150+ test cases across 13 suites, each with observed result and linked defect ID. |
| `playwright/` | Runnable regression suite. `npm install && npx playwright install chromium`, then see its own README. |

## The three blockers

1. **ADM-01** — `src/components/admin/AdminDrawer.tsx:66` — dependency array is `[open, onClose]` with an inline `onClose`, so the focus effect re-runs on every keystroke and steals focus. Nine admin forms accept only one character. Change to `[open]`.
2. **BUG-01** — the `<header>` carries `backdrop-blur-[24px]`, which creates a containing block for the `fixed inset-0` mobile-menu overlay. The drawer collapses to 56px and hides all navigation below 1024px. Portal it to `document.body`.
3. **BUG-02** — `/checkout` renders the GTA-VI pre-order template: wrong product name, a release date, and a "Place pre-order — ₹0 today" CTA on a standard COD order.

## Scope note

The backend held up under attack — price tampering, role escalation, IDOR, injection and XSS were all blocked. Findings concentrate in the frontend. See §5 of the report for what was attacked and what held.

`_to_delete/` holds the original suite archive; delete that folder when convenient.

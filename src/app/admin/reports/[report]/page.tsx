import { redirect } from "next/navigation";

/**
 * Eight report pages — sales, orders, products, customers, inventory, digital
 * codes, coupons, tax — that were one page reading a demo shop.
 *
 * On a real shop the table, the charts and the "vs prior" cards all came from
 * the offline demo store, which is empty by design once a shop is connected. So
 * all eight rendered the same three thirty-day figures at the top, the same
 * whole-history best-seller list under them, then "₹0 · flat" comparison cards
 * and an empty table. The thirty days were hardcoded, so the date picker on the
 * page moved nothing above it. And the tax one printed "Taxable lines: not
 * modelled" — a real GST return now exists on Money and is summed from the same
 * figures as his invoices.
 *
 * Whatever each of them was for is answered by a screen that has live numbers:
 * takings and best sellers on Money, stock on Products, piles of work on
 * Orders, codes on Digital codes, discounts on Discount codes. This redirect
 * stays for a release so a bookmarked /admin/reports/sales lands on the money
 * instead of a 404.
 */
export default function AdminReportDetailRedirect() {
  redirect("/admin/reports");
}

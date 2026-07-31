import { redirect } from "next/navigation";

/**
 * "Analytics" asked the server the same three questions as Money and drew the
 * answers slightly differently: takings, orders and average order over a date
 * range, plus the best-seller list. The one thing it had that Money did not was
 * a "Platform mix" chart, which only ever existed in the offline demo shop and
 * vanished the moment a real shop was connected.
 *
 * Everything real it showed is on /admin/reports, which is where the one nav
 * entry for this — "Money" — already points. This redirect stays for a release
 * so the command palette's "Charts" entry and any bookmark land on the numbers
 * instead of a 404.
 */
export default function AdminAnalyticsRedirect() {
  redirect("/admin/reports");
}

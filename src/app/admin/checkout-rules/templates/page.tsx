import { redirect } from "next/navigation";

/**
 * "Checkout rule templates" was ten cards behind its own route, reached from
 * three separate controls on the rules screen — a "Templates" button, a
 * "Templates →" pill, and the empty state's "Browse templates".
 *
 * Each card was a title and a line of our own vocabulary ("Force FREE shipping
 * label for matching carts", "Ask for UPI when prepaid is selected (demo
 * field)"), and picking one opened the same five-section form the New Rule
 * button opened. So it cost a screen, a route and two clicks to save nobody any
 * thinking — and one of the ten wrote a condition matching every order under
 * ₹999,999 while calling itself a free-shipping rule.
 *
 * Now that a rule reads as a sentence, a starting point is only a sentence that
 * is not turned on yet, so the four worth having sit in the grey half of the
 * one list. This redirect stays for a release so a bookmark, or the habit of
 * going here, lands on them instead of a 404.
 */
export default function CheckoutRuleTemplatesRedirect() {
  redirect("/admin/checkout-rules");
}

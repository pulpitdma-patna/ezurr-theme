import type { SettingsTabId } from "@/components/admin/settings/SettingsNav";

/**
 * The decisions this screen makes before anything is typed or saved.
 *
 * They live outside the components because each one of them is a rule that can
 * be wrong on its own — which tab a link opens, what a GST number is allowed to
 * contain, and, most of all, exactly what "Start over" is about to throw away.
 * A sentence naming what is destroyed is only trustworthy if it is derived from
 * the same thing that does the destroying, and can be tested against it.
 */

/**
 * Which tab a visit opens on.
 *
 * Three ways in, and all three were arriving at the wrong place:
 *  - `?tab=tax`, written by the bill screen's "set this up" link — honoured;
 *  - `#appearance` / `#checkout`, written by the website builder and the
 *    checkout-exceptions screen, which this page never read at all, so an owner
 *    following "change your colours" landed on Shop details and had to hunt;
 *  - a bookmark of a tab that no longer exists (`?tab=team`, `?tab=shipping`),
 *    which used to open an empty panel.
 */
export function resolveInitialTab(
  urlTab: string | null,
  hash: string | null,
  tabs: readonly { id: SettingsTabId }[],
  fallback: SettingsTabId = "store",
): SettingsTabId {
  const known = (value: string | null): SettingsTabId | null => {
    if (!value) return null;
    const cleaned = value.replace(/^#/, "");
    const match = tabs.find((tab) => tab.id === cleaned);
    return match ? match.id : null;
  };
  return known(urlTab) ?? known(hash) ?? fallback;
}

/** Digits only, capped — a phone number typed with spaces or +91 still lands. */
export function digitsOnly(value: string, max: number): string {
  return value.replace(/\D/g, "").slice(0, max);
}

/**
 * A GST number as the department writes it: 15 characters, capitals, no spaces.
 *
 * Pasting from WhatsApp or a PDF brings spaces and lower case with it, and the
 * bill would then print something that does not match his registration.
 */
export function normalizeGstin(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase().slice(0, 15);
}

/** A PAN as it is printed: 10 characters, capitals, no spaces. */
export function normalizePan(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase().slice(0, 10);
}

/** Never a negative rupee amount, never NaN from an emptied box. */
export function clampMoney(value: string | number): number {
  return Math.max(0, Number(value) || 0);
}

/** The server refuses anything over 50%, so the box must not offer it. */
export function clampPercent(value: string | number, max = 50): number {
  return Math.min(max, Math.max(0, Number(value) || 0));
}

/** Looks like an email address. Only used to warn, never to block typing. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export type PracticeShopContents = {
  products: number;
  orders: number;
  customers: number;
  coupons: number;
  checkoutRules: number;
};

function count(n: number, one: string, many: string): string | null {
  if (n <= 0) return null;
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Everything `resetAdminStore()` actually replaces, named the way the owner
 * would name it.
 *
 * Read off `createSeedState()` rather than written from memory. That function
 * rebuilds products, orders, customers, coupons, digital codes, the stock
 * ledger, categories, brands, settings, integrations, automations, the activity
 * list, the checkout exceptions AND the website builder's home page and custom
 * code. The old confirmation said "products, orders, customers and settings",
 * which is why the home page an owner had spent an evening building was not
 * something he expected to lose.
 */
export function startOverList(contents: PracticeShopContents): string[] {
  return [
    count(contents.products, "product", "products"),
    count(contents.orders, "order", "orders"),
    count(contents.customers, "customer", "customers"),
    count(contents.coupons, "discount code", "discount codes"),
    count(contents.checkoutRules, "checkout exception", "checkout exceptions"),
    "the home page and custom code in Website",
    "every setting on this screen",
  ].filter((item): item is string => item !== null);
}

/** The same list as one sentence, for the confirmation box. */
export function startOverSentence(contents: PracticeShopContents): string {
  const items = startOverList(contents);
  const last = items[items.length - 1];
  const head = items.slice(0, -1).join(", ");
  return (
    `${head ? `${head} and ${last}` : last} go, and the sample shop comes back as it was on day one. ` +
    "Nothing outside this browser changes: this practice shop is not connected to a real one, " +
    "so no customer is affected and no money moves."
  );
}

"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Renders its children on the storefront only, never in the back office.
 *
 * The root layout is shared: the admin and the setup wizard sit inside the same
 * document as the shop, so anything mounted there follows the owner around. The
 * cart drawer, the "chat with us" bubble and the cookie bar all did — furniture
 * for a shopper, stacked over the order list of the person who runs the shop,
 * with the chat bubble parked exactly where a floating action button belongs.
 *
 * A wrapper rather than a guard inside each component, because the guard has to
 * come before that component's own hooks to save any work, and an early return
 * above a `useCart()` changes the hook count between routes — a rules-of-hooks
 * violation that TypeScript does not catch and that only shows up when someone
 * navigates from the shop into the admin. Not mounting the child at all has
 * neither problem, and new storefront furniture inherits the behaviour by being
 * put inside this instead of remembering a rule.
 */
export function StorefrontOnly({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin") || pathname?.startsWith("/setup")) return null;

  return <>{children}</>;
}

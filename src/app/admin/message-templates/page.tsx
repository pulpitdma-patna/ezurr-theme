import { redirect } from "next/navigation";

/**
 * Message wording used to be its own nav item and its own route, one screen
 * away from the automatic messages that point at it.
 *
 * That split is why "held back — the wording isn't approved yet" was
 * unreadable: a rule showed as on, and the thing that was actually off lived
 * somewhere the owner had no reason to open. An automatic message points at a
 * wording by key; they belong on one screen, so wording is now the second tab.
 */
export default function AdminMessageTemplatesRedirect() {
  redirect("/admin/automations?tab=wording");
}

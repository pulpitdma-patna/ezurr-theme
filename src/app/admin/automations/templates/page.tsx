import { redirect } from "next/navigation";

/**
 * "Templates" was a gallery of twelve starter rules on its own route, reached
 * from three separate controls on the automations screen — a tab, a pill and a
 * button, all going to the same place. Opening one filled a four-step form the
 * owner then had to name, describe and save.
 *
 * Four of the twelve wrote prose into the field the engine reads as a template
 * lookup key ("Your pre-order is ready"), which matches no wording — so the
 * gallery handed out rules that could never send anything, while showing as on.
 *
 * They are now the "Not turned on" half of the one list on /admin/automations:
 * the same sentence, in grey, with one Turn on button and no form.
 */
export default function AdminAutomationTemplatesRedirect() {
  redirect("/admin/automations");
}

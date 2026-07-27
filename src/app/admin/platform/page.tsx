import { redirect } from "next/navigation";

/**
 * "Platform" was four tabs of controls that did nothing: a read-replica toggle,
 * SSO providers that opened a toast reading "OAuth mock — not connected", a
 * webhook replay button, and a tile that reported the store version as
 * "local v6 · Browser persistence".
 *
 * /admin/system answers the same questions with real values. This redirect
 * stays for a release so existing bookmarks and the nav in anyone's muscle
 * memory land somewhere useful instead of a 404.
 */
export default function AdminPlatformRedirect() {
  redirect("/admin/system");
}

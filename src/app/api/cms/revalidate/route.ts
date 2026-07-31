import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { CMS_CACHE_TAG } from "@/lib/cms/publicPages";

/**
 * Drop the storefront's cached copy of the CMS, called right after a publish.
 *
 * Published pages are cached for five minutes. Without this, an owner who
 * removed a section and reloaded the shop still saw it, with nothing to tell
 * them whether the change had failed or was merely waiting — so they would
 * remove it again, or decide the editor did not work.
 *
 * Deliberately unauthenticated. It reveals nothing and changes nothing: the
 * worst it can do is make the next storefront request re-fetch public data the
 * API would serve to anyone. Putting a token here would mean shipping that token
 * to the browser, which is not a secret, in exchange for no protection.
 */
export async function POST() {
  // Next 16 takes a cache profile as the second argument. "max" expires every
  // entry carrying the tag whatever lifetime it was fetched with, which is what
  // a publish means: nothing cached about this page is true any more.
  revalidateTag(CMS_CACHE_TAG, "max");
  return NextResponse.json({ ok: true, tag: CMS_CACHE_TAG });
}

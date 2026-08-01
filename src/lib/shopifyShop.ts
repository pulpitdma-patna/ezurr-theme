/**
 * Works out which Shopify shop the owner means.
 *
 * He is not going to type `mystore.myshopify.com`. He will type `mystore`, or
 * paste whatever is in the address bar of the Shopify tab he already has open —
 * which is `https://admin.shopify.com/store/mystore/products` on a new store and
 * `https://mystore.myshopify.com/admin` on an older one. All three mean the same
 * shop, and being made to retype it correctly is exactly the ten-minute detour
 * the connect button exists to remove.
 *
 * What comes out matches the shop address the API accepts, character for
 * character, so a value this function returns is never bounced back with a
 * validation message the owner cannot act on.
 */

/** The shop's own name, before `.myshopify.com` is added. */
const HANDLE = /^[a-z0-9][a-z0-9-]*$/;

/** Kept identical to the API's allowlist — anything else is somebody else's site. */
const SHOP_DOMAIN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

/**
 * Returns the full `something.myshopify.com` address, or null when what was
 * typed is not a Shopify shop at all (his own web address, a half-typed name,
 * a lookalike domain).
 */
export function normalizeShopDomain(input: string): string | null {
  let value = (input ?? "").trim().toLowerCase();
  if (value === "") return null;

  // Drop a pasted https:// (or http://, or the // some browsers copy).
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, "").replace(/^\/\//, "");

  // The newer Shopify admin lives at admin.shopify.com/store/<name>, so the
  // shop's own name is in the path there rather than in the host.
  const inAdminPath = value.match(/^admin\.shopify\.com\/store\/([^/?#]+)/);
  value = inAdminPath ? inAdminPath[1] : value.split(/[/?#]/)[0];

  // A port or a trailing dot survives some copy-pastes; neither changes the shop.
  value = value.replace(/:\d+$/, "").replace(/\.+$/, "");
  if (value === "") return null;

  // A dot means he gave us a whole address: it has to be a Shopify one. This is
  // what stops `mystore.myshopify.com.example.net` from being treated as his
  // shop — that address belongs to whoever owns example.net.
  if (value.includes(".")) {
    return SHOP_DOMAIN.test(value) ? value : null;
  }

  return HANDLE.test(value) ? `${value}.myshopify.com` : null;
}

/**
 * Which mistake he made, so the screen can say that one.
 *
 * The box asks for a bare name, so the single message about ".myshopify.com"
 * described the wrong error for anyone who typed a name with a space or an
 * underscore in it — he was told he had pasted a web address he never pasted,
 * and the button faded out with nothing else to go on.
 *
 * - "domain"     — he gave a whole web address, and it is not a Shopify one
 * - "characters" — he gave a name, but not one Shopify allows
 * - null         — nothing typed yet, or it resolved fine
 */
export type ShopProblem = "domain" | "characters" | null;

export function shopProblemFor(input: string): ShopProblem {
  const typed = (input ?? "").trim();
  if (typed === "" || normalizeShopDomain(typed) !== null) return null;

  const looksLikeAddress = /[.]/.test(typed) || /:\/\//.test(typed) || typed.includes("/");

  return looksLikeAddress ? "domain" : "characters";
}

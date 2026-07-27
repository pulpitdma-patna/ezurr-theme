/**
 * Where a CMS page lives, and which addresses it may not take.
 *
 * Pages used to sit under `/pages/<slug>`. That is a developer's URL — nobody
 * prints "ezurr.com/pages/contact" on a card, and no other store has the segment.
 * They are top level now: `/about`, `/contact`.
 *
 * The cost is why RESERVED exists. A top-level slug shares one namespace with
 * every storefront route, and Next resolves a static segment before a dynamic one
 * — so a page created at `/cart` would never render, silently, and the owner would
 * have no way to find out why. Creating one is refused, with the reason.
 *
 * Mirrored in the API at app/Support/CmsRoutes.php; both sides are pinned by a
 * test asserting the same list, because the admin refuses a slug before the
 * request goes out and the server refuses it if the admin ever doesn't.
 */

/** Top-level paths the storefront and the framework already own. */
export const RESERVED_CMS_SLUGS = [
  "accessories", "account", "admin", "auth", "brands", "cart", "categories",
  "checkout", "consoles", "game-cards", "games", "preorders",
  "price-guarantee", "products", "search", "setup", "track",
  // The old CMS prefix — it 308s to the top-level page now, so a page living
  // there would shadow its own redirect.
  "pages",
  "api", "_next", "favicon.ico", "sitemap.xml", "robots.txt", "manifest.json",
  // The homepage is a CMS page, addressed as "/".
  "home",
] as const;

/** Storefront path for a CMS page slug. */
export function cmsPagePath(slug: string): string {
  return slug === "home" ? "/" : `/${slug.replace(/^\/+/, "")}`;
}

/** True when this slug would be shadowed by a storefront route. */
export function isReservedCmsSlug(slug: string): boolean {
  return (RESERVED_CMS_SLUGS as readonly string[]).includes(
    slug.toLowerCase().replace(/^\/+|\/+$/g, ""),
  );
}

/** The slug inside a stored path, tolerating both shapes. */
export function cmsSlugFromPath(path: string): string {
  const trimmed = path.replace(/^\/+|\/+$/g, "");
  return trimmed.startsWith("pages/") ? trimmed.slice("pages/".length) : trimmed;
}

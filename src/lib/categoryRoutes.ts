/**
 * Where a category's page lives.
 *
 * Five category paths predate the CMS and are indexed: /games, /consoles,
 * /accessories, /game-cards, /preorders. They keep their URLs — they are
 * hardcoded in ~18 files AND inside the `document` JSON of already-published CMS
 * pages (product_rail.href and editorial_banner.href are free-text URL fields no
 * grep can reach), and two Playwright specs assert /games self-canonicalises.
 * Everything else lives under /categories/<slug>.
 *
 * The store therefore keeps two URL shapes on purpose. The honest reason is
 * "those five are older", and it costs one lookup instead of a migration that
 * would rewrite content the owner has already published.
 *
 * Mirrored in PHP at app/Support/CategoryRoutes.php — both sides are pinned by a
 * test asserting the same mappings, because the sitemap and the product
 * breadcrumb need this without a navigation round trip.
 */

/** Category slugs that keep a pre-CMS top-level path. */
export const LEGACY_CATEGORY_PATHS: Record<string, string> = {
  games: "/games",
  consoles: "/consoles",
  accessories: "/accessories",
  "game-cards": "/game-cards",
  // Not a category row at all — the API translates this slug into a fulfilment
  // scope with release-date ordering. Listed so nothing ever mints
  // /categories/preorders.
  preorders: "/preorders",
};

export function categoryPath(slug: string): string {
  return LEGACY_CATEGORY_PATHS[slug] ?? `/categories/${slug}`;
}

/** True when the slug owns a hand-written route rather than the dynamic one. */
export function isLegacyCategoryPath(slug: string): boolean {
  return slug in LEGACY_CATEGORY_PATHS;
}

/**
 * Slug for a category the owner just named, matching the API's
 * /^[a-z0-9]+(?:-[a-z0-9]+)*$/. Returns "" when nothing usable is left, so the
 * caller can say so instead of sending a request that 422s.
 */
export function slugifyCategory(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * A readable label for a slug when the category's real name isn't to hand.
 *
 * Breadcrumbs printed the raw slug ("game-cards"). Title-casing the slug is a
 * fallback, not a substitute for the name — callers that have the category row
 * should pass its `name` instead.
 */
export function categoryLabel(slug: string | undefined | null): string {
  if (!slug) return "Pre-orders";
  return slug
    .split("-")
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

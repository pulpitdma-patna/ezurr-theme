/**
 * Maps Laravel API payloads to Ezurr theme types.
 */
import {
  formatInr,
  type AdminCatalogRow,
  type AdminOrder,
  type AdminOrderItem,
  type AdminOrderStatus,
  type AdminPlatform,
} from "@/data/admin";
import { payableMrp, payablePrice, type ApiProduct } from "@/lib/apiClient";
import type { CatalogProduct, GameCardProduct } from "@/lib/types";

const DEFAULT_IMG =
  "https://ezurr.com/cdn/shop/files/GAMPLAY540.jpg?v=1782735956&width=533";

/** Distinct placeholders so missing image_url never collapses every card to one asset. */
const PLACEHOLDER_IMGS = [
  "https://ezurr.com/cdn/shop/files/GAMPLAY540.jpg?v=1782735956&width=533",
  "https://ezurr.com/cdn/shop/files/GAMPLAY166.jpg?v=1772713977&width=533",
  "https://ezurr.com/cdn/shop/files/GAMPLAY174.jpg?v=1774693707&width=533",
  "https://ezurr.com/cdn/shop/files/PREPLAY346.jpg?v=1773153102&width=533",
  "https://ezurr.com/cdn/shop/files/CONPLAY440.jpg?v=1780489351&width=533",
  "https://ezurr.com/cdn/shop/files/CONSNIN130_1.jpg?v=1772613150&width=533",
  "https://ezurr.com/cdn/shop/files/ACCPLAY256.jpg?v=1772605855&width=533",
  "https://ezurr.com/cdn/shop/files/ACCPLAY224.jpg?v=1772548181&width=533",
  "https://ezurr.com/cdn/shop/files/CONXBOX128_1.jpg?v=1772613054&width=533",
  "https://ezurr.com/cdn/shop/files/CONPLAY127_2.jpg?v=1772612994&width=533",
];

const BRAND_LABELS: Record<string, string> = {
  ezurr: "Ezurr",
  sony: "Sony",
  rockstar: "Rockstar",
  nintendo: "Nintendo",
  microsoft: "Microsoft",
  logitech: "Logitech",
  meta: "Meta",
  valve: "Valve",
};

const GAME_CARD_BACKGROUNDS = [
  "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
  "linear-gradient(135deg, #0f3460 0%, #533483 100%)",
  "linear-gradient(135deg, #2d132c 0%, #801336 100%)",
  "linear-gradient(135deg, #1b262c 0%, #0f4c75 100%)",
];

function placeholderImgFor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return PLACEHOLDER_IMGS[Math.abs(hash) % PLACEHOLDER_IMGS.length] || DEFAULT_IMG;
}

function brandLabel(slug?: string | null, fallback?: string | null): string {
  if (slug) {
    const known = BRAND_LABELS[slug.toLowerCase()];
    if (known) return known;
    return slug.charAt(0).toUpperCase() + slug.slice(1);
  }
  if (fallback) return fallback.replace(/-/g, " ").toUpperCase();
  return "";
}

export function mapApiProductToCatalog(p: ApiProduct): CatalogProduct {
  const id = p.key || p.slug || String(p.id);
  const createdAt =
    "created_at" in p && typeof p.created_at === "string" ? p.created_at : undefined;
  return {
    id,
    img: p.image_url || placeholderImgFor(id),
    brand: brandLabel(p.brand_slug, p.category_slug) || p.fulfillment_type,
    name: p.title,
    price: formatInr(payablePrice(p)),
    strike: (payableMrp(p) ?? 0) > payablePrice(p) ? formatInr(payableMrp(p)!) : "",
    badges: p.badges ?? [],
    priceNum: payablePrice(p),
    stock: p.stock,
    createdAt,
  };
}

/** HTML → a short, tag-free one-liner (for card subtitles etc.). */
/**
 * Which console a product is for, derived from its imported Shopify tags.
 *
 * There is no platform column — the admin used to hardcode
 * `fulfillment_type === "digital" ? "Digital" : "PS5"`, and since nothing is
 * digital, all 298 products displayed "PS5", accessories and Switch titles
 * included. The Shopify tags are correct and already imported, so read those.
 *
 * Specific tags win over generic ones ("switch 2" before "switch", "ps5" before
 * the bare "ps" that PlayStation accessories carry), then category decides.
 * Nothing is guessed: an unrecognised product falls through to "Multi" rather
 * than asserting a console it may not be for.
 */
export function derivePlatform(p: ApiProduct): AdminPlatform {
  const meta = (p.meta ?? {}) as { shopify_tags?: unknown };
  const tags = new Set(
    (Array.isArray(meta.shopify_tags) ? meta.shopify_tags : [])
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.toLowerCase().trim()),
  );

  if (tags.has("ps5")) return "PS5";
  if (tags.has("ps4")) return "PS4";
  if (tags.has("switch 2") || tags.has("switch")) return "Nintendo";
  if (tags.has("xb")) return "Xbox";
  if (tags.has("valve")) return "PC";
  if (tags.has("meta")) return "Hardware";

  // Pre-orders arrive tagged only "preorder" — no platform tag — but every one
  // of them names its console in the title. Anchored patterns only, so a title
  // mentioning a platform in passing cannot claim it.
  const title = p.title.toLowerCase();
  if (/\bps5\b|\bplaystation 5\b/.test(title)) return "PS5";
  if (/\bps4\b|\bplaystation 4\b/.test(title)) return "PS4";
  if (/\bswitch 2\b|\bnintendo switch\b|\bswitch\b/.test(title)) return "Nintendo";
  if (/\bxbox\b/.test(title)) return "Xbox";
  if (/\bsteam deck\b/.test(title)) return "PC";

  const category = (p.category_slug ?? "").toLowerCase();
  if (p.fulfillment_type === "digital" || category === "game-cards") return "Digital";
  if (category === "consoles" || category === "accessories") return "Hardware";

  return "Multi";
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * Flatten product HTML to plain text for a card subtitle or meta description.
 *
 * Descriptions arrive as raw HTML from the API — much of it pasted out of
 * Google Sheets, so it carries `<span data-sheets-root="1">` wrappers. Entities
 * used to be replaced with a space, which turned "Call of Duty&reg;" into a
 * gap; they are decoded now. Truncation falls back to the last word boundary so
 * a description never ends mid-word.
 */
export function toPlainSnippet(html: string | null | undefined, max = 90): string {
  const text = (html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function mapApiProductToGameCard(p: ApiProduct, index: number): GameCardProduct {
  const value = formatInr(payablePrice(p));
  const id = p.key || p.slug || String(p.id);
  return {
    id,
    title: p.title,
    tag: p.fulfillment_type === "digital" ? "Instant" : "Digital",
    sub: toPlainSnippet(p.description) || "Delivered to your email",
    bg: GAME_CARD_BACKGROUNDS[index % GAME_CARD_BACKGROUNDS.length],
    value,
    name: p.title,
    price: value,
  };
}

export function mapApiProductToAdminRow(p: ApiProduct, index = 0): AdminCatalogRow {
  const status = p.active
    ? p.stock <= 0
      ? "sold_out"
      : "published"
    : "draft";
  return {
    key: p.key,
    category: p.category_slug || "games",
    index,
    name: p.title,
    brand: p.brand_slug || "ezurr",
    sku: p.key,
    platform: derivePlatform(p),
    edition: "Standard",
    price: formatInr(payablePrice(p)),
    strike: (payableMrp(p) ?? 0) > payablePrice(p) ? formatInr(payableMrp(p)!) : "",
    taxInclusive: p.tax_inclusive ?? true,
    stock: p.stock,
    digital: p.fulfillment_type === "digital",
    status,
    image: p.image_url || DEFAULT_IMG,
    releaseDate: undefined,
  };
}

const API_ORDER_STATUSES: AdminOrderStatus[] = [
  "pending",
  "pending_payment",
  "confirmed",
  "paid",
  "payment_failed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "preorder",
  "refunded",
];

/**
 * Map an API order status onto the admin one.
 *
 * This list used to omit `pending_payment`, `paid` and `payment_failed` — all
 * three of which are legal AdminOrderStatus values with their own badge styling
 * — and then fell through to `return "confirmed"`. So an order whose payment had
 * FAILED was displayed to the owner, and to the customer, as confirmed. The
 * owner's next step on a confirmed order is to pack and ship it, for money that
 * never arrived.
 *
 * An unknown status now reports itself as pending rather than confirmed. If this
 * is ever wrong it is wrong in the direction of someone looking again, which is
 * the only safe direction for a fallback on the money path.
 */
export function normalizeApiOrderStatus(raw: string): AdminOrderStatus {
  if ((API_ORDER_STATUSES as string[]).includes(raw)) {
    return raw as AdminOrderStatus;
  }
  return "pending";
}

export function mapApiOrderToAdmin(raw: Record<string, unknown>): AdminOrder {
  const addr = (raw.shipping_address as Record<string, string> | null) ?? {};
  const status = normalizeApiOrderStatus(String(raw.status ?? "pending"));
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  const items: AdminOrderItem[] = itemsRaw.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      name: String(row.title ?? "Item"),
      brand: String(row.product_key ?? ""),
      price: formatInr(Number(row.unit_price ?? 0)),
      qty: Number(row.qty ?? 1),
      image: DEFAULT_IMG,
      productKey: String(row.product_key ?? ""),
      sku: String(row.product_key ?? ""),
      fulfillmentType:
        (row.fulfillment_type as AdminOrderItem["fulfillmentType"]) ?? "physical",
    };
  });

  const eventRows = Array.isArray(raw.events) ? raw.events : [];
  const timeline = eventRows.map((e, i) => {
    const ev = e as Record<string, unknown>;
    const meta = (ev.meta as Record<string, unknown> | null) ?? null;
    const trackingNote = meta && typeof meta.tracking === "string" ? meta.tracking : undefined;
    const actor = meta && typeof meta.by === "string" ? meta.by : undefined;
    return {
      id: String(ev.id ?? `evt-${i}`),
      at: String(ev.created_at ?? raw.created_at ?? new Date().toISOString()),
      label: String(ev.label ?? ev.type ?? "Update"),
      detail: trackingNote ? `Tracking: ${trackingNote}` : undefined,
      actor,
    };
  });

  return {
    id: String(raw.public_id ?? raw.id),
    customerName: addr.firstName
      ? `${addr.firstName} ${addr.lastName ?? ""}`.trim()
      : "Customer",
    customerMobile: String(raw.mobile ?? ""),
    city: addr.city || "—",
    total: formatInr(Number(raw.total ?? 0)),
    payment: raw.payment_method === "cod" ? "COD" : "Prepaid",
    status,
    placedAt: String(raw.created_at ?? new Date().toISOString()),
    items,
    timeline,
    addressLine1: addr.address,
    pincode: addr.pincode,
    tracking: raw.tracking ? String(raw.tracking) : undefined,
    trackingUrl: raw.tracking_url ? String(raw.tracking_url) : undefined,
    carrierName: raw.carrier_name ? String(raw.carrier_name) : undefined,
    eta: raw.eta ? String(raw.eta) : undefined,
    notes: raw.notes ? String(raw.notes) : undefined,
    // Passed straight through — never recomputed here. See AdminOrder.money.
    money: (raw.money as AdminOrder["money"]) ?? undefined,
    next: (raw.next as AdminOrder["next"]) ?? undefined,
    awb: raw.awb ? String(raw.awb) : undefined,
  };
}

/** Public /track response → the same AdminOrder shape (trimmed source data). */
export function mapApiTrackedOrder(raw: Record<string, unknown>): AdminOrder {
  return mapApiOrderToAdmin(raw);
}

/**
 * Maps Laravel API payloads to Ezurr theme types.
 */
import {
  formatInr,
  type AdminCatalogRow,
  type AdminOrder,
  type AdminOrderItem,
  type AdminOrderStatus,
} from "@/data/admin";
import type { ApiProduct } from "@/lib/apiClient";
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
  return {
    id,
    img: p.image_url || placeholderImgFor(id),
    brand: brandLabel(p.brand_slug, p.category_slug) || p.fulfillment_type,
    name: p.title,
    price: formatInr(p.price),
    strike: p.mrp && p.mrp > p.price ? formatInr(p.mrp) : "",
    badges: p.badges ?? [],
  };
}

/** HTML → a short, tag-free one-liner (for card subtitles etc.). */
export function toPlainSnippet(html: string | null | undefined, max = 90): string {
  const text = (html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

export function mapApiProductToGameCard(p: ApiProduct, index: number): GameCardProduct {
  const value = formatInr(p.price);
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
    platform: p.fulfillment_type === "digital" ? "Digital" : "PS5",
    edition: "Standard",
    price: formatInr(p.price),
    strike: p.mrp && p.mrp > p.price ? formatInr(p.mrp) : "",
    stock: p.stock,
    digital: p.fulfillment_type === "digital",
    status,
    image: p.image_url || DEFAULT_IMG,
    releaseDate: undefined,
  };
}

export function normalizeApiOrderStatus(raw: string): AdminOrderStatus {
  if (
    [
      "pending",
      "confirmed",
      "packed",
      "shipped",
      "delivered",
      "cancelled",
      "preorder",
      "refunded",
    ].includes(raw)
  ) {
    return raw as AdminOrderStatus;
  }
  if (raw === "pending_payment") return "pending";
  return "confirmed";
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
  };
}

/** Public /track response → the same AdminOrder shape (trimmed source data). */
export function mapApiTrackedOrder(raw: Record<string, unknown>): AdminOrder {
  return mapApiOrderToAdmin(raw);
}

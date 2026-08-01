import type { ApiProduct } from "@/lib/apiClient";
import { derivePlatform, productItemCode } from "@/lib/apiMappers";
import type { ProductFormValues } from "@/components/admin/ProductForm";

/**
 * Parse a money input to whole rupees, rejecting anything negative.
 *
 * The old version stripped everything except digits and a dot — including the
 * minus sign — so "-500" became 500 and saved silently with a success banner.
 * Price is the most dangerous field in the catalogue; a stray keystroke must
 * not quietly re-price a product. Parse the sign, then refuse it.
 */
export function priceToNumber(value: string): number {
  const cleaned = String(value).replace(/[^\d.-]/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

/**
 * Is this product on sale to customers right now, and if not, why not?
 *
 * One question — "on the website" — with three answers, and **Sold out is
 * derived, never chosen**. The status dropdown used to offer "Sold out" as a
 * third option beside Draft and Published; picking it saved `active: false`,
 * which does not mark anything sold out — it takes the product off the website
 * entirely, so customers cannot see it, cannot join a waitlist for it and
 * cannot find it in search. The owner's word for "I've run out" silently meant
 * "delete this from my shop".
 *
 * Running out is a stock fact. The server already knows it.
 */
export type WebsiteState = "live" | "hidden" | "sold_out";

export function websiteState(input: {
  active: boolean;
  stock: number;
  fulfilmentType?: string;
  /** Unsold codes in the vault, for code-delivered products. */
  codeCount?: number | null;
}): WebsiteState {
  if (!input.active) return "hidden";
  // A code-delivered product's stock lives in the vault, not in products.stock
  // (OrderService::assertAvailable counts vault rows and ignores the column).
  // A pre-order has no stock yet by definition — that is what a pre-order is.
  if (input.fulfilmentType === "digital") {
    return (input.codeCount ?? 0) > 0 ? "live" : "sold_out";
  }
  if (input.fulfilmentType === "preorder") return "live";
  return input.stock > 0 ? "live" : "sold_out";
}

export const websiteStateLabels: Record<WebsiteState, string> = {
  live: "Live",
  hidden: "Hidden",
  sold_out: "Sold out",
};

export const websiteStateTones: Record<WebsiteState, string> = {
  live: "bg-[#EAF6ED] text-[#2D6B3C]",
  hidden: "bg-[#F0F0F2] text-[#6E6E73]",
  sold_out: "bg-[#FEE4E2] text-[#B42318]",
};

/**
 * Pre-order is a date, not a type.
 *
 * The old form made it a third radio card beside Physical and Digital, so
 * setting a release date meant first accepting a noun ("Pre-order") and then
 * finding two fields hidden behind it. All seven pre-orders in the catalogue
 * have `release_at = NULL` — nobody ever got that far. Here the owner types the
 * date he was told by his distributor and the shop works it out: a date still
 * ahead of us is a pre-order, and the morning it arrives it stops being one.
 *
 * `today` is injected so this is testable and so the caller decides the clock.
 */
export function deriveFulfilment(
  input: { delivery: "physical" | "digital"; releaseAt: string; advance: string },
  today: string = new Date().toISOString().slice(0, 10),
): ProductPayloadInput["fulfilment"] {
  if (input.delivery === "digital") {
    return { type: "digital", releaseAt: "", reservationAmount: "" };
  }
  if (input.releaseAt && input.releaseAt > today) {
    return { type: "preorder", releaseAt: input.releaseAt, reservationAmount: input.advance };
  }
  return { type: "physical", releaseAt: "", reservationAmount: "" };
}

export type ProductPayloadInput = {
  key: string;
  name: string;
  category: string;
  brand: string;
  price: string;
  strike: string;
  /** Optional so existing call sites and fixtures still typecheck. */
  cost?: string;
  taxInclusive: boolean;
  stock: number;
  /** Live or hidden — the only two the owner chooses. */
  onWebsite: boolean;
  image: string;
  description?: string;
  /** "I post it" / "Code by email", plus release date and advance. */
  fulfilment: {
    type: "physical" | "digital" | "preorder";
    releaseAt: string;
    reservationAmount: string;
  };
  /** Extra categories beyond the primary one ("Also show in"). */
  alsoIn?: string[];
};

/**
 * Product form values → the Laravel /admin/products payload.
 *
 * There was a second copy of this inside products/page.tsx. The comment above it
 * recorded that the duplication had already caused the negative-price bug to be
 * fixed twice; the drawer kept accepting "-500" as 500 after the edit form was
 * fixed. Two callers, one function.
 *
 * Note what is NOT here, and was never here: `sku` and `edition`. The form asked
 * for both, in editable text inputs, and neither was ever sent — the owner typed
 * his shelf code, pressed save, read "Product saved" in green, and the value was
 * discarded between the keyboard and the request. There is no `sku` or `edition`
 * column to send them to. The fields are gone from the form instead.
 */
export function productFormToApiPayload(input: ProductPayloadInput) {
  const key = input.key.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
  const payload: Record<string, unknown> = {
    key,
    slug: key.slice(0, 120),
    title: input.name,
    category_slug: input.category,
    brand_slug: input.brand.toLowerCase().replace(/\s+/g, "-") || "ezurr",
    price: priceToNumber(input.price),
    mrp: priceToNumber(input.strike) || null,
    // The drawer has always shown a "Price includes GST" toggle and read it back
    // from the product, but never sent it — so switching it saved nothing and
    // reappeared unchanged on reload. It decides whether the catalogue price is
    // grossed up at checkout, so the wrong value moves what the customer pays.
    tax_inclusive: input.taxInclusive,
    stock: input.stock,
    image_url: input.image || null,
    active: input.onWebsite,
    ...fulfilmentToPayload(input.fulfilment),
  };
  if (input.description !== undefined) payload.description = input.description;
  // The blank test MUST come before priceToNumber, which returns 0 for an empty
  // string — that would turn "I don't know what I paid" into "it was free", and
  // report the product as pure profit for ever after.
  if (input.cost !== undefined) {
    payload.cost = input.cost.trim() === "" ? null : priceToNumber(input.cost);
  }
  // `categories` is `sometimes` on the server: absent is not the same as empty,
  // and sending [] from a screen that never asked would wipe a hand-curated sale.
  if (input.alsoIn) payload.categories = input.alsoIn;
  return payload;
}

/**
 * Fulfilment → the three columns ProductController validates.
 *
 * Release date and advance are nulled whenever the product is not a pre-order,
 * so demoting one can't leave a stale release date the storefront still honours.
 */
export function fulfilmentToPayload(value: ProductPayloadInput["fulfilment"]): {
  fulfillment_type: string;
  release_at: string | null;
  reservation_amount: number | null;
} {
  if (value.type !== "preorder") {
    return { fulfillment_type: value.type, release_at: null, reservation_amount: null };
  }
  const digits = value.reservationAmount.replace(/[^\d]/g, "");
  const parsed = Number(digits);
  return {
    fulfillment_type: "preorder",
    release_at: value.releaseAt || null,
    reservation_amount: digits === "" || !Number.isFinite(parsed) ? null : Math.max(0, parsed),
  };
}

/** Laravel ApiProduct → product form values (for the edit page and drawer). */
export function apiProductToForm(p: ApiProduct): ProductFormValues {
  const raw = p as ApiProduct & {
    release_at?: string | null;
    reservation_amount?: number | null;
  };
  const releaseAt =
    typeof raw.release_at === "string" && raw.release_at.length >= 10
      ? raw.release_at.slice(0, 10)
      : "";
  return {
    category: (p.category_slug ?? "games") as ProductFormValues["category"],
    name: p.title,
    brand: p.brand_slug ?? "",
    itemCode: productItemCode(p),
    platform: derivePlatform(p),
    webAddress: p.slug ?? p.key,
    description: p.description ?? "",
    // Edit the merchant's own basis, not the grossed-up display figure.
    price: String(p.price ?? ""),
    strike: p.mrp ? String(p.mrp) : "",
    cost: p.cost == null ? "" : String(p.cost),
    // null on the API means "inherit the store default", which is inclusive.
    taxInclusive: p.tax_inclusive ?? true,
    stock: String(p.stock ?? 0),
    delivery: p.fulfillment_type === "digital" ? "digital" : "physical",
    releaseAt,
    advance: raw.reservation_amount == null ? "" : String(raw.reservation_amount),
    onWebsite: p.active,
    image: p.image_url ?? "",
  };
}

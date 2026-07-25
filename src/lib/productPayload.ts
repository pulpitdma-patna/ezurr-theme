import type { ApiProduct } from "@/lib/apiClient";
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

export type ProductPayloadInput = {
  key: string;
  name: string;
  category: string;
  brand: string;
  price: string;
  strike: string;
  taxInclusive: boolean;
  stock: number;
  digital: boolean;
  status: string;
  image: string;
};

/** Product form values → Laravel /admin/products payload. */
export function productFormToApiPayload(input: ProductPayloadInput) {
  const key = input.key.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
  return {
    key,
    slug: key.slice(0, 120),
    title: input.name,
    category_slug: input.category,
    brand_slug: input.brand.toLowerCase().replace(/\s+/g, "-") || "ezurr",
    price: priceToNumber(input.price),
    mrp: priceToNumber(input.strike) || null,
    tax_inclusive: input.taxInclusive,
    stock: input.stock,
    fulfillment_type: input.digital ? "digital" : "physical",
    image_url: input.image || null,
    active: input.status === "active" || input.status === "published",
  };
}

/** Laravel ApiProduct → product form values (for the edit page). */
export function apiProductToForm(p: ApiProduct): ProductFormValues {
  const status: ProductFormValues["status"] = p.active
    ? p.stock <= 0
      ? "sold_out"
      : "published"
    : "draft";
  return {
    category: (p.category_slug ?? "games") as ProductFormValues["category"],
    name: p.title,
    brand: p.brand_slug ?? "",
    sku: p.key,
    platform: (p.fulfillment_type === "digital" ? "Digital" : "PS5") as ProductFormValues["platform"],
    edition: "Standard",
    // Edit the merchant's own basis, not the grossed-up display figure.
    price: String(p.price ?? ""),
    strike: p.mrp ? String(p.mrp) : "",
    // null on the API means "inherit the store default", which is inclusive.
    taxInclusive: p.tax_inclusive ?? true,
    stock: String(p.stock ?? 0),
    digital: p.fulfillment_type === "digital",
    status,
    image: p.image_url ?? "",
  };
}

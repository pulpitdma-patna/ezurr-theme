import type { ApiProduct } from "@/lib/apiClient";
import type { ProductFormValues } from "@/components/admin/ProductForm";

export function priceToNumber(value: string): number {
  const n = Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export type ProductPayloadInput = {
  key: string;
  name: string;
  category: string;
  brand: string;
  price: string;
  strike: string;
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
    price: String(p.price ?? ""),
    strike: p.mrp ? String(p.mrp) : "",
    stock: String(p.stock ?? 0),
    digital: p.fulfillment_type === "digital",
    status,
    image: p.image_url ?? "",
  };
}

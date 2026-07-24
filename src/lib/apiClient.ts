/**
 * Laravel API client for Ezurr.
 * Enable with NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
 * When unset, callers should fall back to localStorage mocks.
 */

const TOKEN_KEY = "ezurr_api_token";

export function getApiBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

export function isApiEnabled(): boolean {
  return Boolean(getApiBaseUrl());
}

export function getApiToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setApiToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new ApiError("API URL not configured", 0, null);
  }

  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = getApiToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");

  const res = await fetch(`${base}/api${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers,
  });

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!res.ok) {
    const message =
      typeof body === "object" && body && "message" in body
        ? String((body as { message: string }).message)
        : `API ${res.status}`;
    throw new ApiError(message, res.status, body);
  }

  return body as T;
}

export async function apiCreateProduct(payload: Record<string, unknown>) {
  return apiFetch("/admin/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiUpdateProduct(key: string, payload: Record<string, unknown>) {
  return apiFetch(`/admin/products/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function apiDeleteProduct(key: string) {
  return apiFetch<{ ok: boolean }>(`/admin/products/${encodeURIComponent(key)}`, {
    method: "DELETE",
  });
}

export type ImportSummary = {
  ok: boolean;
  summary: { dryRun: boolean; settings: boolean; rules: number; products: number };
};

export async function apiImport(payload: {
  products?: Array<Record<string, unknown>>;
  settings?: Record<string, unknown>;
  checkoutRules?: Array<Record<string, unknown>>;
  dryRun?: boolean;
}) {
  return apiFetch<ImportSummary>("/admin/import", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type ApiPaginated<T> = {
  data: T[];
  current_page?: number;
  last_page?: number;
  total?: number;
};

export type ApiCategory = {
  id: string;
  key: string;
  label: string;
  description: string;
  image?: string | null;
  parentId?: string | null;
  parentKey?: string | null;
  active: boolean;
};

export type ApiBrand = {
  id: string;
  slug: string;
  name: string;
  image?: string | null;
  parentId?: string | null;
  parentKey?: string | null;
  active: boolean;
};

export type ApiTeamMember = {
  id: number;
  name: string;
  mobile: string;
  role: string;
  staffRole: string | null;
};

export type ApiCoupon = {
  id: string;
  code: string;
  description?: string | null;
  discountType: "percent" | "fixed";
  value: number;
  maxDiscount?: number | null;
  minOrder: number;
  startsAt?: string | null;
  endsAt?: string | null;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  usedCount: number;
  firstOrderOnly: boolean;
  categorySlug?: string | null;
  brandSlug?: string | null;
  stackable: boolean;
  active: boolean;
};

export type CouponInput = {
  code: string;
  description?: string | null;
  discountType: "percent" | "fixed";
  value: number;
  maxDiscount?: number | null;
  minOrder?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  firstOrderOnly?: boolean;
  categorySlug?: string | null;
  brandSlug?: string | null;
  active?: boolean;
};

/**
 * Upload an image file to the API (multipart). Returns the stored URL.
 * Uses fetch directly (not apiFetch) so the browser sets the multipart
 * boundary instead of forcing application/json.
 */
export type UploadResult = {
  url: string;
  path: string;
  bytes?: number;
  originalBytes?: number;
  savedPct?: number;
  width?: number | null;
  height?: number | null;
  optimized?: boolean;
};

export async function uploadImage(
  file: File,
  folder?: "products" | "categories" | "brands" | "media",
): Promise<UploadResult> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new ApiError("API URL not configured", 0, null);
  }
  const form = new FormData();
  form.append("file", file);
  if (folder) form.append("folder", folder);

  const headers = new Headers();
  headers.set("Accept", "application/json");
  const token = getApiToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${base}/api/admin/uploads`, {
    method: "POST",
    headers,
    body: form,
  });

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const message =
      typeof body === "object" && body && "message" in body
        ? String((body as { message: string }).message)
        : `Upload failed (${res.status})`;
    throw new ApiError(message, res.status, body);
  }
  return body as UploadResult;
}

/** Client checkout handle returned for a prepaid order (see OrderService). */
export interface RazorpayCheckoutHandle {
  provider: "razorpay" | "cashfree";
  gatewayOrderId: string | null;
  key: string | null;
  sessionId: string | null;
  amount: number;
  currency: string;
  simulated: boolean;
}

export interface ApiOrderCreated {
  public_id: string;
  status: string;
  payment_method: string;
  total: number;
  currency?: string;
  razorpay_order_id?: string | null;
  /** Present only for prepaid orders that were initiated with a gateway. */
  gatewayCheckout?: RazorpayCheckoutHandle;
  [key: string]: unknown;
}

export interface ApiAccountProfile {
  id: number;
  name: string;
  email: string | null;
  mobile: string | null;
  whatsapp_opt_in: boolean;
  points_balance: number;
  created_at: string | null;
}

export interface AccountProfileInput {
  name: string;
  email: string | null;
  whatsapp_opt_in: boolean;
}

export interface ApiAddress {
  id: number;
  label: string | null;
  name: string;
  mobile: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  pincode: string;
  country: string;
  is_default: boolean;
}

export interface AddressInput {
  label?: string | null;
  name: string;
  mobile: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  pincode: string;
  country?: string;
  is_default?: boolean;
}

export interface ApiWishlistItem {
  productKey: string;
  title: string;
  price: number;
  image_url: string | null;
  category_slug: string | null;
  fulfillment_type: string | null;
  active: boolean;
}

export interface ApiPointsEntry {
  id: number;
  delta: number;
  reason: string;
  order_public_id: string | null;
  created_at: string | null;
}

export interface ApiPointsLedger {
  balance: number;
  history: ApiPointsEntry[];
}

export interface ApiDigitalCode {
  id: number;
  product_key: string;
  masked_code: string;
  status: string;
  order_id: number | null;
  assigned_at: string | null;
  created_at: string | null;
}

export interface ApiDigitalStock {
  product_key: string;
  available: number;
  assigned: number;
  reserved: number;
  total: number;
}

export interface ApiAccountDigitalCode {
  code: string;
  product_key: string;
  title: string | null;
  image_url: string | null;
  order_public_id: string | null;
  assigned_at: string | null;
}

export interface ApiCustomer {
  id: number;
  name: string;
  email: string | null;
  mobile: string | null;
  tags: string[];
  whatsapp_opt_in: boolean;
  orders_count: number;
  lifetime_value: number;
  last_order_at: string | null;
  created_at: string | null;
}

export interface ApiCustomerDetail extends ApiCustomer {
  points_balance: number;
  addresses: ApiAddress[];
  orders: { public_id: string; status: string; total: number; created_at: string | null }[];
}

export interface ApiActivityEntry {
  id: number;
  action: string;
  entityType: string;
  entityId: number | null;
  actor: string;
  meta: Record<string, unknown> | null;
  created_at: string | null;
}

export interface ApiReportSummary {
  days: number;
  revenue: number;
  orders: number;
  aov: number;
  prev_revenue: number;
  revenue_delta_pct: number | null;
}

export interface ApiReportSeriesPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface ApiReportSku {
  product_key: string;
  qty: number;
  revenue: number;
}

export interface ApiCmsPageSummary {
  id: string;
  path: string;
  title: string;
  status: string;
  updatedAt: string | null;
}

export interface ApiMediaAsset {
  id: number;
  url: string;
  path: string;
  folder: string;
  mime: string | null;
  bytes: number;
  width: number | null;
  height: number | null;
  created_at: string | null;
}

export const api = {
  health: () => apiFetch<{ ok: boolean }>("/health"),
  sendOtp: (mobile: string) =>
    apiFetch<{ ok: boolean; devCode?: string }>("/auth/otp/send", {
      method: "POST",
      body: JSON.stringify({ mobile }),
    }),
  verifyOtp: (mobile: string, code: string, name?: string) =>
    apiFetch<{
      token: string;
      user: {
        id: number;
        name: string;
        mobile: string;
        role: string;
        staffRole: string | null;
      };
    }>("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ mobile, code, name }),
    }),
  me: () =>
    apiFetch<{
      id: number;
      name: string;
      mobile: string;
      role: string;
      staffRole: string | null;
    }>("/auth/me"),
  settings: () => apiFetch<Record<string, unknown>>("/settings"),
  policies: () =>
    apiFetch<{
      shipping?: { title: string; body: string };
      returns?: { title: string; body: string };
    }>("/policies"),
  trackOrder: (body: { publicId: string; mobile: string }) =>
    apiFetch<Record<string, unknown>>("/track", {
      method: "POST",
      body: JSON.stringify({ public_id: body.publicId, mobile: body.mobile }),
    }),
  categories: () => apiFetch<{ data: ApiCategory[] }>("/categories"),
  brands: () => apiFetch<{ data: ApiBrand[] }>("/brands"),
  products: (params?: {
    category?: string;
    q?: string;
    page?: number;
    per_page?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set("category", params.category);
    if (params?.q) qs.set("q", params.q);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.per_page) qs.set("per_page", String(params.per_page));
    const suffix = qs.toString() ? `?${qs}` : "";
    return apiFetch<ApiPaginated<ApiProduct>>(`/products${suffix}`);
  },
  product: (keyOrSlug: string) => apiFetch<ApiProduct>(`/products/${keyOrSlug}`),
  checkoutPolicy: (ctx: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>("/checkout/policy", {
      method: "POST",
      body: JSON.stringify(ctx),
    }),
  createOrder: (payload: Record<string, unknown>) =>
    apiFetch<ApiOrderCreated>("/checkout/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  subscribeWaitlist: (productKey: string, mobile: string, email?: string) =>
    apiFetch<{ ok: boolean; in_stock?: boolean; message?: string }>("/waitlist", {
      method: "POST",
      body: JSON.stringify({ productKey, mobile, email }),
    }),
  checkoutQuote: (payload: Record<string, unknown>) =>
    apiFetch<{
      subtotal: number;
      discount: number;
      couponDiscount: number;
      couponCode: string | null;
      shipping: number;
      tax: number;
      total: number;
      deposit: number | null;
      currency: string;
    }>("/checkout/quote", { method: "POST", body: JSON.stringify(payload) }),
  // Fire-and-forget abandoned-cart capture (204). Server persists only when a
  // mobile is present.
  checkoutTrack: (payload: Record<string, unknown>) =>
    apiFetch<null>("/checkout/track", { method: "POST", body: JSON.stringify(payload) }),
  adminCheckoutSessions: (params?: { status?: string; mobile?: string; per_page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.mobile) qs.set("mobile", params.mobile);
    if (params?.per_page) qs.set("per_page", String(params.per_page));
    const suffix = qs.toString() ? `?${qs}` : "";
    return apiFetch<ApiPaginated<Record<string, unknown>>>(`/admin/checkout-sessions${suffix}`);
  },
  recoverCheckoutSession: (id: number) =>
    apiFetch<Record<string, unknown>>(`/admin/checkout-sessions/${id}/recover`, { method: "POST" }),
  patchCheckoutSession: (id: number, status: string) =>
    apiFetch<Record<string, unknown>>(`/admin/checkout-sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  accountOrders: (params?: { page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    const suffix = qs.toString() ? `?${qs}` : "";
    return apiFetch<ApiPaginated<Record<string, unknown>>>(`/account/orders${suffix}`);
  },
  accountOrder: (publicId: string) =>
    apiFetch<Record<string, unknown>>(`/account/orders/${encodeURIComponent(publicId)}`),

  // ---- Account facade (Phase 3B) ----
  accountProfile: () => apiFetch<ApiAccountProfile>("/account/profile"),
  updateAccountProfile: (patch: Partial<AccountProfileInput>) =>
    apiFetch<ApiAccountProfile>("/account/profile", {
      method: "PUT",
      body: JSON.stringify(patch),
    }),
  accountAddresses: () =>
    apiFetch<{ data: ApiAddress[] }>("/account/addresses").then((r) => r.data),
  createAddress: (input: AddressInput) =>
    apiFetch<ApiAddress>("/account/addresses", { method: "POST", body: JSON.stringify(input) }),
  updateAddress: (id: number, input: AddressInput) =>
    apiFetch<ApiAddress>(`/account/addresses/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  deleteAddress: (id: number) =>
    apiFetch<{ ok: boolean }>(`/account/addresses/${id}`, { method: "DELETE" }),
  setDefaultAddress: (id: number) =>
    apiFetch<ApiAddress>(`/account/addresses/${id}/default`, { method: "POST" }),
  accountWishlist: () =>
    apiFetch<{ data: ApiWishlistItem[] }>("/account/wishlist").then((r) => r.data),
  addWishlist: (productKey: string) =>
    apiFetch<{ ok: boolean }>("/account/wishlist", {
      method: "POST",
      body: JSON.stringify({ productKey }),
    }),
  removeWishlist: (productKey: string) =>
    apiFetch<{ ok: boolean }>(`/account/wishlist/${encodeURIComponent(productKey)}`, {
      method: "DELETE",
    }),
  accountPoints: () => apiFetch<ApiPointsLedger>("/account/points"),
  accountDigitalCodes: () =>
    apiFetch<{ data: ApiAccountDigitalCode[] }>("/account/digital-codes").then((r) => r.data),

  // ---- Admin: digital-code vault ----
  adminDigitalCodes: (params?: { productKey?: string; status?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.productKey) qs.set("productKey", params.productKey);
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    const suffix = qs.toString() ? `?${qs}` : "";
    return apiFetch<ApiPaginated<ApiDigitalCode>>(`/admin/digital-codes${suffix}`);
  },
  adminDigitalStock: () =>
    apiFetch<{ data: ApiDigitalStock[] }>("/admin/digital-codes/stock").then((r) => r.data),
  importDigitalCodes: (productKey: string, codes: string) =>
    apiFetch<{ imported: number; skipped: number }>("/admin/digital-codes/import", {
      method: "POST",
      body: JSON.stringify({ productKey, codes }),
    }),
  deleteDigitalCode: (id: number) =>
    apiFetch<{ ok: boolean }>(`/admin/digital-codes/${id}`, { method: "DELETE" }),

  // ---- Admin: customers ----
  adminCustomers: (params?: { search?: string; tag?: string; has_mobile?: boolean; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.tag) qs.set("tag", params.tag);
    if (params?.has_mobile) qs.set("has_mobile", "1");
    if (params?.page) qs.set("page", String(params.page));
    const suffix = qs.toString() ? `?${qs}` : "";
    return apiFetch<ApiPaginated<ApiCustomer>>(`/admin/customers${suffix}`);
  },
  adminCustomer: (id: number) => apiFetch<ApiCustomerDetail>(`/admin/customers/${id}`),

  // ---- Admin: activity + reporting ----
  adminActivity: (params?: { q?: string; entityType?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.entityType) qs.set("entityType", params.entityType);
    if (params?.page) qs.set("page", String(params.page));
    const suffix = qs.toString() ? `?${qs}` : "";
    return apiFetch<ApiPaginated<ApiActivityEntry>>(`/admin/activity${suffix}`);
  },
  reportSummary: (days?: number) =>
    apiFetch<ApiReportSummary>(`/admin/reports/summary${days ? `?days=${days}` : ""}`),
  reportSeries: (days?: number) =>
    apiFetch<{ data: ApiReportSeriesPoint[] }>(`/admin/reports/series${days ? `?days=${days}` : ""}`).then(
      (r) => r.data,
    ),
  reportTopSkus: () =>
    apiFetch<{ data: ApiReportSku[] }>("/admin/reports/top-skus").then((r) => r.data),

  // ---- Admin: media library ----
  adminMedia: (params?: { folder?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.folder) qs.set("folder", params.folder);
    if (params?.page) qs.set("page", String(params.page));
    const suffix = qs.toString() ? `?${qs}` : "";
    return apiFetch<ApiPaginated<ApiMediaAsset>>(`/admin/media${suffix}`);
  },
  deleteMedia: (id: number) => apiFetch<{ ok: boolean }>(`/admin/media/${id}`, { method: "DELETE" }),

  // ---- CMS pages ----
  adminCmsPages: () =>
    apiFetch<{ data: ApiCmsPageSummary[] }>("/admin/cms/pages").then((r) => r.data),
  adminCmsPage: (publicId: string) =>
    apiFetch<Record<string, unknown>>(`/admin/cms/pages/${encodeURIComponent(publicId)}`),
  upsertCmsPage: (payload: {
    id: string;
    path: string;
    title: string;
    status: string;
    document: Record<string, unknown>;
  }) => apiFetch<ApiCmsPageSummary>("/admin/cms/pages", { method: "POST", body: JSON.stringify(payload) }),
  deleteCmsPage: (publicId: string) =>
    apiFetch<{ ok: boolean }>(`/admin/cms/pages/${encodeURIComponent(publicId)}`, { method: "DELETE" }),
  publicCmsPage: (path: string) =>
    apiFetch<{ id: string; path: string; title: string; snapshot: Record<string, unknown> }>(
      `/cms/page?path=${encodeURIComponent(path)}`,
    ),
  adminSettings: () => apiFetch<Record<string, unknown>>("/admin/settings"),
  updateAdminSettings: (patch: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>("/admin/settings", {
      method: "PUT",
      body: JSON.stringify(patch),
    }),
  adminProducts: (params?: {
    category?: string;
    q?: string;
    page?: number;
    per_page?: number;
    active?: boolean;
  }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set("category", params.category);
    if (params?.q) qs.set("q", params.q);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.per_page) qs.set("per_page", String(params.per_page));
    if (params?.active !== undefined) qs.set("active", String(params.active));
    const suffix = qs.toString() ? `?${qs}` : "";
    return apiFetch<ApiPaginated<ApiProduct>>(`/admin/products${suffix}`);
  },
  adminTeam: () => apiFetch<{ data: ApiTeamMember[] }>("/admin/team"),
  updateTeamMember: (
    id: number,
    payload: { role?: string; staffRole?: string | null },
  ) =>
    apiFetch<ApiTeamMember>(`/admin/team/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  adminCategories: () => apiFetch<{ data: ApiCategory[] }>("/admin/categories"),
  upsertCategory: (payload: {
    key?: string;
    slug: string;
    name: string;
    description?: string;
    imageUrl?: string | null;
    parentId?: string | null;
    active?: boolean;
  }) => {
    const parentId = payload.parentId ? Number(payload.parentId) : null;
    if (payload.key) {
      return apiFetch<ApiCategory>(`/admin/categories/${encodeURIComponent(payload.key)}`, {
        method: "PUT",
        body: JSON.stringify({
          name: payload.name,
          description: payload.description,
          imageUrl: payload.imageUrl,
          parentId,
          active: payload.active,
        }),
      });
    }
    return apiFetch<ApiCategory>("/admin/categories", {
      method: "POST",
      body: JSON.stringify({
        slug: payload.slug,
        name: payload.name,
        description: payload.description,
        imageUrl: payload.imageUrl,
        parentId,
        active: payload.active,
      }),
    });
  },
  deleteCategory: (slug: string) =>
    apiFetch<{ ok: boolean }>(`/admin/categories/${encodeURIComponent(slug)}`, { method: "DELETE" }),
  adminBrands: () => apiFetch<{ data: ApiBrand[] }>("/admin/brands"),
  upsertBrand: (payload: {
    key?: string;
    name: string;
    imageUrl?: string | null;
    parentId?: string | null;
    active?: boolean;
  }) => {
    const parentId = payload.parentId ? Number(payload.parentId) : null;
    if (payload.key) {
      return apiFetch<ApiBrand>(`/admin/brands/${encodeURIComponent(payload.key)}`, {
        method: "PUT",
        body: JSON.stringify({ name: payload.name, imageUrl: payload.imageUrl, parentId, active: payload.active }),
      });
    }
    return apiFetch<ApiBrand>("/admin/brands", {
      method: "POST",
      body: JSON.stringify({ name: payload.name, imageUrl: payload.imageUrl, parentId, active: payload.active }),
    });
  },
  deleteBrand: (slug: string) =>
    apiFetch<{ ok: boolean }>(`/admin/brands/${encodeURIComponent(slug)}`, { method: "DELETE" }),
  adminCoupons: () => apiFetch<{ data: ApiCoupon[] }>("/admin/coupons"),
  createCoupon: (payload: CouponInput) =>
    apiFetch<ApiCoupon>("/admin/coupons", { method: "POST", body: JSON.stringify(payload) }),
  updateCoupon: (code: string, payload: Partial<CouponInput>) =>
    apiFetch<ApiCoupon>(`/admin/coupons/${encodeURIComponent(code)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteCoupon: (code: string) =>
    apiFetch<{ ok: boolean }>(`/admin/coupons/${encodeURIComponent(code)}`, { method: "DELETE" }),
  validateCoupon: (payload: {
    code: string;
    subtotal: number;
    mobile?: string | null;
    categorySlugs?: string[];
    brandSlugs?: string[];
  }) =>
    apiFetch<{ valid: boolean; reason: string | null; discount: number; code: string }>(
      "/checkout/coupon",
      { method: "POST", body: JSON.stringify(payload) },
    ),
  checkoutRules: () =>
    apiFetch<{ data: ApiCheckoutRule[] }>("/admin/checkout-rules"),
  upsertCheckoutRule: (rule: ApiCheckoutRule) =>
    apiFetch<ApiCheckoutRule>(
      rule.id
        ? `/admin/checkout-rules/${rule.id}`
        : "/admin/checkout-rules",
      {
        method: rule.id ? "PUT" : "POST",
        body: JSON.stringify(rule),
      },
    ),
  deleteCheckoutRule: (id: string) =>
    apiFetch<{ ok: boolean }>(`/admin/checkout-rules/${id}`, {
      method: "DELETE",
    }),
  adminOrders: (params?: { status?: string; page?: number; per_page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.per_page) qs.set("per_page", String(params.per_page));
    const suffix = qs.toString() ? `?${qs}` : "";
    return apiFetch<ApiPaginated<Record<string, unknown>>>(`/admin/orders${suffix}`);
  },
  adminOrder: (publicId: string) =>
    apiFetch<Record<string, unknown>>(`/admin/orders/${encodeURIComponent(publicId)}`),
  patchOrderStatus: (
    publicId: string,
    payload: { status: string; tracking?: string; notes?: string },
  ) =>
    apiFetch<Record<string, unknown>>(
      `/admin/orders/${encodeURIComponent(publicId)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    ),
  exportCatalog: () => apiFetch<Record<string, unknown>>("/admin/export"),
  importCatalog: (payload: Record<string, unknown>, dryRun = true) =>
    apiFetch<Record<string, unknown>>("/admin/import", {
      method: "POST",
      body: JSON.stringify({ ...payload, dryRun }),
    }),

  // Automations engine
  automations: () => apiFetch<{ data: ApiAutomation[] }>("/admin/automations"),
  upsertAutomation: (rule: ApiAutomation) =>
    apiFetch<ApiAutomation>(
      rule.id ? `/admin/automations/${rule.id}` : "/admin/automations",
      { method: rule.id ? "PUT" : "POST", body: JSON.stringify(rule) },
    ),
  deleteAutomation: (id: string) =>
    apiFetch<{ ok: boolean }>(`/admin/automations/${id}`, { method: "DELETE" }),
  testAutomation: (id: string) =>
    apiFetch<{ ok: boolean }>(`/admin/automations/${id}/test`, { method: "POST" }),
  automationRuns: () =>
    apiFetch<{ data: ApiAutomationRun[] }>("/admin/automation-runs"),

  // Integrations
  integrations: () => apiFetch<{ data: ApiIntegration[] }>("/admin/integrations"),
  updateIntegration: (key: string, patch: Record<string, unknown>) =>
    apiFetch<ApiIntegration>(`/admin/integrations/${key}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    }),
  connectIntegration: (key: string, body: Record<string, unknown> = {}) =>
    apiFetch<ApiIntegration>(`/admin/integrations/${key}/connect`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  testIntegration: (key: string) =>
    apiFetch<{ ok: boolean; message: string }>(`/admin/integrations/${key}/test`, {
      method: "POST",
    }),

  // Message templates + outbound log
  messageTemplates: () =>
    apiFetch<{ data: ApiMessageTemplate[] }>("/admin/message-templates"),
  upsertMessageTemplate: (tpl: ApiMessageTemplate) =>
    apiFetch<ApiMessageTemplate>(
      tpl.id ? `/admin/message-templates/${tpl.id}` : "/admin/message-templates",
      { method: tpl.id ? "PUT" : "POST", body: JSON.stringify(tpl) },
    ),
  deleteMessageTemplate: (id: number) =>
    apiFetch<{ ok: boolean }>(`/admin/message-templates/${id}`, { method: "DELETE" }),
  previewTemplate: (id: number, context: Record<string, unknown>) =>
    apiFetch<{ ok: boolean; variables: Record<string, string>; body_preview: string | null }>(
      `/admin/message-templates/${id}/preview`,
      { method: "POST", body: JSON.stringify({ context }) },
    ),
  messagesLog: (params?: { channel?: string; status?: string; per_page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.channel) qs.set("channel", params.channel);
    if (params?.status) qs.set("status", params.status);
    if (params?.per_page) qs.set("per_page", String(params.per_page));
    const suffix = qs.toString() ? `?${qs}` : "";
    return apiFetch<ApiPaginated<Record<string, unknown>>>(`/admin/messages${suffix}`);
  },
};

export type ApiAutomation = {
  id?: string;
  name: string;
  description?: string;
  trigger: string;
  enabled: boolean;
  priority: number;
  conditions: Array<{ field: string; operator: string; value: string }>;
  actions: Array<{ type: string; value?: string }>;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiAutomationRun = {
  id: string;
  ruleId: string | null;
  ruleName: string;
  trigger: string;
  at: string;
  status: string;
  summary: string | null;
  delivery: string | null;
};

export type ApiIntegration = {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  status: string;
  enabled: boolean;
  lastSync?: string | null;
  accountLabel?: string | null;
  apiKeyMasked?: string | null;
  webhookUrl?: string | null;
};

export type ApiMessageTemplate = {
  id?: number;
  event_key: string;
  channel: string;
  name: string;
  provider_template_name?: string | null;
  provider_template_id?: string | null;
  namespace?: string | null;
  language?: string;
  variables?: Array<{ key: string; source?: string; required?: boolean }>;
  body_preview?: string | null;
  status: string;
  enabled: boolean;
};

export type ApiProduct = {
  id: number;
  key: string;
  slug: string;
  title: string;
  description?: string | null;
  category_slug?: string | null;
  brand_slug?: string | null;
  price: number;
  mrp?: number | null;
  stock: number;
  fulfillment_type: string;
  image_url?: string | null;
  active: boolean;
  badges?: { kind: string; label: string }[];
  gallery?: string[];
};

export type ApiCheckoutRule = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  conditions: unknown[];
  actions: unknown[];
  conditionMode?: string;
  script?: string | null;
  experimentId?: string | null;
  variant?: string | null;
  trafficPct?: number | null;
};

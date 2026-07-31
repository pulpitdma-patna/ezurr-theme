/**
 * Laravel API client for Ezurr.
 * Enable with NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
 * When unset, callers should fall back to localStorage mocks.
 *
 * With NEXT_PUBLIC_API_PROXY=1 (default in production when the API URL is set),
 * browser fetch goes same-origin `/api/...` and Next rewrites to the Laravel host.
 * Server-side code still uses the absolute upstream via getApiUpstreamUrl().
 *
 * Browser discovery (see apiOrigin.ts): same-origin `/api/health` can enable the
 * client without an absolute URL; a pasted localStorage override forces direct
 * CORS to Laravel when the proxy path is broken.
 */

import {
  getApiUrlOverride,
  getEnvApiUpstreamUrl,
  isSameOriginApiDiscovered,
} from "@/lib/apiOrigin";

const TOKEN_KEY = "ezurr_api_token";

export {
  clearApiUrlOverride,
  clearSameOriginApiDiscovered,
  getApiUrlOverride,
  getEnvApiUpstreamUrl,
  hasApiUrlOverride,
  isEzurrHealthBody,
  isSameOriginApiDiscovered,
  markSameOriginApiDiscovered,
  normalizeApiOrigin,
  probeSameOriginApiHealth,
  setApiUrlOverride,
} from "@/lib/apiOrigin";

/**
 * Absolute Laravel origin for RSC, image hosts, and direct CORS.
 * Explicit paste override wins over env so a wrong build-time URL can be
 * corrected in the browser without a redeploy. Same-origin discovery has no
 * absolute upstream — use getApiBaseUrl() for fetches in that mode.
 */
export function getApiUpstreamUrl(): string | null {
  return getApiUrlOverride() ?? getEnvApiUpstreamUrl();
}

/**
 * Whether the browser should call same-origin `/api` (proxied) instead of the
 * Laravel origin directly. On in production when the API URL is set; override
 * with NEXT_PUBLIC_API_PROXY=0|1. A paste override always uses direct CORS.
 */
export function isApiProxyEnabled(): boolean {
  if (getApiUrlOverride()) return false;
  if (isSameOriginApiDiscovered() && !getEnvApiUpstreamUrl()) return true;
  const upstream = getEnvApiUpstreamUrl();
  if (!upstream) return false;
  const flag = process.env.NEXT_PUBLIC_API_PROXY?.trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  if (flag === "1" || flag === "true" || flag === "on") return true;
  return process.env.NODE_ENV === "production";
}

/**
 * Base URL for apiFetch. Empty string means same-origin (proxy mode) in the
 * browser. Server/RSC always gets the absolute upstream — Next rewrites only
 * apply to requests that hit the UI origin.
 * null means the API is not configured.
 */
export function getApiBaseUrl(): string | null {
  if (typeof window !== "undefined") {
    if (getApiUrlOverride()) return getApiUrlOverride();
    if (isApiProxyEnabled()) {
      // Env proxy or same-origin discovery — browser hits the storefront origin.
      if (getEnvApiUpstreamUrl() || isSameOriginApiDiscovered()) return "";
    }
    if (isSameOriginApiDiscovered()) return "";
  }

  const upstream = getApiUpstreamUrl();
  if (!upstream) {
    if (typeof window !== "undefined" && isSameOriginApiDiscovered()) return "";
    return null;
  }
  if (typeof window !== "undefined" && isApiProxyEnabled()) return "";
  return upstream;
}

export function isApiEnabled(): boolean {
  return getApiBaseUrl() !== null;
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

/**
 * Best-effort server-side token revocation, fired on sign-out.
 *
 * `POST /auth/logout` has always existed and correctly revokes, but nothing
 * called it — signing out only cleared localStorage, leaving the token valid
 * for its full TTL. `keepalive` lets the request outlive the navigation that
 * normally follows sign-out; failures are swallowed because the local session
 * must clear regardless of whether the network call lands.
 */
export function revokeApiToken(): void {
  if (!isApiEnabled() || !getApiToken()) return;
  void apiFetch("/auth/logout", { method: "POST", keepalive: true }).catch(() => {
    /* best effort — local sign-out proceeds either way */
  });
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
  // Empty string is valid: same-origin proxy mode.
  if (base === null) {
    throw new ApiError("API URL not configured", 0, null);
  }

  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = getApiToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");

  const apiPath = `/api${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(`${base}${apiPath}`, {
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
  /** Whether this category has a storefront page. */
  listable?: boolean;
  sortOrder?: number;
  /** Where that page is — /games for the legacy five, /categories/<slug> otherwise. */
  href?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  /** Admin list only — what a customer would actually see, vs the catalogue total. */
  visibleCount?: number;
  /** Admin list only — the public /categories feed does not carry it. */
  productCount?: number;
};

export type ApiBrand = {
  id: string;
  slug: string;
  name: string;
  image?: string | null;
  parentId?: string | null;
  parentKey?: string | null;
  active: boolean;
  /** Present on admin brand index when the API counts products per brand. */
  product_count?: number;
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
  // Empty string is valid: same-origin proxy mode.
  if (base === null) {
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
  /** Cashfree Checkout.js mode when provider is cashfree. */
  mode?: "sandbox" | "production" | null;
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
  /** Derived server-side: default saved address, else the latest order's shipping city. */
  city: string | null;
  tags: string[];
  banned: boolean;
  notes: string | null;
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

/**
 * An UNCLAIMED store answers with every field. A claimed one answers with
 * `needsSetup: false` and `storeName` alone — this route stays public forever,
 * so it must stop describing the machine it runs on the moment it has an owner.
 */
export interface ApiInstallState {
  needsSetup: boolean;
  storeName: string | null;
  ready?: { database: boolean; schema: boolean; content: boolean };
  requiresClaimToken?: boolean;
  simulating?: { name: string; variable: string }[];
}

export interface ApiSystemHealth {
  version: {
    code: string;
    installed: string | null;
    installedAt: string | null;
    updateNeeded: boolean;
  };
  database: { connected: boolean; driver: string };
  pendingMigrations: number;
  owner: { exists: boolean; count: number };
  writable: { env: boolean; envPath: string; storage: boolean; bootstrapCache: boolean };
  queue: { connection: string; needsWorker: boolean; pendingJobs: number };
  /** `healthy: null` means no heartbeat has ever been recorded — unknown, not fine. */
  scheduler: { lastRunAt: string | null; healthy: boolean | null };
  configWarnings: { id: string; title: string; detail: string; variable: string | null }[];
  integrations: { name: string; live: boolean; driver: string; variable: string }[];
}

/** Either an explicit date range or a rolling number of days. */
export type ReportWindow = { from: string; to: string } | { days: number };

function reportQuery(window?: ReportWindow): string {
  if (!window) return "";
  if ("days" in window) return `?days=${window.days}`;
  return `?from=${encodeURIComponent(window.from)}&to=${encodeURIComponent(window.to)}`;
}

/** The first screen of the working day — see TodayController. */
export interface ApiToday {
  /** When this staff member last looked. Null on a first visit. */
  since: string | null;
  newOrders: {
    id: string;
    customerName: string;
    what: string;
    status: string;
    placedAt: string | null;
    total: number;
    money: { sentence: string; amountPaid: number; balanceDue: number };
  }[];
  waiting: {
    needsOk: number;
    toPack: number;
    toSend: number;
    moneyProblem: number;
    outOfStock: number;
    lowStock: number;
  };
  money: {
    receivedToday: number;
    toCollectToday: number;
    ordersToday: number;
    monthToDate: number;
  };
  simulating: { messaging: boolean; payments: boolean };
}

export const api = {
  health: () => apiFetch<{ ok: boolean }>("/health"),
  /**
   * `seen: false` reads without moving the "last looked" marker, so a second tab
   * cannot erase what the first one is showing.
   */
  today: (opts?: { seen?: boolean }) =>
    apiFetch<ApiToday>(`/admin/today${opts?.seen === false ? "?seen=0" : ""}`),
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
  /** Mega-menu payload: categories x brands with live counts. See lib/navigation.ts. */
  navigation: () => apiFetch<unknown>("/navigation"),
  products: (params?: {
    category?: string;
    brand?: string;
    /** Promotional Shopify collection, e.g. "lowest-price-guarantee". */
    collection?: string;
    q?: string;
    page?: number;
    per_page?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set("category", params.category);
    if (params?.brand) qs.set("brand", params.brand);
    if (params?.collection) qs.set("collection", params.collection);
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
  checkoutOrderStatus: (publicId: string, mobile: string) => {
    const qs = new URLSearchParams({ mobile });
    return apiFetch<{ public_id: string; status: string }>(
      `/checkout/orders/${encodeURIComponent(publicId)}/status?${qs}`,
    );
  },
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
      /** Payable online now (the deposit when there is one, else the total). */
      dueNow?: number;
      /** Still owed after the advance — at the door, or on release. */
      balanceDue?: number;
      /** Shopper-facing explanation of the advance, e.g. "Pay ₹100 now…". */
      depositLabel?: string | null;
      /** Net of GST. Below `subtotal` when catalogue prices include tax. */
      taxableValue?: number | null;
      /** Discount from the prepaid rule; sums with couponDiscount to discount. */
      prepaidDiscount?: number;
      /** Whether catalogue prices already contain GST. */
      taxInclusive?: boolean;
      taxRatePct?: number;
      /**
       * Totals for every allowed payment method, so the payment tiles can show
       * a real counterfactual instead of recomputing money client-side.
       */
      methods?: Record<
        string,
        {
          subtotal: number;
          discount: number;
          couponDiscount: number;
          prepaidDiscount: number;
          shipping: number;
          taxableValue: number | null;
          tax: number;
          total: number;
          deposit: number | null;
          dueNow: number;
          balanceDue: number;
        }
      >;
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
  accountCancelOrder: (publicId: string) =>
    apiFetch<{ cancelled: boolean; refundRequired: boolean; order: Record<string, unknown> }>(
      `/account/orders/${encodeURIComponent(publicId)}/cancel`,
      { method: "POST" },
    ),

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
  adminDigitalCodes: (params?: {
    productKey?: string;
    status?: string;
    page?: number;
    per_page?: number;
    order_id?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.productKey) qs.set("productKey", params.productKey);
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.per_page) qs.set("per_page", String(params.per_page));
    if (params?.order_id != null) qs.set("order_id", String(params.order_id));
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
  /** Partial: omitted keys are left untouched server-side. Needs customers.write. */
  updateCustomer: (id: number, payload: { tags?: string[]; notes?: string | null; banned?: boolean }) =>
    apiFetch<ApiCustomerDetail>(`/admin/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  // ---- Admin: activity + reporting ----
  adminActivity: (params?: { q?: string; entityType?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.entityType) qs.set("entityType", params.entityType);
    if (params?.page) qs.set("page", String(params.page));
    const suffix = qs.toString() ? `?${qs}` : "";
    return apiFetch<ApiPaginated<ApiActivityEntry>>(`/admin/activity${suffix}`);
  },
  /**
   * `window` sends the actual dates the owner picked. Passing only a day COUNT
   * asked the server for a rolling window ending today, so choosing "1-31 May"
   * returned the last 31 days under a May label.
   */
  reportSummary: (window?: ReportWindow) =>
    apiFetch<ApiReportSummary>(`/admin/reports/summary${reportQuery(window)}`),
  reportSeries: (window?: ReportWindow) =>
    apiFetch<{ data: ApiReportSeriesPoint[] }>(`/admin/reports/series${reportQuery(window)}`).then(
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
  // ---- Setup + system health ----
  /** Public forever. A claimed store answers with needsSetup:false and nothing else. */
  installState: () => apiFetch<ApiInstallState>("/install/state"),
  /**
   * Claims an unclaimed store: creates the owner and returns a working token.
   * Refused permanently once an owner exists.
   */
  installComplete: (payload: {
    storeName: string;
    ownerName: string;
    ownerMobile: string;
    claimToken?: string;
  }) =>
    apiFetch<{ token: string; user: { id: number; name: string; mobile: string; role: string; staffRole: string } }>(
      "/install/complete",
      { method: "POST", body: JSON.stringify(payload) },
    ),
  /** Owner-only. Names the env path and every integration still simulating. */
  systemHealth: () => apiFetch<ApiSystemHealth>("/admin/system/health"),

  adminSettings: () => apiFetch<Record<string, unknown>>("/admin/settings"),
  updateAdminSettings: (patch: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>("/admin/settings", {
      method: "PUT",
      body: JSON.stringify(patch),
    }),
  adminProducts: (params?: {
    category?: string;
    brand?: string;
    q?: string;
    page?: number;
    per_page?: number;
    active?: boolean;
  }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set("category", params.category);
    if (params?.brand) qs.set("brand", params.brand);
    if (params?.q) qs.set("q", params.q);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.per_page) qs.set("per_page", String(params.per_page));
    if (params?.active !== undefined) qs.set("active", String(params.active));
    const suffix = qs.toString() ? `?${qs}` : "";
    return apiFetch<ApiPaginated<ApiProduct>>(`/admin/products${suffix}`);
  },
  adminTeam: () => apiFetch<{ data: ApiTeamMember[] }>("/admin/team"),
  inviteTeamMember: (payload: {
    mobile: string;
    name?: string;
    staffRole: "owner" | "manager" | "support" | "viewer";
  }) =>
    apiFetch<ApiTeamMember>("/admin/team/invite", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
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
    /** Whether this category gets a storefront page at all. */
    listable?: boolean;
    metaTitle?: string | null;
    metaDescription?: string | null;
  }) => {
    const parentId = payload.parentId ? Number(payload.parentId) : null;
    // Only sent when the caller set them, so a screen that does not know about
    // these fields cannot blank them.
    const pageFields = {
      ...(payload.listable !== undefined ? { listable: payload.listable } : {}),
      ...(payload.metaTitle !== undefined ? { metaTitle: payload.metaTitle } : {}),
      ...(payload.metaDescription !== undefined
        ? { metaDescription: payload.metaDescription }
        : {}),
    };
    if (payload.key) {
      return apiFetch<ApiCategory>(`/admin/categories/${encodeURIComponent(payload.key)}`, {
        method: "PUT",
        body: JSON.stringify({
          ...pageFields,
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
    /**
     * Send the cart lines whenever they are known: the server prices them from
     * its own catalogue and ignores `subtotal`, so the previewed discount is
     * the one the order will actually apply.
     */
    items?: { productKey: string; qty: number }[];
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
  /**
   * `bucket` asks for a pile of work — the orders to accept, to pack, to send —
   * rather than a status. The server groups the statuses that share one next
   * move, which is what makes a bulk action legal for every row it can reach.
   * Counts for every bucket come back on the same response as `buckets`.
   */
  adminOrders: (params?: {
    bucket?: string;
    status?: string;
    search?: string;
    mobile?: string;
    page?: number;
    per_page?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.bucket) qs.set("bucket", params.bucket);
    if (params?.status) qs.set("status", params.status);
    if (params?.search) qs.set("search", params.search);
    if (params?.mobile) qs.set("mobile", params.mobile);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.per_page) qs.set("per_page", String(params.per_page));
    const suffix = qs.toString() ? `?${qs}` : "";
    return apiFetch<ApiPaginated<Record<string, unknown>> & { buckets?: Record<string, number> }>(
      `/admin/orders${suffix}`,
    );
  },
  adminOrder: (publicId: string) =>
    apiFetch<Record<string, unknown>>(`/admin/orders/${encodeURIComponent(publicId)}`),
  // Printable documents. Two calls rather than one typed by argument, so the
  // caller gets the right payload shape without narrowing a union.
  adminOrderInvoice: (publicId: string) =>
    apiFetch<ApiInvoiceDocument>(
      `/admin/orders/${encodeURIComponent(publicId)}/document?type=invoice`,
    ),
  adminOrderPackingSlip: (publicId: string) =>
    apiFetch<ApiPackingSlipDocument>(
      `/admin/orders/${encodeURIComponent(publicId)}/document?type=packing_slip`,
    ),
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
  adminRefundOrder: (publicId: string, amount?: number) =>
    apiFetch<{
      order: Record<string, unknown>;
      refund: Record<string, unknown>;
      simulated: boolean;
      full: boolean;
    }>(`/admin/orders/${encodeURIComponent(publicId)}/refund`, {
      method: "POST",
      body: JSON.stringify(amount != null ? { amount } : {}),
    }),
  adminCreateShipment: (publicId: string) =>
    apiFetch<{
      order: Record<string, unknown>;
      awb: string;
      simulated: boolean;
      label_url?: string | null;
    }>(`/admin/orders/${encodeURIComponent(publicId)}/shipment`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
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
  integration: (key: string) =>
    apiFetch<ApiIntegration>(`/admin/integrations/${key}`),
  updateIntegration: (key: string, patch: ApiIntegrationPatch) =>
    apiFetch<ApiIntegration>(`/admin/integrations/${key}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    }),
  connectIntegration: (key: string, body: ApiIntegrationPatch = {}) =>
    apiFetch<ApiIntegration>(`/admin/integrations/${key}/connect`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  testIntegration: (key: string) =>
    apiFetch<ApiIntegrationTestResult>(`/admin/integrations/${key}/test`, {
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

/**
 * One admin-configurable input, declared by the API. The schema is server-side
 * on purpose: only the server knows which credential key each provider client
 * reads, and the previous drawer wrote `credentials.api_key`, which nothing did.
 *
 * Secrets are write-only — a secret field carries `configured` (and, for
 * non-password types, a last-4 `hint`) but never a value.
 */
export type ApiIntegrationField = {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "select";
  scope: "config" | "credential";
  required: boolean;
  secret: boolean;
  /** Resolved from env or another admin page; the drawer renders it disabled. */
  readOnly: boolean;
  envVar: string | null;
  help: string | null;
  configured: boolean;
  /** True when DB is empty but a legacy env/config fallback would still work. */
  viaFallback?: boolean;
  value: string | null;
  hint?: string;
  options?: { value: string; label: string }[];
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
  webhookUrl?: string | null;
  config?: Record<string, unknown>;
  /** 'log' = the provider client simulates every call and contacts nobody. */
  driver?: "log" | "live";
  fields?: ApiIntegrationField[];
  missingRequired?: string[];
};

/**
 * Omitted keys keep their stored value. JSON `null` clears an optional field.
 * Do not send empty strings to clear — omit the key to leave it untouched.
 */
export type ApiIntegrationPatch = {
  enabled?: boolean;
  status?: string;
  accountLabel?: string | null;
  config?: Record<string, string | null>;
  credentials?: Record<string, string | null>;
};

export type ApiIntegrationTestResult = {
  ok: boolean;
  simulated: boolean;
  driver?: string;
  message: string;
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
  /**
   * Path of the primary category's storefront page, or null when it has none.
   *
   * Only the single-product endpoint sends it — resolving it costs a query, so
   * appending it to a 250-row listing would fire 250.
   */
  category_href?: string | null;
  brand_slug?: string | null;
  /** As the merchant entered it — may be net of GST. Not for display. */
  price: number;
  mrp?: number | null;
  /** null = inherit the store default. */
  tax_inclusive?: boolean | null;
  /**
   * What the customer actually pays, GST included. Always display this: in
   * India the advertised price must be the all-inclusive amount payable.
   * Falls back to `price` on older payloads.
   */
  payable_price?: number;
  payable_mrp?: number | null;
  stock: number;
  fulfillment_type: string;
  image_url?: string | null;
  active: boolean;
  badges?: { kind: string; label: string }[];
  gallery?: string[];
  /** Import provenance — carries shopify_tags/shopify_collections. */
  meta?: Record<string, unknown> | null;
  created_at?: string | null;
};

/** The figure to advertise for a product — never the raw `price` column. */
export function payablePrice(p: Pick<ApiProduct, "price" | "payable_price">): number {
  return p.payable_price ?? p.price;
}

/** Compare-at price on the same basis, so any discount badge reads true. */
export function payableMrp(
  p: Pick<ApiProduct, "mrp" | "payable_mrp">,
): number | null | undefined {
  return p.payable_mrp ?? p.mrp;
}

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

// ---- Printable order documents (invoice / packing slip) --------------------
// All amounts are integer rupees, exactly as stored on the order. The server is
// authoritative — nothing here is recomputed client-side.

export type ApiDocumentParty = {
  name: string | null;
  addressLines: string[];
  city: string | null;
  state: string | null;
  pincode: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  country?: string | null;
  /** Present on the invoice seller block only. */
  gstin?: string;
  pan?: string;
};

export type ApiDocumentLine = {
  sku: string | null;
  title: string | null;
  qty: number;
  fulfillmentType: string | null;
  /** Blank when the product carries no HSN — never invented. */
  hsn: string;
  /** Invoice only; the packing slip omits money entirely. */
  unitPrice?: number;
  lineTotal?: number;
};

export type ApiDocumentOrder = {
  publicId: string;
  status: string;
  placedAt: string | null;
  paymentMethod: string | null;
  carrierName: string | null;
  tracking: string | null;
  awb: string | null;
  /** Packing slip only. */
  lineCount?: number;
  unitCount?: number;
};

export type ApiDocumentTaxComponent = {
  code: string;
  label: string;
  ratePct: number;
  amount: number;
};

export type ApiInvoiceDocument = {
  type: "invoice";
  title: string;
  invoiceNumber: string;
  invoiceDate: string | null;
  currency: string;
  order: ApiDocumentOrder;
  seller: ApiDocumentParty;
  buyer: ApiDocumentParty;
  items: ApiDocumentLine[];
  totals: {
    linesTotal: number;
    subtotal: number;
    discount: number;
    shipping: number;
    taxableValue: number;
    tax: number;
    total: number;
  };
  tax: {
    ratePct: number;
    mode: "cgst_sgst" | "igst";
    sellerState: string | null;
    placeOfSupply: string | null;
    stateResolved: boolean;
    /** Why the split fell back to IGST, when it did. */
    note: string | null;
    taxableValue: number;
    components: ApiDocumentTaxComponent[];
    total: number;
  };
  payment: {
    method: string | null;
    depositAmount: number;
    amountPaid: number;
    balanceDue: number;
    balanceLabel: string;
  };
  template: {
    logoUrl: string;
    declaration: string;
    footerNote: string;
    signatureLine: boolean;
  };
};

export type ApiPackingSlipDocument = {
  type: "packing_slip";
  title: string;
  order: ApiDocumentOrder;
  seller: ApiDocumentParty;
  shipTo: ApiDocumentParty;
  items: ApiDocumentLine[];
  template: {
    logoUrl: string;
    footerNote: string;
    signatureLine: boolean;
  };
};

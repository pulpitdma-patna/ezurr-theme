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
  active: boolean;
};

export type ApiBrand = {
  id: string;
  slug: string;
  name: string;
  active: boolean;
};

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
    apiFetch<Record<string, unknown>>("/checkout/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  accountOrders: (params?: { page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    const suffix = qs.toString() ? `?${qs}` : "";
    return apiFetch<ApiPaginated<Record<string, unknown>>>(`/account/orders${suffix}`);
  },
  accountOrder: (publicId: string) =>
    apiFetch<Record<string, unknown>>(`/account/orders/${encodeURIComponent(publicId)}`),
  adminSettings: () => apiFetch<Record<string, unknown>>("/admin/settings"),
  updateAdminSettings: (patch: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>("/admin/settings", {
      method: "PUT",
      body: JSON.stringify(patch),
    }),
  adminProducts: (params?: { category?: string; q?: string; page?: number; active?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set("category", params.category);
    if (params?.q) qs.set("q", params.q);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.active !== undefined) qs.set("active", String(params.active));
    const suffix = qs.toString() ? `?${qs}` : "";
    return apiFetch<ApiPaginated<ApiProduct>>(`/admin/products${suffix}`);
  },
  adminCategories: () => apiFetch<{ data: ApiCategory[] }>("/admin/categories"),
  upsertCategory: (payload: {
    key?: string;
    slug: string;
    name: string;
    description?: string;
    active?: boolean;
  }) => {
    if (payload.key) {
      return apiFetch<ApiCategory>(`/admin/categories/${encodeURIComponent(payload.key)}`, {
        method: "PUT",
        body: JSON.stringify({
          name: payload.name,
          description: payload.description,
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
        active: payload.active,
      }),
    });
  },
  adminBrands: () => apiFetch<{ data: ApiBrand[] }>("/admin/brands"),
  upsertBrand: (payload: { key?: string; name: string; active?: boolean }) => {
    if (payload.key) {
      return apiFetch<ApiBrand>(`/admin/brands/${encodeURIComponent(payload.key)}`, {
        method: "PUT",
        body: JSON.stringify({ name: payload.name, active: payload.active }),
      });
    }
    return apiFetch<ApiBrand>("/admin/brands", {
      method: "POST",
      body: JSON.stringify({ name: payload.name, active: payload.active }),
    });
  },
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
  adminOrders: (params?: { status?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
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

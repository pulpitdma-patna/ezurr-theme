import {
  adminCoupons,
  adminCustomers,
  adminDigitalCodes,
  adminIntegrations,
  adminInventoryLedger,
  adminOrders,
  buildSeedCatalog,
  defaultAdminSettings,
  deriveAlerts,
  deriveAnalyticsSeries,
  formatInr,
  orderStatusLabels,
  parsePrice,
  recomputeCustomerMetrics,
  type AdminBrandRecord,
  type AdminActivityEntry,
  type AdminAutomationRule,
  type AdminAutomationRun,
  type AutomationAction,
  type AutomationCondition,
  type AutomationTrigger,
  type AdminCatalogRow,
  type AdminCategoryRecord,
  type AdminCoupon,
  type AdminCustomer,
  type AdminDigitalCode,
  type AdminIntegration,
  type AdminInventoryLedgerEntry,
  type AdminOrder,
  type AdminOrderStatus,
  type AdminProductCategory,
  type AdminProductStatus,
  type AdminSettings,
  seedAdminBrands,
  seedAdminCategories,
} from "@/data/admin";

export const STORAGE_KEY = "ezurr_admin_store";
export const STORE_VERSION = 6;

export type AdminStoreState = {
  version: number;
  products: AdminCatalogRow[];
  orders: AdminOrder[];
  customers: AdminCustomer[];
  coupons: AdminCoupon[];
  digitalCodes: AdminDigitalCode[];
  ledger: AdminInventoryLedgerEntry[];
  categories: AdminCategoryRecord[];
  brands: AdminBrandRecord[];
  settings: AdminSettings;
  integrations: AdminIntegration[];
  automations: AdminAutomationRule[];
  automationRuns: AdminAutomationRun[];
  activityLog: AdminActivityEntry[];
};

type Listener = () => void;

function createSeedState(): AdminStoreState {
  const products = buildSeedCatalog();
  const orders = structuredClone(adminOrders);
  const customers = recomputeCustomerMetrics(
    structuredClone(adminCustomers),
    orders,
  );
  return {
    version: STORE_VERSION,
    products,
    orders,
    customers,
    coupons: structuredClone(adminCoupons),
    digitalCodes: structuredClone(adminDigitalCodes),
    ledger: structuredClone(adminInventoryLedger),
    categories: structuredClone(seedAdminCategories),
    brands: seedAdminBrands(products),
    settings: { ...defaultAdminSettings },
    integrations: structuredClone(adminIntegrations),
    automations: seedAutomations(),
    automationRuns: [],
    activityLog: seedActivity(),
  };
}

function seedActivity(): AdminActivityEntry[] {
  return [
    {
      id: "act-seed-1",
      at: "2026-07-17T10:00:00.000Z",
      actor: "Admin",
      action: "store.seeded",
      entityType: "system",
      entityId: "hq",
      detail: "Demo workspace hydrated",
    },
  ];
}

function seedAutomations(): AdminAutomationRule[] {
  const createdAt = "2026-07-01T09:00:00.000Z";
  const rule = (
    id: string,
    name: string,
    description: string,
    trigger: AutomationTrigger,
    conditions: AutomationCondition[],
    actions: AutomationAction[],
    enabled = true,
  ): AdminAutomationRule => ({ id, name, description, trigger, conditions, actions, enabled, createdAt, updatedAt: createdAt });
  return [
    rule("auto-cod-review", "Pending COD review", "Alert the operations team when a COD order needs review.", "order_status_changed", [{ field: "status", operator: "equals", value: "pending" }, { field: "payment", operator: "equals", value: "COD" }], [{ type: "notify_internal", value: "Review pending COD order" }]),
    rule("auto-low-stock", "Low-stock escalation", "Escalate SKUs at or below the configured threshold.", "stock_low", [], [{ type: "notify_internal", value: "Low stock needs replenishment" }, { type: "send_webhook", value: "inventory.low" }]),
    rule("auto-preorder-release", "Pre-order release update", "Send a release confirmation after a pre-order is allocated.", "preorder_released", [], [{ type: "send_email", value: "Your pre-order is ready for fulfillment" }]),
    rule("auto-payment-ack", "Prepaid payment acknowledgement", "Acknowledge successfully captured prepaid payments.", "payment_captured", [{ field: "payment", operator: "equals", value: "Prepaid" }], [{ type: "send_email", value: "Payment received" }]),
    rule("auto-new-customer", "New-customer welcome tagging", "Tag newly created customer records for onboarding.", "customer_created", [], [{ type: "add_customer_tag", value: "new-customer" }]),
    rule("auto-preorder-whatsapp", "Pre-order WhatsApp release", "Send a WhatsApp release update when messaging is healthy.", "preorder_released", [], [{ type: "send_whatsapp", value: "Your pre-order is ready" }], false),
  ];
}

let state: AdminStoreState = createSeedState();
let hydrated = false;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

function mergeProductsByKey(
  seed: AdminCatalogRow[],
  saved: AdminCatalogRow[] | undefined,
): AdminCatalogRow[] {
  if (!saved?.length) return seed;
  const byKey = new Map(saved.map((row) => [row.key, row]));
  const merged = seed.map((row) => {
    const existing = byKey.get(row.key);
    if (!existing) return row;
    return { ...row, ...existing, key: row.key, category: row.category, index: row.index };
  });
  const seedKeys = new Set(seed.map((row) => row.key));
  for (const row of saved) {
    if (!seedKeys.has(row.key)) merged.push(row);
  }
  return merged;
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<AdminStoreState> & {
      analytics?: unknown;
      alerts?: unknown;
    };
    const seed = createSeedState();
    const versionOk = parsed.version === STORE_VERSION;
    const ordersRaw =
      versionOk && Array.isArray(parsed.orders) && parsed.orders.length > 0
        ? (parsed.orders as AdminOrder[])
        : seed.orders;
    const ordersHonest = ordersRaw.every(
      (order) =>
        Array.isArray(order.items) &&
        order.items.every((item) => Boolean(item.productKey && item.sku && item.fulfillmentType)),
    );
    const orders = ordersHonest ? ordersRaw : seed.orders;
    const products = mergeProductsByKey(seed.products, parsed.products);
    const customersBase =
      versionOk && Array.isArray(parsed.customers) && parsed.customers.length > 0
        ? (parsed.customers as AdminCustomer[])
        : seed.customers;

    state = {
      version: STORE_VERSION,
      products,
      orders,
      customers: recomputeCustomerMetrics(customersBase, orders),
      coupons:
        versionOk && Array.isArray(parsed.coupons) && parsed.coupons.length > 0
          ? parsed.coupons
          : seed.coupons,
      digitalCodes:
        versionOk && Array.isArray(parsed.digitalCodes) && parsed.digitalCodes.length > 0
          ? parsed.digitalCodes
          : seed.digitalCodes,
      ledger: versionOk && Array.isArray(parsed.ledger) ? parsed.ledger : seed.ledger,
      categories:
        Array.isArray(parsed.categories) && parsed.categories.length > 0
          ? (parsed.categories as AdminCategoryRecord[])
          : seed.categories,
      brands:
        Array.isArray(parsed.brands) && parsed.brands.length > 0
          ? (parsed.brands as AdminBrandRecord[])
          : seed.brands,
      settings: { ...defaultAdminSettings, ...(parsed.settings ?? {}) },
      integrations:
        versionOk && Array.isArray(parsed.integrations)
          ? (parsed.integrations as AdminIntegration[])
          : seed.integrations,
      automations:
        Array.isArray(parsed.automations) && parsed.automations.length > 0
          ? (parsed.automations as AdminAutomationRule[])
          : seed.automations,
      automationRuns: Array.isArray(parsed.automationRuns)
        ? (parsed.automationRuns as AdminAutomationRun[]).slice(0, 250)
        : seed.automationRuns,
      activityLog: Array.isArray(parsed.activityLog)
        ? (parsed.activityLog as AdminActivityEntry[]).slice(0, 300)
        : seed.activityLog,
    };
  } catch {
    state = createSeedState();
  }
}

function commit(next: AdminStoreState) {
  state = {
    ...next,
    customers: recomputeCustomerMetrics(next.customers, next.orders),
  };
  persist();
  emit();
}

export function getAdminState(): AdminStoreState {
  hydrate();
  return state;
}

export function setAdminState(
  updater: AdminStoreState | ((prev: AdminStoreState) => AdminStoreState),
) {
  hydrate();
  const next = typeof updater === "function" ? updater(state) : updater;
  commit(next);
}

let dispatchingAutomation = false;

type AutomationEvent = {
  orderId?: string;
  customerId?: string;
  productKey?: string;
  status?: string;
  previousStatus?: string;
  payment?: string;
  stock?: number;
};

function conditionMatches(condition: AutomationCondition, event: AutomationEvent) {
  const actual = String(event[condition.field as keyof AutomationEvent] ?? "");
  if (condition.operator === "equals") return actual === condition.value;
  if (condition.operator === "not_equals") return actual !== condition.value;
  if (condition.operator === "contains") return actual.toLowerCase().includes(condition.value.toLowerCase());
  return Number(actual) <= Number(condition.value);
}

/** Executes locally only; provider actions record simulated or blocked delivery. */
export function dispatchAutomation(trigger: AutomationTrigger, event: AutomationEvent = {}) {
  if (dispatchingAutomation) return;
  hydrate();
  dispatchingAutomation = true;
  try {
    const current = state;
    const matching = current.automations.filter(
      (rule) => rule.enabled && rule.trigger === trigger && rule.conditions.every((condition) => conditionMatches(condition, event)),
    );
    if (!matching.length) return;
    const at = nowIso();
    let customers = current.customers;
    let orders = current.orders;
    const runs: AdminAutomationRun[] = [];
    for (const rule of matching) {
      const outcomes: string[] = [];
      let delivery: AdminAutomationRun["delivery"] = "simulated";
      for (const action of rule.actions) {
        if (action.type === "add_customer_tag" && event.customerId) {
          customers = customers.map((customer) =>
            customer.id === event.customerId
              ? { ...customer, tags: [...new Set([...(customer.tags ?? []), action.value || "automated"])] }
              : customer,
          );
          outcomes.push(`tagged customer ${action.value || "automated"}`);
        } else if (action.type === "update_order_status" && event.orderId && action.value) {
          orders = orders.map((order) => order.id === event.orderId ? { ...order, status: action.value as AdminOrderStatus } : order);
          outcomes.push(`updated order to ${action.value}`);
        } else if (action.type === "send_whatsapp") {
          const whatsapp = current.integrations.find((integration) => integration.id === "whatsapp");
          if (!whatsapp?.enabled || whatsapp.status !== "connected") {
            delivery = "blocked";
            outcomes.push("WhatsApp blocked: integration needs attention");
          } else outcomes.push("WhatsApp delivery simulated");
        } else if (action.type === "send_webhook") {
          const webhooks = current.integrations.find((integration) => integration.id === "webhooks");
          if (!webhooks?.enabled || webhooks.status !== "connected") {
            delivery = "blocked";
            outcomes.push("webhook blocked: integration unavailable");
          } else outcomes.push("webhook delivery simulated");
        } else if (action.type === "send_email") outcomes.push("email delivery simulated");
        else if (action.type === "notify_internal") outcomes.push("internal notification simulated");
      }
      runs.push({
        id: `RUN-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        trigger,
        at,
        status: delivery === "blocked" ? "skipped" : "completed",
        summary: outcomes.join(" · ") || "Rule matched; no action configured",
        delivery,
      });
    }
    commit({ ...current, customers, orders, automationRuns: [...runs, ...current.automationRuns].slice(0, 250) });
  } finally {
    dispatchingAutomation = false;
  }
}

export function upsertAutomation(rule: AdminAutomationRule) {
  setAdminState((prev) => {
    const exists = prev.automations.some((item) => item.id === rule.id);
    return {
      ...prev,
      automations: exists
        ? prev.automations.map((item) => item.id === rule.id ? { ...rule, updatedAt: nowIso() } : item)
        : [{ ...rule, createdAt: rule.createdAt || nowIso(), updatedAt: nowIso() }, ...prev.automations],
    };
  });
}

export function deleteAutomation(id: string) {
  setAdminState((prev) => ({ ...prev, automations: prev.automations.filter((rule) => rule.id !== id) }));
}

export function toggleAutomation(id: string, enabled: boolean) {
  setAdminState((prev) => ({ ...prev, automations: prev.automations.map((rule) => rule.id === id ? { ...rule, enabled, updatedAt: nowIso() } : rule) }));
}

export function testAutomation(trigger: AutomationTrigger) {
  const sample: Record<AutomationTrigger, AutomationEvent> = {
    order_status_changed: { orderId: state.orders[0]?.id, status: "pending", payment: "COD" },
    stock_low: { productKey: state.products[0]?.key, stock: 2 },
    customer_created: { customerId: state.customers[0]?.id },
    preorder_released: { orderId: state.orders.find((order) => order.status === "preorder")?.id },
    payment_authorized: { orderId: state.orders[0]?.id, payment: "Prepaid" },
    payment_captured: { orderId: state.orders[0]?.id, payment: "Prepaid" },
    payment_failed: { orderId: state.orders[0]?.id, payment: "Prepaid" },
  };
  dispatchAutomation(trigger, sample[trigger]);
}

let storageBound = false;

function ensureStorageListener() {
  if (storageBound || typeof window === "undefined") return;
  storageBound = true;
  window.addEventListener("storage", (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    hydrated = false;
    hydrate();
    emit();
  });
}

export function subscribeAdminStore(listener: Listener) {
  hydrate();
  ensureStorageListener();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetAdminStore() {
  state = createSeedState();
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  emit();
}

function nowIso() {
  return new Date().toISOString();
}

function pushActivity(
  prev: AdminStoreState,
  entry: Omit<AdminActivityEntry, "id" | "at"> & { id?: string; at?: string },
): AdminActivityEntry[] {
  const next: AdminActivityEntry = {
    id: entry.id ?? `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: entry.at ?? nowIso(),
    actor: entry.actor,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    detail: entry.detail,
  };
  return [next, ...prev.activityLog].slice(0, 300);
}

export function logActivity(
  entry: Omit<AdminActivityEntry, "id" | "at"> & { id?: string; at?: string },
) {
  setAdminState((prev) => ({
    ...prev,
    activityLog: pushActivity(prev, entry),
  }));
}

function applyStockDelta(
  products: AdminCatalogRow[],
  ledger: AdminInventoryLedgerEntry[],
  productKey: string,
  delta: number,
  reason: string,
  at = nowIso(),
): { products: AdminCatalogRow[]; ledger: AdminInventoryLedgerEntry[] } | null {
  const product = products.find((row) => row.key === productKey);
  if (!product) return null;
  const nextProducts = products.map((row) => {
    if (row.key !== productKey) return row;
    const stock = Math.max(0, row.stock + delta);
    const status: AdminProductStatus =
      stock === 0 ? "sold_out" : row.status === "sold_out" ? "published" : row.status;
    return { ...row, stock, status };
  });
  const updated = nextProducts.find((row) => row.key === productKey)!;
  const entry: AdminInventoryLedgerEntry = {
    id: `LED-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productKey,
    sku: updated.sku,
    delta,
    reason,
    at,
  };
  return { products: nextProducts, ledger: [entry, ...ledger] };
}

function deductOrderStock(
  products: AdminCatalogRow[],
  ledger: AdminInventoryLedgerEntry[],
  order: AdminOrder,
): { products: AdminCatalogRow[]; ledger: AdminInventoryLedgerEntry[] } {
  let nextProducts = products;
  let nextLedger = ledger;
  for (const item of order.items) {
    if (item.fulfillmentType === "digital") continue;
    const result = applyStockDelta(
      nextProducts,
      nextLedger,
      item.productKey,
      -item.qty,
      `order:${order.id}`,
    );
    if (result) {
      nextProducts = result.products;
      nextLedger = result.ledger;
    }
  }
  return { products: nextProducts, ledger: nextLedger };
}

function restockOrderStock(
  products: AdminCatalogRow[],
  ledger: AdminInventoryLedgerEntry[],
  order: AdminOrder,
): { products: AdminCatalogRow[]; ledger: AdminInventoryLedgerEntry[] } {
  let nextProducts = products;
  let nextLedger = ledger;
  for (const item of order.items) {
    if (item.fulfillmentType === "digital") continue;
    const result = applyStockDelta(
      nextProducts,
      nextLedger,
      item.productKey,
      item.qty,
      `cancel:${order.id}`,
    );
    if (result) {
      nextProducts = result.products;
      nextLedger = result.ledger;
    }
  }
  return { products: nextProducts, ledger: nextLedger };
}

export function upsertProduct(
  product: Omit<AdminCatalogRow, "index"> & { index?: number },
) {
  setAdminState((prev) => {
    const existing = prev.products.findIndex((row) => row.key === product.key);
    if (existing >= 0) {
      const products = [...prev.products];
      products[existing] = {
        ...products[existing],
        ...product,
        index: products[existing].index,
      };
      return { ...prev, products };
    }

    const categoryIndex = prev.products.filter((p) => p.category === product.category).length;
    const row: AdminCatalogRow = {
      ...product,
      index: product.index ?? categoryIndex,
      key: product.key || `${product.category}:${categoryIndex}`,
    };
    return { ...prev, products: [row, ...prev.products] };
  });
}

export function adjustStock(productKey: string, delta: number, reason = "Manual adjust") {
  setAdminState((prev) => {
    const result = applyStockDelta(prev.products, prev.ledger, productKey, delta, reason);
    if (!result) return prev;
    return { ...prev, products: result.products, ledger: result.ledger };
  });
  const product = getAdminState().products.find((row) => row.key === productKey);
  if (product && product.stock <= getAdminState().settings.lowStockThreshold) {
    dispatchAutomation("stock_low", { productKey, stock: product.stock });
  }
}

export type UpdateOrderStatusOptions = {
  cashCollected?: boolean;
};

export function updateOrderStatus(
  orderId: string,
  status: AdminOrderStatus,
  options?: UpdateOrderStatusOptions,
) {
  const before = getAdminState().orders.find((order) => order.id === orderId);
  setAdminState((prev) => {
    const order = prev.orders.find((o) => o.id === orderId);
    if (!order || order.status === status) return prev;

    let products = prev.products;
    let ledger = prev.ledger;
    let stockDeducted = order.stockDeducted ?? false;
    let cashCollected = order.cashCollected ?? false;
    let detail = "Updated from admin";

    const confirming =
      status === "confirmed" &&
      (order.status === "pending" || order.status === "preorder");
    const cancelling = status === "cancelled" && order.status !== "cancelled";

    if (confirming && !stockDeducted) {
      const hasPhysical = order.items.some((item) => item.fulfillmentType !== "digital");
      if (hasPhysical) {
        const result = deductOrderStock(products, ledger, order);
        products = result.products;
        ledger = result.ledger;
        stockDeducted = true;
        detail =
          order.status === "preorder"
            ? "Released from hold · stock allocated"
            : "Stock reserved via ledger";
      } else {
        detail = "Confirmed · assign digital codes from vault";
      }
    }

    if (cancelling && stockDeducted) {
      const result = restockOrderStock(products, ledger, order);
      products = result.products;
      ledger = result.ledger;
      stockDeducted = false;
      detail = "Cancelled · stock restocked";
    } else if (cancelling) {
      detail = "Cancelled · no stock to restock";
    }

    if (status === "delivered" && order.payment === "COD") {
      cashCollected = options?.cashCollected ?? true;
      detail = cashCollected ? "Delivered · cash collected" : "Delivered";
    } else if (status === "packed") {
      detail = "Packed for dispatch";
    } else if (status === "shipped") {
      detail = order.tracking ? `Shipped · ${order.tracking}` : "Shipped";
    }

    const orders = prev.orders.map((row) => {
      if (row.id !== orderId) return row;
      return {
        ...row,
        status,
        stockDeducted,
        cashCollected,
        timeline: [
          ...row.timeline,
          {
            id: `evt-${Date.now()}`,
            at: nowIso(),
            label: orderStatusLabels[status],
            detail,
            actor: "Admin",
          },
        ],
      };
    });

    return {
      ...prev,
      products,
      ledger,
      orders,
      activityLog: pushActivity(prev, {
        actor: "Admin",
        action: "order.status_changed",
        entityType: "order",
        entityId: orderId,
        detail: `${before?.status ?? "?"} → ${status}`,
      }),
    };
  });
  if (before && before.status !== status) {
    dispatchAutomation("order_status_changed", {
      orderId,
      customerId: before.customerId,
      previousStatus: before.status,
      status,
      payment: before.payment,
    });
    if (before.payment === "Prepaid" && status === "confirmed") {
      dispatchAutomation("payment_captured", { orderId, customerId: before.customerId, payment: before.payment });
    }
  }
}

export function bulkUpdateOrderStatus(orderIds: string[], status: AdminOrderStatus) {
  for (const id of orderIds) {
    updateOrderStatus(id, status);
  }
}

export function refundOrder(orderId: string, amount?: number) {
  const before = getAdminState().orders.find((order) => order.id === orderId);
  if (!before || before.status === "cancelled" || before.status === "refunded") return;
  const refundAmount = amount ?? parsePrice(before.total);
  setAdminState((prev) => ({
    ...prev,
    orders: prev.orders.map((order) => {
      if (order.id !== orderId) return order;
      return {
        ...order,
        status: "refunded" as const,
        refundAmount,
        refundedAt: nowIso(),
        timeline: [
          ...order.timeline,
          {
            id: `evt-${Date.now()}`,
            at: nowIso(),
            label: "Refunded",
            detail: `Refund of ${formatInr(refundAmount)} recorded (mock)`,
            actor: "Admin",
          },
        ],
      };
    }),
    activityLog: pushActivity(prev, {
      actor: "Admin",
      action: "order.refunded",
      entityType: "order",
      entityId: orderId,
      detail: formatInr(refundAmount),
    }),
  }));
}

export function updateOrderNotes(orderId: string, notes: string) {
  setAdminState((prev) => ({
    ...prev,
    orders: prev.orders.map((order) =>
      order.id === orderId
        ? {
            ...order,
            notes,
            timeline: [
              ...order.timeline,
              {
                id: `evt-${Date.now()}`,
                at: nowIso(),
                label: "Notes updated",
                detail: notes.trim() ? notes.slice(0, 120) : "Notes cleared",
                actor: "Admin",
              },
            ],
          }
        : order,
    ),
    activityLog: pushActivity(prev, {
      actor: "Admin",
      action: "order.notes_updated",
      entityType: "order",
      entityId: orderId,
    }),
  }));
}

export function updateOrderTracking(orderId: string, tracking: string) {
  setAdminState((prev) => ({
    ...prev,
    orders: prev.orders.map((order) =>
      order.id === orderId
        ? {
            ...order,
            tracking,
            timeline: [
              ...order.timeline,
              {
                id: `evt-${Date.now()}`,
                at: nowIso(),
                label: "Tracking updated",
                detail: tracking.trim() || "Tracking cleared",
                actor: "Admin",
              },
            ],
          }
        : order,
    ),
    activityLog: pushActivity(prev, {
      actor: "Admin",
      action: "order.tracking_updated",
      entityType: "order",
      entityId: orderId,
      detail: tracking,
    }),
  }));
}

export function upsertCoupon(coupon: AdminCoupon) {
  setAdminState((prev) => {
    const idx = prev.coupons.findIndex((c) => c.id === coupon.id);
    if (idx >= 0) {
      const coupons = [...prev.coupons];
      coupons[idx] = coupon;
      return { ...prev, coupons };
    }
    return { ...prev, coupons: [coupon, ...prev.coupons] };
  });
}

export function updateDigitalCode(id: string, patch: Partial<AdminDigitalCode>) {
  setAdminState((prev) => ({
    ...prev,
    digitalCodes: prev.digitalCodes.map((code) =>
      code.id === id ? { ...code, ...patch } : code,
    ),
  }));
}

export function assignDigitalCodeToOrder(codeId: string, orderId: string) {
  setAdminState((prev) => {
    const order = prev.orders.find((o) => o.id === orderId);
    const code = prev.digitalCodes.find((c) => c.id === codeId);
    if (!order || !code || code.status !== "available") return prev;

    const digitalCodes = prev.digitalCodes.map((row) =>
      row.id === codeId
        ? {
            ...row,
            status: "assigned" as const,
            assignedTo: order.customerName,
            assignedOrderId: order.id,
          }
        : row,
    );

    const orders = prev.orders.map((row) => {
      if (row.id !== orderId) return row;
      return {
        ...row,
        timeline: [
          ...row.timeline,
          {
            id: `evt-${Date.now()}`,
            at: nowIso(),
            label: "Digital code assigned",
            detail: `${maskTail(code.code)} · ${code.productName}`,
          },
        ],
      };
    });

    return { ...prev, digitalCodes, orders };
  });
}

function maskTail(code: string) {
  const parts = code.split("-");
  if (parts.length < 2) return "••••";
  return `${parts[0]}-…-${parts[parts.length - 1]}`;
}

export function updateCustomer(id: string, patch: Partial<AdminCustomer>) {
  setAdminState((prev) => ({
    ...prev,
    customers: prev.customers.map((customer) => {
      if (customer.id !== id) return customer;
      const next = { ...customer, ...patch };
      if (patch.banned === true) next.status = "banned";
      if (patch.banned === false && next.status === "banned") next.status = "active";
      return next;
    }),
    activityLog: pushActivity(prev, {
      actor: "Admin",
      action: "customer.updated",
      entityType: "customer",
      entityId: id,
      detail: Object.keys(patch).join(", "),
    }),
  }));
}

export function updateSettings(patch: Partial<AdminSettings>) {
  setAdminState((prev) => ({
    ...prev,
    settings: { ...prev.settings, ...patch },
    activityLog: pushActivity(prev, {
      actor: "Admin",
      action: "settings.updated",
      entityType: "settings",
      entityId: "store",
      detail: Object.keys(patch).join(", "),
    }),
  }));
}

export function updateIntegration(id: string, patch: Partial<AdminIntegration>) {
  setAdminState((prev) => ({
    ...prev,
    integrations: prev.integrations.map((integration) =>
      integration.id === id ? { ...integration, ...patch } : integration,
    ),
  }));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function upsertCategory(category: AdminCategoryRecord) {
  setAdminState((prev) => {
    const existing = prev.categories.findIndex((row) => row.id === category.id);
    if (existing >= 0) {
      const categories = [...prev.categories];
      categories[existing] = category;
      return { ...prev, categories };
    }
    return { ...prev, categories: [...prev.categories, category] };
  });
}

export function createCategory(input: {
  label: string;
  description?: string;
  key?: string;
}) {
  const key = input.key?.trim() || slugify(input.label) || `cat-${Date.now()}`;
  const record: AdminCategoryRecord = {
    id: `cat-${Date.now()}`,
    key,
    label: input.label.trim(),
    description: input.description?.trim() ?? "",
    active: true,
  };
  upsertCategory(record);
  return record;
}

export function deleteCategory(id: string) {
  setAdminState((prev) => ({
    ...prev,
    categories: prev.categories.filter((row) => row.id !== id),
  }));
}

export function upsertBrand(brand: AdminBrandRecord) {
  setAdminState((prev) => {
    const existing = prev.brands.findIndex((row) => row.id === brand.id);
    if (existing >= 0) {
      const brands = [...prev.brands];
      const prevName = brands[existing].name;
      brands[existing] = brand;
      const products =
        prevName !== brand.name
          ? prev.products.map((p) => (p.brand === prevName ? { ...p, brand: brand.name } : p))
          : prev.products;
      return { ...prev, brands, products };
    }
    return { ...prev, brands: [...prev.brands, brand] };
  });
}

export function createBrand(name: string) {
  const record: AdminBrandRecord = {
    id: `brand-${Date.now()}`,
    name: name.trim(),
    active: true,
  };
  upsertBrand(record);
  return record;
}

/** Storefront checkout demo bridge — creates customer + preorder and fires automation events. */
export function createDemoCheckoutOrder(input: {
  name: string;
  mobile: string;
  city: string;
  payment: "Prepaid" | "COD";
  total: string;
  addressLine1?: string;
  addressLine2?: string;
  pincode?: string;
}) {
  hydrate();
  const at = nowIso();
  const digits = input.mobile.replace(/\D/g, "").slice(-10);
  const existing = state.customers.find((c) => c.mobile === digits);
  const customerId = existing?.id ?? `CUS-${Date.now()}`;
  const orderId = `${state.settings.orderIdPrefix || "EZX"}${Date.now().toString().slice(-8)}`;
  const product = state.products.find((p) => p.category === "preorders") ?? state.products[0];

  setAdminState((prev) => {
    let customers = prev.customers;
    if (!existing) {
      customers = [
        {
          id: customerId,
          name: input.name || `Player ${digits.slice(-4)}`,
          mobile: digits,
          orders: 0,
          spent: "₹0",
          lastOrderAt: at.slice(0, 10),
          city: input.city || prev.settings.city,
          status: "new",
          tags: [],
        },
        ...customers,
      ];
    }
    const order: AdminOrder = {
      id: orderId,
      customerId,
      customerName: input.name || existing?.name || `Player ${digits.slice(-4)}`,
      customerMobile: digits,
      status: "preorder",
      placedAt: at,
      total: input.total,
      payment: input.payment,
      city: input.city || prev.settings.city,
      items: product
        ? [
            {
              name: product.name,
              brand: product.brand,
              price: product.price,
              qty: 1,
              image: product.image,
              productKey: product.key,
              sku: product.sku,
              fulfillmentType: "preorder",
            },
          ]
        : [],
      timeline: [
        {
          id: `evt-${Date.now()}`,
          at,
          label: "Pre-order placed",
          detail: "Created from storefront checkout",
          actor: "Storefront",
        },
      ],
      addressLine1: input.addressLine1?.trim() || "Checkout address",
      addressLine2: input.addressLine2?.trim() || undefined,
      pincode: input.pincode?.trim() || "560001",
    };
    return {
      ...prev,
      customers,
      orders: [order, ...prev.orders],
      activityLog: pushActivity(prev, {
        actor: "Storefront",
        action: "order.created",
        entityType: "order",
        entityId: orderId,
        detail: input.payment,
      }),
    };
  });

  if (!existing) {
    dispatchAutomation("customer_created", { customerId });
  }
  if (input.payment === "Prepaid") {
    dispatchAutomation("payment_authorized", {
      orderId,
      customerId,
      payment: "Prepaid",
    });
  }
  dispatchAutomation("order_status_changed", {
    orderId,
    customerId,
    status: "preorder",
    payment: input.payment,
  });

  return { orderId, customerId };
}

export function deleteBrand(id: string) {
  setAdminState((prev) => ({
    ...prev,
    brands: prev.brands.filter((row) => row.id !== id),
  }));
}

export function publishProducts(keys: string[]) {
  setAdminState((prev) => ({
    ...prev,
    products: prev.products.map((row) =>
      keys.includes(row.key) && row.status === "draft"
        ? { ...row, status: "published" as const }
        : row,
    ),
  }));
}

export function unpublishProducts(keys: string[]) {
  setAdminState((prev) => ({
    ...prev,
    products: prev.products.map((row) =>
      keys.includes(row.key) && row.status === "published"
        ? { ...row, status: "draft" as const }
        : row,
    ),
  }));
}

export function markPreordersReady(orderIds: string[]) {
  setAdminState((prev) => {
    let products = prev.products;
    let ledger = prev.ledger;
    const orders = prev.orders.map((order) => {
      if (!orderIds.includes(order.id) || order.status !== "preorder") return order;

      let stockDeducted = order.stockDeducted ?? false;
      if (!stockDeducted) {
        const result = deductOrderStock(products, ledger, order);
        products = result.products;
        ledger = result.ledger;
        stockDeducted = true;
      }

      return {
        ...order,
        status: "confirmed" as const,
        stockDeducted,
        timeline: [
          ...order.timeline,
          {
            id: `evt-${Date.now()}-${order.id}`,
            at: nowIso(),
            label: orderStatusLabels.confirmed,
            detail: "Batch release · stock allocated",
          },
        ],
      };
    });

    return { ...prev, products, ledger, orders };
  });
  const after = getAdminState();
  for (const orderId of orderIds) {
    const order = after.orders.find((row) => row.id === orderId);
    if (order?.status === "confirmed") {
      dispatchAutomation("preorder_released", { orderId, customerId: order.customerId, status: "confirmed", payment: order.payment });
    }
  }
}

export function getProductsByCategory(
  products: AdminCatalogRow[],
  category: AdminProductCategory | "all",
) {
  if (category === "all") return products;
  return products.filter((row) => row.category === category);
}

export function getDerivedAnalytics(store: AdminStoreState) {
  return deriveAnalyticsSeries(store.orders);
}

export function getDerivedAlerts(store: AdminStoreState) {
  return deriveAlerts(
    store.orders,
    store.products,
    store.settings.lowStockThreshold ?? 5,
  );
}

export function getDashboardKpis(store: AdminStoreState) {
  const openStatuses: AdminOrderStatus[] = [
    "pending",
    "confirmed",
    "packed",
    "shipped",
    "preorder",
  ];
  const openOrders = store.orders.filter((o) => openStatuses.includes(o.status));
  const revenue = store.orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + parsePrice(o.total), 0);
  const threshold = store.settings.lowStockThreshold ?? 5;
  const lowStock = store.products.filter(
    (p) => p.stock > 0 && p.stock <= threshold,
  ).length;
  const pendingCod = store.orders.filter(
    (o) => o.payment === "COD" && o.status === "pending",
  ).length;

  return [
    {
      label: "Catalog SKUs",
      value: String(store.products.length),
      detail: `${lowStock} low stock`,
      tone: "dark" as const,
    },
    {
      label: "Open orders",
      value: String(openOrders.length).padStart(2, "0"),
      detail: `${store.orders.filter((o) => o.status === "pending").length} awaiting review`,
      tone: "light" as const,
    },
    {
      label: "Customers",
      value: String(store.customers.length).padStart(2, "0"),
      detail: `${store.customers.filter((c) => c.status === "vip").length} VIP`,
      tone: "light" as const,
    },
    {
      label: "Revenue",
      value: formatInr(revenue),
      detail: pendingCod > 0 ? `${pendingCod} COD pending` : "Non-cancelled orders",
      tone: "light" as const,
    },
  ];
}

/** Client-side theme bridge: prefer admin settings when hydrated. */
export function getLiveThemeSettings(): AdminSettings {
  if (typeof window === "undefined") return { ...defaultAdminSettings };
  hydrate();
  return state.settings;
}

import {
  accessories,
  consoles,
  gameCards,
  games,
  preorders,
} from "@/data/home";
import type { CatalogProduct, GameCardProduct } from "@/lib/types";
import { theme } from "@/lib/theme";

export type AdminProductCategory = string;

export type AdminCategoryRecord = {
  id: string;
  key: string;
  label: string;
  description: string;
  active: boolean;
};

export type AdminBrandRecord = {
  id: string;
  name: string;
  active: boolean;
};

export type AdminProductStatus = "draft" | "published" | "sold_out";

export type AdminPlatform =
  | "PS5"
  | "PS4"
  | "Xbox"
  | "Nintendo"
  | "PC"
  | "Multi"
  | "Hardware"
  | "Digital";

export type AdminOrderStatus =
  | "pending"
  | "confirmed"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "preorder"
  | "refunded";

export type AdminFulfillmentType = "physical" | "digital" | "preorder";

export type AdminOrderItem = {
  name: string;
  brand: string;
  price: string;
  qty: number;
  image: string;
  productKey: string;
  sku: string;
  fulfillmentType: AdminFulfillmentType;
};

export type AdminOrderEvent = {
  id: string;
  at: string;
  label: string;
  detail?: string;
  actor?: string;
};

export type AdminActivityEntry = {
  id: string;
  at: string;
  actor: string;
  action: string;
  entityType: "order" | "product" | "customer" | "settings" | "automation" | "inventory" | "system";
  entityId: string;
  detail?: string;
};

export type AdminOrder = {
  id: string;
  customerId?: string;
  customerName: string;
  customerMobile: string;
  status: AdminOrderStatus;
  placedAt: string;
  total: string;
  payment: "Prepaid" | "COD";
  city: string;
  items: AdminOrderItem[];
  tracking?: string;
  trackingUrl?: string;
  carrierName?: string;
  eta?: string;
  notes?: string;
  timeline: AdminOrderEvent[];
  /** Stock was decremented via ledger for physical/preorder lines */
  stockDeducted?: boolean;
  /** COD cash collected on deliver */
  cashCollected?: boolean;
  /** Shipping address lines (mock) */
  addressLine1?: string;
  addressLine2?: string;
  pincode?: string;
  /** Partial refund amount in INR when status is refunded */
  refundAmount?: number;
  refundedAt?: string;
};

export type AdminCustomerStatus = "active" | "new" | "vip" | "banned";

export type AdminCustomer = {
  id: string;
  name: string;
  mobile: string;
  orders: number;
  spent: string;
  lastOrderAt: string;
  city: string;
  status: AdminCustomerStatus;
  notes?: string;
  banned?: boolean;
  tags?: string[];
};

export type AutomationTrigger =
  | "order_status_changed"
  | "stock_low"
  | "customer_created"
  | "preorder_released"
  | "payment_authorized"
  | "payment_captured"
  | "payment_failed";

export type AutomationActionType =
  | "notify_internal"
  | "add_customer_tag"
  | "update_order_status"
  | "send_email"
  | "send_whatsapp"
  | "send_webhook";

export type AutomationCondition = {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "less_than_or_equal";
  value: string;
};

export type AutomationAction = {
  type: AutomationActionType;
  value?: string;
};

export type AdminAutomationRule = {
  id: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  enabled: boolean;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  createdAt: string;
  updatedAt: string;
};

export type AdminAutomationRun = {
  id: string;
  ruleId: string;
  ruleName: string;
  trigger: AutomationTrigger;
  at: string;
  status: "completed" | "skipped" | "failed";
  summary: string;
  delivery?: "simulated" | "blocked";
};

export type AdminAlert = {
  id: string;
  tone: "warning" | "info" | "success";
  title: string;
  detail: string;
  href?: string;
};

export type AdminCatalogRow = {
  key: string;
  category: AdminProductCategory;
  index: number;
  name: string;
  brand: string;
  price: string;
  strike: string;
  image: string;
  sku: string;
  platform: AdminPlatform;
  stock: number;
  status: AdminProductStatus;
  digital: boolean;
  edition: string;
  /** ISO date (YYYY-MM-DD) for preorder release */
  releaseDate?: string;
};

export type AdminCoupon = {
  id: string;
  code: string;
  percentOff: number;
  active: boolean;
  uses: number;
  maxUses: number;
  createdAt: string;
};

export type AdminDigitalCodeStatus = "available" | "assigned" | "redeemed";

export type AdminDigitalCode = {
  id: string;
  code: string;
  platform: AdminPlatform;
  productName: string;
  productKey?: string;
  status: AdminDigitalCodeStatus;
  assignedTo?: string;
  assignedOrderId?: string;
  redeemedAt?: string;
};

export type AdminInventoryLedgerEntry = {
  id: string;
  productKey: string;
  sku: string;
  delta: number;
  reason: string;
  at: string;
};

export type AdminIntegrationCategory =
  | "payments"
  | "shipping"
  | "messaging"
  | "analytics"
  | "other";

export type AdminIntegrationStatus = "connected" | "not_connected" | "needs_attention";

/** 'log' = the provider client builds the request but never calls anyone. */
export type AdminIntegrationDriver = "log" | "live";

export type AdminIntegrationFieldType = "text" | "password" | "url" | "select";

/**
 * One configurable input, declared by the API. The schema lives server-side
 * because only the server knows which credential key each provider client
 * reads — a client-side copy is exactly the drift this replaces.
 */
export type AdminIntegrationField = {
  key: string;
  label: string;
  type: AdminIntegrationFieldType;
  scope: "config" | "credential";
  required: boolean;
  /** Never round-tripped to the browser; write-only. */
  secret: boolean;
  /** Resolved from env or another admin page — editing it here would be a no-op. */
  readOnly: boolean;
  envVar: string | null;
  help: string | null;
  configured: boolean;
  /** Present for non-secret fields only. */
  value: string | null;
  /** Last-4 marker for non-password secrets. */
  hint?: string;
  options?: { value: string; label: string }[];
};

export type AdminIntegration = {
  id: string;
  name: string;
  category: AdminIntegrationCategory;
  description: string;
  status: AdminIntegrationStatus;
  enabled: boolean;
  lastSync?: string;
  accountLabel?: string;
  webhookUrl?: string;
  driver?: AdminIntegrationDriver;
  /** Undefined in demo mode — the schema only exists on the server. */
  fields?: AdminIntegrationField[];
  missingRequired?: string[];
};

export type AdminAnalyticsDay = {
  date: string;
  revenue: number;
  orders: number;
};

export type AdminSettings = {
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  city: string;
  gstin: string;
  accentHue: number;
  showOffer: boolean;
  releaseDate: string;
  prepaidDiscount: number;
  codEnabled: boolean;
  codLimit: number;
  /** Flat ₹ collected online to confirm a COD order (0 = none). */
  codAdvance: number;
  codAdvanceLabel: string;
  /** When true, paying the advance lifts the codLimit ceiling entirely. */
  codAdvanceUnlocksCap: boolean;
  /** Default ₹ to reserve a pre-order when the product sets no amount. */
  reservationAmount: number;
  whatsappWidgetEnabled: boolean;
  whatsappNumber: string;
  whatsappGreeting: string;
  freeShippingMin: number;
  orderIdPrefix: string;
  lowStockThreshold: number;
  hideOutOfStock: boolean;
  timezone: string;
  currencyLabel: string;
  notifyNewOrder: boolean;
  notifyLowStock: boolean;
  notifyPreorderRelease: boolean;
  gaMeasurementId: string;
  metaPixelId: string;
  /** Printable invoice / packing slip template. */
  docBusinessName: string;
  docAddressLine1: string;
  docAddressLine2: string;
  docCity: string;
  /** Seller's place of supply — decides CGST+SGST vs IGST on the invoice. */
  docState: string;
  docPincode: string;
  docGstin: string;
  docPan: string;
  docLogoUrl: string;
  docInvoicePrefix: string;
  docDeclaration: string;
  docFooterNote: string;
  docSignatureLine: boolean;
};

export function parsePrice(value: string): number {
  if (!value || value === "Sold out") return 0;
  return Number(value.replace(/[^\d]/g, "")) || 0;
}

export function formatInr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function inferPlatform(brand: string, name: string, category: AdminProductCategory): AdminPlatform {
  const source = `${brand} ${name}`.toLowerCase();
  if (category === "game-cards") return "Digital";
  if (category === "consoles" || /console|dualsense|headset|controller|portal|dock/.test(source)) {
    if (/nintendo|switch/.test(source)) return "Nintendo";
    if (/xbox/.test(source)) return "Xbox";
    if (/steam|pc/.test(source)) return "PC";
    if (/playstation|ps5|ps4|dualsense|portal/.test(source)) return "PS5";
    return "Hardware";
  }
  if (/nintendo|switch/.test(source)) return "Nintendo";
  if (/xbox/.test(source)) return "Xbox";
  if (/pc|steam/.test(source)) return "PC";
  if (/ps4/.test(source)) return "PS4";
  if (/ps5|playstation/.test(source)) return "PS5";
  if (/multi/.test(source)) return "Multi";
  return category === "accessories" ? "Hardware" : "PS5";
}

function inferEdition(name: string, category: AdminProductCategory): string {
  const lower = name.toLowerCase();
  if (/collector/.test(lower)) return "Collector's";
  if (/deluxe|ultimate/.test(lower)) return "Deluxe";
  if (/standard/.test(lower)) return "Standard";
  if (category === "preorders") return "Pre-order";
  if (category === "game-cards") return "Digital code";
  if (category === "consoles") return "Console";
  if (category === "accessories") return "Accessory";
  return "Standard";
}

function skuFor(category: AdminProductCategory, index: number): string {
  const prefix: Record<string, string> = {
    games: "GAM",
    consoles: "CON",
    accessories: "ACC",
    "game-cards": "CRD",
    preorders: "PRE",
  };
  return `EZ-${prefix[category] ?? "SKU"}-${String(index + 1).padStart(4, "0")}`;
}

function stockFor(category: AdminProductCategory, index: number, price: string): number {
  if (price === "Sold out") return 0;
  if (category === "preorders") return 8 + (index % 5);
  if (category === "game-cards") return 40 + index * 3;
  if (category === "consoles") return index % 4 === 0 ? 2 : 6 + (index % 5);
  if (category === "accessories") return index % 5 === 0 ? 3 : 12 + (index % 8);
  return index % 7 === 0 ? 4 : 18 + (index % 10);
}

function statusFor(stock: number, index: number): AdminProductStatus {
  if (stock === 0) return "sold_out";
  if (index % 11 === 0) return "draft";
  return "published";
}

function preorderReleaseDate(index: number): string {
  const dates = ["2026-11-19", "2026-10-10", "2026-12-05", "2026-09-22", "2026-11-01"];
  return dates[index % dates.length];
}

function catalogRow(
  category: AdminProductCategory,
  index: number,
  product: CatalogProduct,
): AdminCatalogRow {
  const stock = stockFor(category, index, product.price);
  const digital = false;
  return {
    key: `${category}:${index}`,
    category,
    index,
    name: product.name,
    brand: product.brand,
    price: product.price,
    strike: product.strike,
    image: product.img,
    sku: skuFor(category, index),
    platform: inferPlatform(product.brand, product.name, category),
    stock,
    status: statusFor(stock, index),
    digital,
    edition: inferEdition(product.name, category),
    ...(category === "preorders" ? { releaseDate: preorderReleaseDate(index) } : {}),
  };
}

function gameCardRow(index: number, card: GameCardProduct): AdminCatalogRow {
  const stock = stockFor("game-cards", index, card.price);
  return {
    key: `game-cards:${index}`,
    category: "game-cards",
    index,
    name: card.name,
    brand: card.tag,
    price: card.price,
    strike: card.value,
    image: "",
    sku: skuFor("game-cards", index),
    platform: "Digital",
    stock,
    status: statusFor(stock, index),
    digital: true,
    edition: "Digital code",
  };
}

export function buildSeedCatalog(): AdminCatalogRow[] {
  return [
    ...games.map((product, index) => catalogRow("games", index, product)),
    ...consoles.map((product, index) => catalogRow("consoles", index, product)),
    ...accessories.map((product, index) => catalogRow("accessories", index, product)),
    ...gameCards.map((card, index) => gameCardRow(index, card)),
    ...preorders.map((product, index) => catalogRow("preorders", index, product)),
  ];
}

function timeline(
  events: Omit<AdminOrderEvent, "id">[],
): AdminOrderEvent[] {
  return events.map((event, index) => ({
    ...event,
    id: `evt-${index + 1}`,
  }));
}

function lineItem(
  category: AdminProductCategory,
  index: number,
  qty: number,
  fulfillmentType: AdminFulfillmentType,
  overrides?: Partial<Pick<AdminOrderItem, "price" | "name" | "brand" | "image">>,
): AdminOrderItem {
  const catalog = buildSeedCatalog().find((row) => row.key === `${category}:${index}`);
  if (!catalog) {
    throw new Error(`Missing catalog row ${category}:${index}`);
  }
  return {
    name: overrides?.name ?? catalog.name,
    brand: overrides?.brand ?? catalog.brand,
    price: overrides?.price ?? catalog.price,
    qty,
    image: overrides?.image ?? catalog.image,
    productKey: catalog.key,
    sku: catalog.sku,
    fulfillmentType,
  };
}

export const adminOrders: AdminOrder[] = [
  {
    id: "EZX24071891",
    customerId: "CUS-1001",
    customerName: "Arjun Patel",
    customerMobile: "9876543210",
    status: "shipped",
    placedAt: "2026-07-15T10:24:00",
    total: "₹6,389",
    payment: "Prepaid",
    city: "Bengaluru",
    tracking: "BD781205391",
    stockDeducted: true,
    items: [lineItem("accessories", 4, 1, "physical")],
    timeline: timeline([
      { at: "2026-07-15T10:24:00", label: "Order placed", detail: "Prepaid via UPI" },
      { at: "2026-07-15T11:05:00", label: "Confirmed", detail: "Payment verified · stock reserved" },
      { at: "2026-07-15T16:40:00", label: "Packed", detail: "Warehouse BLR-01" },
      { at: "2026-07-16T09:15:00", label: "Shipped", detail: "BD781205391" },
    ]),
  },
  {
    id: "EZX24062144",
    customerId: "CUS-1002",
    customerName: "Neha Sharma",
    customerMobile: "9123456789",
    status: "preorder",
    placedAt: "2026-06-21T16:05:00",
    total: "₹5,999",
    payment: "Prepaid",
    city: "Mumbai",
    notes: "Release hold · GTA VI",
    items: [lineItem("preorders", 0, 1, "preorder")],
    timeline: timeline([
      { at: "2026-06-21T16:05:00", label: "Pre-order placed", detail: "Release hold active" },
      { at: "2026-06-21T16:06:00", label: "Payment captured", detail: "Prepaid" },
    ]),
  },
  {
    id: "EZX24030802",
    customerId: "CUS-1003",
    customerName: "Rahul Mehta",
    customerMobile: "9988776655",
    status: "delivered",
    placedAt: "2026-03-08T09:12:00",
    total: "₹23,999",
    payment: "Prepaid",
    city: "Pune",
    stockDeducted: true,
    items: [lineItem("accessories", 1, 1, "physical")],
    timeline: timeline([
      { at: "2026-03-08T09:12:00", label: "Order placed" },
      { at: "2026-03-08T10:00:00", label: "Confirmed", detail: "Stock reserved" },
      { at: "2026-03-09T08:30:00", label: "Packed" },
      { at: "2026-03-09T14:20:00", label: "Shipped" },
      { at: "2026-03-11T17:45:00", label: "Delivered", detail: "Signed by customer" },
    ]),
  },
  {
    id: "EZX24081203",
    customerId: "CUS-1004",
    customerName: "Priya Nair",
    customerMobile: "9811122233",
    status: "pending",
    placedAt: "2026-07-17T18:40:00",
    total: "₹9,889",
    payment: "COD",
    city: "Hyderabad",
    items: [
      lineItem("games", 1, 1, "physical"),
      lineItem("accessories", 4, 1, "physical"),
    ],
    timeline: timeline([
      { at: "2026-07-17T18:40:00", label: "Order placed", detail: "COD · awaiting review" },
    ]),
  },
  {
    id: "EZX24081177",
    customerId: "CUS-1005",
    customerName: "Kabir Singh",
    customerMobile: "9000012345",
    status: "packed",
    placedAt: "2026-07-16T11:20:00",
    total: "₹54,490",
    payment: "Prepaid",
    city: "Delhi",
    stockDeducted: true,
    items: [lineItem("consoles", 4, 1, "physical")],
    timeline: timeline([
      { at: "2026-07-16T11:20:00", label: "Order placed" },
      { at: "2026-07-16T11:45:00", label: "Confirmed", detail: "Stock reserved" },
      { at: "2026-07-17T09:10:00", label: "Packed", detail: "Ready for pickup" },
    ]),
  },
  {
    id: "EZX24080912",
    customerId: "CUS-1006",
    customerName: "Ananya Gupta",
    customerMobile: "9765432109",
    status: "confirmed",
    placedAt: "2026-07-14T14:55:00",
    total: "₹3,499",
    payment: "Prepaid",
    city: "Chennai",
    items: [lineItem("game-cards", 1, 1, "digital")],
    timeline: timeline([
      { at: "2026-07-14T14:55:00", label: "Order placed", detail: "Digital fulfillment" },
      { at: "2026-07-14T15:02:00", label: "Confirmed", detail: "Code queue · assign from vault" },
    ]),
  },
  {
    id: "EZX24080561",
    customerId: "CUS-1007",
    customerName: "Vikram Joshi",
    customerMobile: "9555123456",
    status: "cancelled",
    placedAt: "2026-07-10T08:30:00",
    total: "₹2,050",
    payment: "COD",
    city: "Jaipur",
    notes: "Customer requested cancel before dispatch",
    items: [lineItem("games", 2, 1, "physical")],
    timeline: timeline([
      { at: "2026-07-10T08:30:00", label: "Order placed" },
      { at: "2026-07-10T12:15:00", label: "Cancelled", detail: "Customer request · no stock deducted" },
    ]),
  },
  {
    id: "EZX24080109",
    customerId: "CUS-1008",
    customerName: "Sana Qureshi",
    customerMobile: "9333344455",
    status: "shipped",
    placedAt: "2026-07-08T19:10:00",
    total: "₹7,979",
    payment: "Prepaid",
    city: "Ahmedabad",
    tracking: "BD781998201",
    stockDeducted: true,
    items: [lineItem("accessories", 0, 1, "physical")],
    timeline: timeline([
      { at: "2026-07-08T19:10:00", label: "Order placed" },
      { at: "2026-07-08T20:00:00", label: "Confirmed", detail: "Stock reserved" },
      { at: "2026-07-09T10:30:00", label: "Packed" },
      { at: "2026-07-09T15:45:00", label: "Shipped", detail: "BD781998201" },
    ]),
  },
  {
    id: "EZX24072055",
    customerId: "CUS-1001",
    customerName: "Arjun Patel",
    customerMobile: "9876543210",
    status: "preorder",
    placedAt: "2026-07-12T13:00:00",
    total: "₹5,499",
    payment: "Prepaid",
    city: "Bengaluru",
    notes: "Release hold · secondary title",
    items: [lineItem("preorders", 1, 1, "preorder")],
    timeline: timeline([
      { at: "2026-07-12T13:00:00", label: "Pre-order placed" },
      { at: "2026-07-12T13:01:00", label: "Payment captured" },
    ]),
  },
];

/** Recompute customer order count / spend / last order from linked orders. */
export function recomputeCustomerMetrics(
  customers: AdminCustomer[],
  orders: AdminOrder[],
): AdminCustomer[] {
  return customers.map((customer) => {
    const linked = orders.filter(
      (order) =>
        order.customerId === customer.id ||
        order.customerMobile === customer.mobile,
    );
    const counted = linked.filter((order) => order.status !== "cancelled");
    const spent = counted.reduce((sum, order) => sum + parsePrice(order.total), 0);
    const last = [...linked].sort((a, b) => b.placedAt.localeCompare(a.placedAt))[0];
    return {
      ...customer,
      orders: counted.length,
      spent: formatInr(spent),
      lastOrderAt: last ? last.placedAt.slice(0, 10) : customer.lastOrderAt,
    };
  });
}

export const adminCustomersSeed: AdminCustomer[] = [
  {
    id: "CUS-1001",
    name: "Arjun Patel",
    mobile: "9876543210",
    orders: 0,
    spent: "₹0",
    lastOrderAt: "2026-07-15",
    city: "Bengaluru",
    status: "vip",
    notes: "Prefers evening delivery windows.",
  },
  {
    id: "CUS-1002",
    name: "Neha Sharma",
    mobile: "9123456789",
    orders: 0,
    spent: "₹0",
    lastOrderAt: "2026-06-21",
    city: "Mumbai",
    status: "active",
  },
  {
    id: "CUS-1003",
    name: "Rahul Mehta",
    mobile: "9988776655",
    orders: 0,
    spent: "₹0",
    lastOrderAt: "2026-03-08",
    city: "Pune",
    status: "active",
  },
  {
    id: "CUS-1004",
    name: "Priya Nair",
    mobile: "9811122233",
    orders: 0,
    spent: "₹0",
    lastOrderAt: "2026-07-17",
    city: "Hyderabad",
    status: "new",
  },
  {
    id: "CUS-1005",
    name: "Kabir Singh",
    mobile: "9000012345",
    orders: 0,
    spent: "₹0",
    lastOrderAt: "2026-07-16",
    city: "Delhi",
    status: "vip",
    notes: "Console collector · priority packing.",
  },
  {
    id: "CUS-1006",
    name: "Ananya Gupta",
    mobile: "9765432109",
    orders: 0,
    spent: "₹0",
    lastOrderAt: "2026-07-14",
    city: "Chennai",
    status: "active",
  },
  {
    id: "CUS-1007",
    name: "Vikram Joshi",
    mobile: "9555123456",
    orders: 0,
    spent: "₹0",
    lastOrderAt: "2026-07-10",
    city: "Jaipur",
    status: "new",
  },
  {
    id: "CUS-1008",
    name: "Sana Qureshi",
    mobile: "9333344455",
    orders: 0,
    spent: "₹0",
    lastOrderAt: "2026-07-08",
    city: "Ahmedabad",
    status: "active",
  },
];

export const adminCustomers: AdminCustomer[] = recomputeCustomerMetrics(
  adminCustomersSeed,
  adminOrders,
);

export const adminCoupons: AdminCoupon[] = [
  {
    id: "CPN-001",
    code: "EZURR10",
    percentOff: 10,
    active: true,
    uses: 42,
    maxUses: 500,
    createdAt: "2026-06-01",
  },
  {
    id: "CPN-002",
    code: "PREORDER5",
    percentOff: 5,
    active: true,
    uses: 18,
    maxUses: 200,
    createdAt: "2026-06-15",
  },
  {
    id: "CPN-003",
    code: "VIP15",
    percentOff: 15,
    active: false,
    uses: 90,
    maxUses: 100,
    createdAt: "2026-05-10",
  },
];

export const adminDigitalCodes: AdminDigitalCode[] = [
  {
    id: "DC-001",
    code: "PSN-XXXX-ABCD-1290",
    platform: "Digital",
    productName: "PSN Wallet Top Up · ₹2,000",
    productKey: "game-cards:1",
    status: "available",
  },
  {
    id: "DC-002",
    code: "PSN-XXXX-EFGH-4412",
    platform: "Digital",
    productName: "PSN Wallet Top Up · ₹2,000",
    productKey: "game-cards:1",
    status: "assigned",
    assignedTo: "Ananya Gupta",
    assignedOrderId: "EZX24080912",
  },
  {
    id: "DC-003",
    code: "XBX-XXXX-JKLM-8831",
    platform: "Xbox",
    productName: "Xbox Gift Card ₹1500",
    status: "redeemed",
    assignedTo: "Kabir Singh",
    redeemedAt: "2026-07-16T18:20:00",
  },
  {
    id: "DC-004",
    code: "NSW-XXXX-NOPQ-2201",
    platform: "Nintendo",
    productName: "Nintendo eShop ₹1000",
    status: "available",
  },
  {
    id: "DC-005",
    code: "STM-XXXX-RSTU-7744",
    platform: "PC",
    productName: "Steam Wallet ₹2000",
    status: "available",
  },
  {
    id: "DC-006",
    code: "PSN-XXXX-VWXY-5510",
    platform: "Digital",
    productName: "PSN Wallet Top Up · ₹1,000",
    productKey: "game-cards:0",
    status: "available",
  },
];

export const adminInventoryLedger: AdminInventoryLedgerEntry[] = [
  {
    id: "LED-001",
    productKey: "consoles:4",
    sku: "EZ-CON-0005",
    delta: -1,
    reason: "order:EZX24081177",
    at: "2026-07-16T11:45:00",
  },
  {
    id: "LED-002",
    productKey: "accessories:0",
    sku: "EZ-ACC-0001",
    delta: 12,
    reason: "Restock inbound",
    at: "2026-07-14T09:00:00",
  },
  {
    id: "LED-003",
    productKey: "accessories:4",
    sku: "EZ-ACC-0005",
    delta: -1,
    reason: "order:EZX24071891",
    at: "2026-07-15T11:05:00",
  },
  {
    id: "LED-004",
    productKey: "accessories:1",
    sku: "EZ-ACC-0002",
    delta: -1,
    reason: "order:EZX24030802",
    at: "2026-03-08T10:00:00",
  },
  {
    id: "LED-005",
    productKey: "accessories:0",
    sku: "EZ-ACC-0001",
    delta: -1,
    reason: "order:EZX24080109",
    at: "2026-07-08T20:00:00",
  },
];

/**
 * Demo fallback rows. They deliberately carry NO credential/webhook values: the
 * drawer's config UI is driven by the API's `fields` schema, and hardcoding
 * masked keys here is what hid the "nothing is configurable" bug — demo mode
 * looked fully wired while every real row had NULL credentials.
 */
export const adminIntegrations: AdminIntegration[] = [
  {
    id: "razorpay",
    name: "Razorpay",
    category: "payments",
    description: "Accept UPI, cards, netbanking, and wallets at checkout.",
    status: "connected",
    enabled: true,
    lastSync: "2026-07-18T08:42:00",
    accountLabel: "Ezurr Play HQ · Live",
  },
  {
    id: "cash-on-delivery",
    name: "Cash on Delivery",
    category: "payments",
    description: "Offer cash collection for eligible orders and serviceable pincodes.",
    status: "connected",
    enabled: true,
    lastSync: "2026-07-18T08:31:00",
    accountLabel: "Orders below ₹10,000",
  },
  {
    id: "shiprocket",
    name: "Shiprocket",
    category: "shipping",
    description: "Create shipments, print labels, and track carrier handoffs.",
    status: "connected",
    enabled: true,
    lastSync: "2026-07-18T07:55:00",
    accountLabel: "BLR-01 warehouse",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    category: "messaging",
    description: "Send order, dispatch, and pre-order release updates.",
    status: "needs_attention",
    enabled: true,
    lastSync: "2026-07-17T18:10:00",
    accountLabel: "Ezurr Play HQ",
  },
  {
    id: "google-analytics",
    name: "Google Analytics",
    category: "analytics",
    description: "Measure storefront journeys, conversion, and campaign performance.",
    status: "connected",
    enabled: true,
    lastSync: "2026-07-18T08:15:00",
    accountLabel: "G-8EZURRPLAY",
  },
  {
    id: "meta-pixel",
    name: "Meta Pixel",
    category: "analytics",
    description: "Keep catalog and conversion events ready for Meta campaigns.",
    status: "not_connected",
    enabled: false,
  },
  {
    id: "zoho-books",
    name: "Zoho Books",
    category: "other",
    description: "Export GST-ready order and payment records to accounting.",
    status: "not_connected",
    enabled: false,
  },
  {
    id: "webhooks",
    name: "Custom webhooks",
    category: "other",
    description: "Send order, stock, and fulfillment events to your own endpoint.",
    status: "connected",
    enabled: true,
    lastSync: "2026-07-18T08:40:00",
    accountLabel: "3 event subscriptions",
  },
];

/** Static fallback series — live store prefers deriveAnalyticsSeries(). */
export const adminAnalyticsSeries: AdminAnalyticsDay[] = [
  { date: "2026-07-11", revenue: 18420, orders: 4 },
  { date: "2026-07-12", revenue: 24100, orders: 5 },
  { date: "2026-07-13", revenue: 15680, orders: 3 },
  { date: "2026-07-14", revenue: 31250, orders: 7 },
  { date: "2026-07-15", revenue: 27890, orders: 6 },
  { date: "2026-07-16", revenue: 52340, orders: 8 },
  { date: "2026-07-17", revenue: 19870, orders: 4 },
];

/** Static fallback — live store prefers deriveAlerts(). */
export const adminAlerts: AdminAlert[] = [
  {
    id: "alert-1",
    tone: "warning",
    title: "COD order waiting",
    detail: "EZX24081203 needs confirmation before packing.",
    href: "/admin/orders?payment=COD",
  },
  {
    id: "alert-2",
    tone: "info",
    title: "Pre-order hold",
    detail: "2 release-hold orders remain on hold.",
    href: "/admin/preorders",
  },
  {
    id: "alert-3",
    tone: "success",
    title: "Dispatch on track",
    detail: "Packed console order EZX24081177 ready for pickup.",
    href: "/admin/orders/EZX24081177",
  },
];

export function deriveAnalyticsSeries(
  orders: AdminOrder[],
  days = 7,
  endDate = "2026-07-17",
): AdminAnalyticsDay[] {
  const end = new Date(`${endDate}T23:59:59`);
  const series: AdminAnalyticsDay[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayOrders = orders.filter(
      (order) =>
        order.status !== "cancelled" && order.placedAt.slice(0, 10) === key,
    );
    series.push({
      date: key,
      revenue: dayOrders.reduce((sum, order) => sum + parsePrice(order.total), 0),
      orders: dayOrders.length,
    });
  }
  return series;
}

export function deriveAlerts(
  orders: AdminOrder[],
  products: AdminCatalogRow[],
  lowStockThreshold = 5,
): AdminAlert[] {
  const alerts: AdminAlert[] = [];
  const pendingCod = orders.filter(
    (order) => order.payment === "COD" && order.status === "pending",
  );
  if (pendingCod.length > 0) {
    alerts.push({
      id: "alert-cod",
      tone: "warning",
      title:
        pendingCod.length === 1
          ? "COD order waiting"
          : `${pendingCod.length} COD orders waiting`,
      detail:
        pendingCod.length === 1
          ? `${pendingCod[0].id} needs confirmation before packing.`
          : "Review the COD queue before packing.",
      href: "/admin/orders?payment=COD",
    });
  }

  const holds = orders.filter((order) => order.status === "preorder");
  if (holds.length > 0) {
    alerts.push({
      id: "alert-preorder",
      tone: "info",
      title: "Pre-order hold",
      detail: `${holds.length} release-hold order${holds.length === 1 ? "" : "s"} remain on hold.`,
      href: "/admin/preorders",
    });
  }

  const threshold = Math.max(0, lowStockThreshold);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= threshold);
  if (lowStock.length > 0) {
    alerts.push({
      id: "alert-stock",
      tone: "warning",
      title: "Low stock",
      detail: `${lowStock.length} SKU${lowStock.length === 1 ? "" : "s"} at or below ${threshold} units.`,
      href: "/admin/inventory?filter=low",
    });
  }

  const packed = orders.filter((order) => order.status === "packed");
  if (packed.length > 0) {
    alerts.push({
      id: "alert-packed",
      tone: "success",
      title: "Ready to ship",
      detail: `${packed[0].id} is packed and waiting for carrier pickup.`,
      href: `/admin/orders/${packed[0].id}`,
    });
  }

  return alerts;
}

export function derivePlatformMix(orders: AdminOrder[], products: AdminCatalogRow[]) {
  const byKey = new Map(products.map((p) => [p.key, p]));
  const counts = new Map<string, number>();
  for (const order of orders) {
    if (order.status === "cancelled") continue;
    for (const item of order.items) {
      const product = byKey.get(item.productKey);
      const platform = product?.platform ?? "Multi";
      counts.set(platform, (counts.get(platform) ?? 0) + item.qty);
    }
  }
  return [...counts.entries()]
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count);
}

export function deriveTopSkus(orders: AdminOrder[], products: AdminCatalogRow[], limit = 5) {
  const byKey = new Map(products.map((p) => [p.key, p]));
  const tallies = new Map<string, { name: string; sku: string; qty: number; revenue: number }>();
  for (const order of orders) {
    if (order.status === "cancelled") continue;
    for (const item of order.items) {
      const product = byKey.get(item.productKey);
      const key = item.productKey;
      const prev = tallies.get(key) ?? {
        name: item.name,
        sku: item.sku || product?.sku || key,
        qty: 0,
        revenue: 0,
      };
      prev.qty += item.qty;
      prev.revenue += parsePrice(item.price) * item.qty;
      tallies.set(key, prev);
    }
  }
  return [...tallies.values()].sort((a, b) => b.qty - a.qty).slice(0, limit);
}

export const defaultAdminSettings: AdminSettings = {
  storeName: "Ezurr Play HQ",
  supportEmail: "hello@ezurr.com",
  supportPhone: "9876500000",
  city: "Bengaluru",
  gstin: "",
  accentHue: theme.accentHue,
  showOffer: theme.showOffer,
  releaseDate: theme.releaseDate.slice(0, 10),
  prepaidDiscount: theme.prepaidDiscount,
  codEnabled: true,
  codLimit: 10000,
  codAdvance: 0,
  codAdvanceLabel: "",
  codAdvanceUnlocksCap: false,
  reservationAmount: 0,
  whatsappWidgetEnabled: false,
  whatsappNumber: "",
  whatsappGreeting: "",
  freeShippingMin: 2999,
  orderIdPrefix: "EZX",
  lowStockThreshold: 5,
  hideOutOfStock: false,
  timezone: "Asia/Kolkata",
  currencyLabel: "INR",
  notifyNewOrder: true,
  notifyLowStock: true,
  notifyPreorderRelease: true,
  gaMeasurementId: "",
  metaPixelId: "",
  docBusinessName: "",
  docAddressLine1: "",
  docAddressLine2: "",
  docCity: "",
  docState: "",
  docPincode: "",
  docGstin: "",
  docPan: "",
  docLogoUrl: "",
  docInvoicePrefix: "INV-",
  docDeclaration:
    "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.",
  docFooterNote: "Thank you for shopping with us.",
  docSignatureLine: true,
};

export const adminProductTabs: { key: AdminProductCategory; label: string }[] = [
  { key: "games", label: "Games" },
  { key: "consoles", label: "Consoles" },
  { key: "accessories", label: "Accessories" },
  { key: "game-cards", label: "Game cards" },
  { key: "preorders", label: "Pre-orders" },
];

export const seedAdminCategories: AdminCategoryRecord[] = [
  {
    id: "cat-games",
    key: "games",
    label: "Games",
    description: "Physical and digital game titles",
    active: true,
  },
  {
    id: "cat-consoles",
    key: "consoles",
    label: "Consoles",
    description: "Hardware consoles and bundles",
    active: true,
  },
  {
    id: "cat-accessories",
    key: "accessories",
    label: "Accessories",
    description: "Controllers, headsets, and gear",
    active: true,
  },
  {
    id: "cat-game-cards",
    key: "game-cards",
    label: "Game cards",
    description: "Wallet top-ups and digital cards",
    active: true,
  },
  {
    id: "cat-preorders",
    key: "preorders",
    label: "Pre-orders",
    description: "Upcoming releases on hold",
    active: true,
  },
];

export function seedAdminBrands(products: { brand: string }[]): AdminBrandRecord[] {
  const names = [...new Set(products.map((p) => p.brand.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
  return names.map((name, index) => ({
    id: `brand-${index + 1}`,
    name,
    active: true,
  }));
}

export function getAdminCatalogRows(category: AdminProductCategory): AdminCatalogRow[] {
  return buildSeedCatalog().filter((row) => row.category === category);
}

export function parseAdminProductKey(key: string): {
  category: AdminProductCategory;
  index: number;
} | null {
  const [category, indexRaw] = key.split(":");
  const index = Number(indexRaw);
  if (
    !adminProductTabs.some((tab) => tab.key === category) ||
    !Number.isInteger(index) ||
    index < 0
  ) {
    return null;
  }
  return { category: category as AdminProductCategory, index };
}

export function getAdminProductByKey(key: string): AdminCatalogRow | null {
  return buildSeedCatalog().find((row) => row.key === key) ?? null;
}

export function getAdminOrderById(id: string) {
  return adminOrders.find((order) => order.id === id) ?? null;
}

export const orderStatusLabels: Record<AdminOrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  preorder: "Pre-order",
  refunded: "Refunded",
};

/** Linear fulfilment rail shown in the customer order tracker. */
export const ORDER_STEPS: AdminOrderStatus[] = [
  "pending",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
];

/** Tailwind classes for a status pill (shared by list + tracker). */
export function statusTone(status: AdminOrderStatus): string {
  switch (status) {
    case "delivered":
      return "bg-[#E7F6EC] text-[#1E7B3C]";
    case "shipped":
    case "packed":
      return "bg-[#E8F0FE] text-[#1A56C4]";
    case "cancelled":
    case "refunded":
      return "bg-[#FDECEC] text-[#B42318]";
    case "preorder":
      return "bg-[#F2ECFB] text-[#6B3FA0]";
    default:
      return "bg-[#F0F0F2] text-[#6E6E73]";
  }
}

export const productStatusLabels: Record<AdminProductStatus, string> = {
  draft: "Draft",
  published: "Published",
  sold_out: "Sold out",
};

export function maskDigitalCode(code: string) {
  const parts = code.split("-");
  if (parts.length < 3) return "••••-••••";
  return `${parts[0]}-XXXX-${parts[parts.length - 1]}`;
}

export function stockLevel(stock: number): "in_stock" | "low" | "out" {
  if (stock <= 0) return "out";
  if (stock <= 5) return "low";
  return "in_stock";
}

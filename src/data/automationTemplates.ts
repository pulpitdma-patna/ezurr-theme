import type {
  AutomationAction,
  AutomationCondition,
  AutomationTrigger,
} from "@/data/admin";

export type AutomationTemplateCategory =
  | "orders"
  | "inventory"
  | "customers"
  | "payments"
  | "messaging";

export type AutomationTemplate = {
  id: string;
  name: string;
  description: string;
  category: AutomationTemplateCategory;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  /** Short ops note shown on the card */
  tip?: string;
};

export const automationTemplateCategories: {
  id: AutomationTemplateCategory | "all";
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "orders", label: "Orders" },
  { id: "inventory", label: "Inventory" },
  { id: "customers", label: "Customers" },
  { id: "payments", label: "Payments" },
  { id: "messaging", label: "Messaging" },
];

export const categoryLabels: Record<AutomationTemplateCategory, string> = {
  orders: "Orders",
  inventory: "Inventory",
  customers: "Customers",
  payments: "Payments",
  messaging: "Messaging",
};

/** Starter templates for gaming ecommerce ops — not live rules until used. */
export const automationTemplates: AutomationTemplate[] = [
  {
    id: "tpl-cod-review",
    name: "Pending COD review",
    description: "Alert ops when a COD order lands in pending and needs a manual check.",
    category: "orders",
    trigger: "order_status_changed",
    conditions: [
      { field: "status", operator: "equals", value: "pending" },
      { field: "payment", operator: "equals", value: "COD" },
    ],
    actions: [{ type: "notify_internal", value: "Review pending COD order" }],
    tip: "Pairs well with high-value COD thresholds.",
  },
  {
    id: "tpl-low-stock",
    name: "Low-stock escalation",
    description: "Escalate SKUs that hit the low-stock event and ping inventory ops.",
    category: "inventory",
    trigger: "stock_low",
    conditions: [],
    actions: [
      { type: "notify_internal", value: "Low stock needs replenishment" },
      { type: "send_webhook", value: "inventory.low" },
    ],
    tip: "Requires Webhooks connected for delivery.",
  },
  {
    id: "tpl-preorder-email",
    name: "Pre-order release email",
    description: "Email the customer when a pre-order is allocated for fulfillment.",
    category: "orders",
    trigger: "preorder_released",
    conditions: [],
    actions: [{ type: "send_email", value: "Your pre-order is ready for fulfillment" }],
  },
  {
    id: "tpl-preorder-whatsapp",
    name: "Pre-order WhatsApp release",
    description: "Send a WhatsApp release update when messaging is healthy.",
    category: "messaging",
    trigger: "preorder_released",
    conditions: [],
    actions: [{ type: "send_whatsapp", value: "Your pre-order is ready" }],
    tip: "Blocked if WhatsApp integration is paused.",
  },
  {
    id: "tpl-payment-ack",
    name: "Prepaid payment acknowledgement",
    description: "Acknowledge successfully captured prepaid payments with an email.",
    category: "payments",
    trigger: "payment_captured",
    conditions: [{ field: "payment", operator: "equals", value: "Prepaid" }],
    actions: [{ type: "send_email", value: "Payment received" }],
  },
  {
    id: "tpl-welcome-tag",
    name: "New-customer welcome tagging",
    description: "Tag newly created customer records for onboarding campaigns.",
    category: "customers",
    trigger: "customer_created",
    conditions: [],
    actions: [{ type: "add_customer_tag", value: "new-customer" }],
  },
  {
    id: "tpl-payment-failed",
    name: "Failed payment follow-up",
    description: "Notify internal ops when a prepaid attempt fails at checkout.",
    category: "payments",
    trigger: "payment_failed",
    conditions: [],
    actions: [{ type: "notify_internal", value: "Payment failed — follow up with customer" }],
  },
  {
    id: "tpl-payment-authorized",
    name: "Authorized payment hold note",
    description: "Log an internal note when a payment is authorized but not yet captured.",
    category: "payments",
    trigger: "payment_authorized",
    conditions: [{ field: "payment", operator: "equals", value: "Prepaid" }],
    actions: [{ type: "notify_internal", value: "Payment authorized — awaiting capture" }],
  },
  {
    id: "tpl-shipped-email",
    name: "Shipped status email",
    description: "Email customers when an order moves to shipped.",
    category: "orders",
    trigger: "order_status_changed",
    conditions: [{ field: "status", operator: "equals", value: "shipped" }],
    actions: [{ type: "send_email", value: "Your order is on the way" }],
  },
  {
    id: "tpl-delivered-tag",
    name: "Delivered VIP nudge",
    description: "Tag delivered prepaid customers for a post-purchase VIP list.",
    category: "customers",
    trigger: "order_status_changed",
    conditions: [
      { field: "status", operator: "equals", value: "delivered" },
      { field: "payment", operator: "equals", value: "Prepaid" },
    ],
    actions: [{ type: "add_customer_tag", value: "delivered-prepaid" }],
  },
  {
    id: "tpl-cancelled-alert",
    name: "Cancellation alert",
    description: "Ping the team when an order is cancelled so stock and refunds stay in sync.",
    category: "orders",
    trigger: "order_status_changed",
    conditions: [{ field: "status", operator: "equals", value: "cancelled" }],
    actions: [
      { type: "notify_internal", value: "Order cancelled — review refund & stock" },
      { type: "send_webhook", value: "orders.cancelled" },
    ],
  },
  {
    id: "tpl-stock-webhook",
    name: "Inventory webhook only",
    description: "Fire a webhook on low stock without an internal notification.",
    category: "inventory",
    trigger: "stock_low",
    conditions: [],
    actions: [{ type: "send_webhook", value: "inventory.low" }],
    tip: "Lean template for external WMS hooks.",
  },
];

export function getAutomationTemplate(id: string) {
  return automationTemplates.find((template) => template.id === id) ?? null;
}

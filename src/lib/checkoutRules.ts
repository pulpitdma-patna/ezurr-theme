import type { AdminSettings, AutomationCondition } from "@/data/admin";

export type CheckoutConditionField =
  | "subtotal"
  | "pincode"
  | "city"
  | "payment_method"
  | "fulfillment_type"
  | "product_category";

export type CheckoutConditionMode = "rows" | "script";

export type CheckoutRuleCondition = AutomationCondition & {
  mode?: "row" | "script";
  script?: string;
};

export type CheckoutActionType =
  | "allow_payment_methods"
  | "hide_payment_method"
  | "set_prepaid_discount_pct"
  | "set_cod_max"
  | "set_shipping"
  | "require_field"
  | "hide_field"
  | "set_banner"
  | "block_checkout"
  | "allow_gateways"
  | "hide_gateway"
  | "prefer_gateway"
  | "set_tax_rate"
  | "set_tax_inclusive_message"
  | "exempt_tax"
  | "set_carrier"
  | "set_rate_table"
  | "hide_carrier"
  | "set_deposit_pct"
  | "enable_pay_later"
  | "split_payment";

export type CheckoutRuleAction = {
  type: CheckoutActionType;
  value?: string;
};

export type AdminCheckoutRule = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  conditions: CheckoutRuleCondition[];
  actions: CheckoutRuleAction[];
  conditionMode?: CheckoutConditionMode;
  script?: string;
  experimentId?: string;
  variant?: string;
  trafficPct?: number;
  createdAt: string;
  updatedAt: string;
};

export type CheckoutPaymentMethod = "prepaid" | "cod";

export type CheckoutGateway = "upi" | "card" | "wallet" | "cod";

export type CheckoutCarrierId = "bluedart" | "delhivery" | "dunzo" | "pickup";

export type CheckoutFieldKey =
  | "mobile"
  | "firstName"
  | "lastName"
  | "address"
  | "city"
  | "pincode"
  | "upi";

export type CheckoutCarrierOption = {
  id: CheckoutCarrierId;
  label: string;
  amount: number;
  eta: string;
};

export type CheckoutSplitOption = {
  id: string;
  label: string;
  depositPct: number;
  balanceLabel: string;
};

export type CheckoutPolicy = {
  methods: CheckoutPaymentMethod[];
  prepaidDiscountPct: number;
  codMax: number;
  shippingLabel: string;
  shippingAmount: number;
  requiredFields: CheckoutFieldKey[];
  hiddenFields: CheckoutFieldKey[];
  banner: string | null;
  blocked: boolean;
  blockMessage: string | null;
  gateways: CheckoutGateway[];
  preferredGateway: CheckoutGateway | null;
  taxRatePct: number;
  taxExempt: boolean;
  taxInclusiveMessage: string | null;
  carriers: CheckoutCarrierOption[];
  hiddenCarriers: CheckoutCarrierId[];
  defaultCarrierId: CheckoutCarrierId | null;
  depositPct: number | null;
  payLaterEnabled: boolean;
  splitPayments: CheckoutSplitOption[];
  activeExperiment: { experimentId: string; variant: string } | null;
};

export type CheckoutContext = {
  subtotal: number;
  pincode?: string;
  city?: string;
  paymentMethod?: CheckoutPaymentMethod;
  fulfillmentType?: "physical" | "digital" | "preorder";
  productCategory?: string;
  sessionKey?: string;
};

export type ScriptEvalResult = {
  ok: boolean;
  error?: string;
};

const DEFAULT_GATEWAYS: CheckoutGateway[] = ["upi", "card", "wallet"];

export const DEMO_CARRIERS: CheckoutCarrierOption[] = [
  { id: "bluedart", label: "Blue Dart Express", amount: 0, eta: "3–5 days" },
  { id: "delhivery", label: "Delhivery Standard", amount: 79, eta: "4–6 days" },
  { id: "dunzo", label: "Dunzo Same-day", amount: 149, eta: "Same day" },
  { id: "pickup", label: "Store pickup", amount: 0, eta: "Ready in 2 hrs" },
];

const CARRIER_LABELS: Record<CheckoutCarrierId, string> = {
  bluedart: "Blue Dart Express",
  delhivery: "Delhivery Standard",
  dunzo: "Dunzo Same-day",
  pickup: "Store pickup",
};

const CARRIER_ETA: Record<CheckoutCarrierId, string> = {
  bluedart: "3–5 days",
  delhivery: "4–6 days",
  dunzo: "Same day",
  pickup: "Ready in 2 hrs",
};

function parseGatewayList(value: string | undefined): CheckoutGateway[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(
      (s): s is CheckoutGateway =>
        s === "upi" || s === "card" || s === "wallet" || s === "cod",
    );
}

function parseCarrierId(value: string | undefined): CheckoutCarrierId | null {
  const id = value?.split(":")[0]?.trim();
  if (id === "bluedart" || id === "delhivery" || id === "dunzo" || id === "pickup") {
    return id;
  }
  return null;
}

function parseSplitPayments(value: string | undefined): CheckoutSplitOption[] {
  if (!value?.trim()) return [];
  return value.split("|").map((chunk, index) => {
    const [pctRaw, labelRaw] = chunk.split(":");
    const depositPct = Math.min(100, Math.max(0, Number(pctRaw) || 0));
    const label = labelRaw?.trim() || `${depositPct}% now`;
    return {
      id: `split-${index}-${depositPct}`,
      label,
      depositPct,
      balanceLabel: `${100 - depositPct}% on release`,
    };
  });
}

function parseRateTable(value: string | undefined): CheckoutCarrierOption[] {
  if (!value?.trim()) return [];
  return value.split(",").flatMap((entry) => {
    const [idRaw, amountRaw] = entry.split(":");
    const id = parseCarrierId(idRaw);
    if (!id) return [];
    const amount = Math.max(0, Number(amountRaw) || 0);
    return [
      {
        id,
        label: CARRIER_LABELS[id],
        amount,
        eta: CARRIER_ETA[id],
      },
    ];
  });
}

function conditionMatches(
  condition: CheckoutRuleCondition,
  ctx: CheckoutContext,
): boolean {
  if (condition.mode === "script" && condition.script?.trim()) {
    return evalCheckoutScript(condition.script, ctx).ok;
  }

  const raw =
    condition.field === "subtotal"
      ? String(ctx.subtotal)
      : condition.field === "pincode"
        ? String(ctx.pincode ?? "")
        : condition.field === "city"
          ? String(ctx.city ?? "")
          : condition.field === "payment_method"
            ? String(ctx.paymentMethod ?? "")
            : condition.field === "fulfillment_type"
              ? String(ctx.fulfillmentType ?? "")
              : condition.field === "product_category"
                ? String(ctx.productCategory ?? "")
                : "";

  if (condition.operator === "equals") return raw === condition.value;
  if (condition.operator === "not_equals") return raw !== condition.value;
  if (condition.operator === "contains") {
    return raw.toLowerCase().includes(condition.value.toLowerCase());
  }
  return Number(raw) <= Number(condition.value);
}

function ruleConditionsMatch(rule: AdminCheckoutRule, ctx: CheckoutContext): boolean {
  if (rule.conditionMode === "script") {
    if (!rule.script?.trim()) return true;
    return evalCheckoutScript(rule.script, ctx).ok;
  }
  if (rule.conditions.length === 0) return true;
  return rule.conditions.every((c) => conditionMatches(c, ctx));
}

/** Sandboxed checkout DSL — identifiers from cart context only. */
export function evalCheckoutScript(
  script: string,
  ctx: CheckoutContext,
): ScriptEvalResult {
  const trimmed = script.trim();
  if (!trimmed) return { ok: true };

  const safe = trimmed.replace(/[^a-zA-Z0-9_+\-*/%().\s'"<>=!&|,]/g, "");
  if (safe !== trimmed) {
    return { ok: false, error: "Unsupported characters in script." };
  }

  const env: Record<string, string | number> = {
    subtotal: ctx.subtotal,
    pincode: ctx.pincode ?? "",
    city: ctx.city ?? "",
    payment_method: ctx.paymentMethod ?? "",
    fulfillment_type: ctx.fulfillmentType ?? "",
    product_category: ctx.productCategory ?? "",
  };

  try {
    const keys = Object.keys(env);
    const fn = new Function(
      ...keys,
      `"use strict"; return Boolean(${safe});`,
    ) as (...args: (string | number)[]) => boolean;
    return { ok: fn(...keys.map((k) => env[k])) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Script failed to evaluate.",
    };
  }
}

function experimentBucket(sessionKey: string, experimentId: string): number {
  const input = `${sessionKey}:${experimentId}`;
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % 100;
  }
  return hash;
}

function selectExperimentVariants(
  rules: AdminCheckoutRule[],
  sessionKey: string,
): Map<string, string> {
  const grouped = new Map<string, AdminCheckoutRule[]>();
  for (const rule of rules) {
    if (!rule.experimentId) continue;
    const list = grouped.get(rule.experimentId) ?? [];
    list.push(rule);
    grouped.set(rule.experimentId, list);
  }

  const selected = new Map<string, string>();
  for (const [experimentId, expRules] of grouped) {
    const variantNames = [
      ...new Set(expRules.map((r) => r.variant?.trim() || "control")),
    ];
    const bucket = experimentBucket(sessionKey, experimentId);
    let cursor = 0;
    for (const variant of variantNames) {
      const sample = expRules.find(
        (r) => (r.variant?.trim() || "control") === variant,
      );
      const pct = Math.min(100, Math.max(0, sample?.trafficPct ?? 50));
      if (bucket >= cursor && bucket < cursor + pct) {
        selected.set(experimentId, variant);
        break;
      }
      cursor += pct;
    }
    if (!selected.has(experimentId) && variantNames[0]) {
      selected.set(experimentId, variantNames[0]);
    }
  }
  return selected;
}

function parseShipping(value: string | undefined): {
  label: string;
  amount: number;
} {
  if (!value || value === "free") return { label: "FREE", amount: 0 };
  if (value.startsWith("flat:")) {
    const amount = Math.max(0, Number(value.slice(5)) || 0);
    return {
      label: amount === 0 ? "FREE" : `₹${amount.toLocaleString("en-IN")}`,
      amount,
    };
  }
  return { label: value, amount: 0 };
}

export function baseCheckoutPolicy(settings: AdminSettings): CheckoutPolicy {
  const methods: CheckoutPaymentMethod[] = ["prepaid"];
  if (settings.codEnabled !== false) methods.push("cod");
  return {
    methods,
    prepaidDiscountPct: settings.prepaidDiscount ?? 0,
    codMax: settings.codLimit ?? 10000,
    shippingLabel: "FREE",
    shippingAmount: 0,
    requiredFields: ["mobile", "firstName", "address", "city", "pincode"],
    hiddenFields: [],
    banner: null,
    blocked: false,
    blockMessage: null,
    gateways: [...DEFAULT_GATEWAYS],
    preferredGateway: "upi",
    taxRatePct: 18,
    taxExempt: false,
    taxInclusiveMessage: null,
    carriers: structuredClone(DEMO_CARRIERS),
    hiddenCarriers: [],
    defaultCarrierId: "bluedart",
    depositPct: null,
    payLaterEnabled: false,
    splitPayments: [],
    activeExperiment: null,
  };
}

export function resolveCheckoutPolicy(
  settings: AdminSettings,
  rules: AdminCheckoutRule[],
  ctx: CheckoutContext,
): CheckoutPolicy {
  let policy = baseCheckoutPolicy(settings);
  const sessionKey =
    ctx.sessionKey ??
    `cart:${ctx.subtotal}:${ctx.pincode ?? ""}:${ctx.city ?? ""}`;

  if (
    typeof settings.freeShippingMin === "number" &&
    settings.freeShippingMin > 0 &&
    ctx.subtotal < settings.freeShippingMin
  ) {
    policy = {
      ...policy,
      shippingLabel: "Calculated at dispatch",
      shippingAmount: 0,
    };
  }

  const enabled = [...rules]
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority);

  const experimentVariants = selectExperimentVariants(enabled, sessionKey);
  let activeExperiment: CheckoutPolicy["activeExperiment"] = null;

  for (const rule of enabled) {
    if (rule.experimentId) {
      const winner = experimentVariants.get(rule.experimentId);
      const variant = rule.variant?.trim() || "control";
      if (winner !== variant) continue;
      activeExperiment = { experimentId: rule.experimentId, variant };
    }

    if (!ruleConditionsMatch(rule, ctx)) continue;

    for (const action of rule.actions) {
      switch (action.type) {
        case "allow_payment_methods": {
          const allowed = (action.value ?? "prepaid,cod")
            .split(",")
            .map((s) => s.trim())
            .filter(
              (s): s is CheckoutPaymentMethod =>
                s === "prepaid" || s === "cod",
            );
          policy = {
            ...policy,
            methods: allowed.length ? allowed : ["prepaid"],
          };
          break;
        }
        case "hide_payment_method": {
          const hide = action.value === "cod" ? "cod" : "prepaid";
          policy = {
            ...policy,
            methods: policy.methods.filter((m) => m !== hide),
          };
          if (policy.methods.length === 0) policy.methods = ["prepaid"];
          break;
        }
        case "set_prepaid_discount_pct": {
          policy = {
            ...policy,
            prepaidDiscountPct: Math.min(
              50,
              Math.max(0, Number(action.value) || 0),
            ),
          };
          break;
        }
        case "set_cod_max": {
          policy = {
            ...policy,
            codMax: Math.max(0, Number(action.value) || 0),
          };
          break;
        }
        case "set_shipping": {
          const ship = parseShipping(action.value);
          policy = {
            ...policy,
            shippingLabel: ship.label,
            shippingAmount: ship.amount,
          };
          break;
        }
        case "require_field": {
          const field = action.value as CheckoutFieldKey;
          if (field && !policy.requiredFields.includes(field)) {
            policy = {
              ...policy,
              requiredFields: [...policy.requiredFields, field],
              hiddenFields: policy.hiddenFields.filter((f) => f !== field),
            };
          }
          break;
        }
        case "hide_field": {
          const field = action.value as CheckoutFieldKey;
          if (field) {
            policy = {
              ...policy,
              hiddenFields: policy.hiddenFields.includes(field)
                ? policy.hiddenFields
                : [...policy.hiddenFields, field],
              requiredFields: policy.requiredFields.filter((f) => f !== field),
            };
          }
          break;
        }
        case "set_banner": {
          policy = { ...policy, banner: action.value?.trim() || null };
          break;
        }
        case "block_checkout": {
          policy = {
            ...policy,
            blocked: true,
            blockMessage:
              action.value?.trim() || "Checkout is unavailable for this cart.",
          };
          break;
        }
        case "allow_gateways": {
          const allowed = parseGatewayList(action.value);
          policy = {
            ...policy,
            gateways: allowed.length ? allowed : policy.gateways,
          };
          break;
        }
        case "hide_gateway": {
          const hide = parseGatewayList(action.value)[0];
          if (hide) {
            policy = {
              ...policy,
              gateways: policy.gateways.filter((g) => g !== hide),
            };
          }
          break;
        }
        case "prefer_gateway": {
          const preferred = parseGatewayList(action.value)[0];
          if (preferred) {
            policy = { ...policy, preferredGateway: preferred };
          }
          break;
        }
        case "set_tax_rate": {
          policy = {
            ...policy,
            taxRatePct: Math.min(50, Math.max(0, Number(action.value) || 0)),
            taxExempt: false,
          };
          break;
        }
        case "set_tax_inclusive_message": {
          policy = {
            ...policy,
            taxInclusiveMessage: action.value?.trim() || null,
          };
          break;
        }
        case "exempt_tax": {
          policy = { ...policy, taxExempt: true, taxRatePct: 0 };
          break;
        }
        case "set_carrier": {
          const id = parseCarrierId(action.value);
          if (id) {
            const amount = Number(action.value?.split(":")[1]) || 0;
            const carrier: CheckoutCarrierOption = {
              id,
              label: CARRIER_LABELS[id],
              amount: Math.max(0, amount),
              eta: CARRIER_ETA[id],
            };
            policy = {
              ...policy,
              defaultCarrierId: id,
              shippingLabel:
                carrier.amount === 0
                  ? "FREE"
                  : `₹${carrier.amount.toLocaleString("en-IN")}`,
              shippingAmount: carrier.amount,
              carriers: [
                carrier,
                ...policy.carriers.filter((c) => c.id !== id),
              ],
            };
          }
          break;
        }
        case "set_rate_table": {
          const table = parseRateTable(action.value);
          if (table.length) {
            policy = {
              ...policy,
              carriers: table,
              defaultCarrierId: table[0].id,
              shippingLabel:
                table[0].amount === 0
                  ? "FREE"
                  : `₹${table[0].amount.toLocaleString("en-IN")}`,
              shippingAmount: table[0].amount,
            };
          }
          break;
        }
        case "hide_carrier": {
          const hide = parseCarrierId(action.value);
          if (hide) {
            policy = {
              ...policy,
              hiddenCarriers: policy.hiddenCarriers.includes(hide)
                ? policy.hiddenCarriers
                : [...policy.hiddenCarriers, hide],
            };
          }
          break;
        }
        case "set_deposit_pct": {
          policy = {
            ...policy,
            depositPct: Math.min(100, Math.max(0, Number(action.value) || 0)),
          };
          break;
        }
        case "enable_pay_later": {
          policy = { ...policy, payLaterEnabled: action.value !== "false" };
          break;
        }
        case "split_payment": {
          const splits = parseSplitPayments(action.value);
          if (splits.length) {
            policy = { ...policy, splitPayments: splits };
          }
          break;
        }
        default:
          break;
      }
    }
  }

  policy = {
    ...policy,
    activeExperiment,
    carriers: policy.carriers.filter(
      (c) => !policy.hiddenCarriers.includes(c.id),
    ),
    gateways:
      policy.gateways.length > 0
        ? policy.gateways
        : [...DEFAULT_GATEWAYS],
  };

  if (policy.methods.includes("cod") && ctx.subtotal > policy.codMax) {
    policy = {
      ...policy,
      methods: policy.methods.filter((m) => m !== "cod"),
      gateways: policy.gateways.filter((g) => g !== "cod"),
    };
  }

  if (ctx.paymentMethod === "cod") {
    policy = {
      ...policy,
      gateways: policy.gateways.includes("cod")
        ? (["cod"] as CheckoutGateway[])
        : policy.gateways,
    };
  } else if (!policy.gateways.includes("cod")) {
    policy = {
      ...policy,
      gateways: policy.gateways.filter((g) => g !== "cod"),
    };
  }

  return policy;
}

/** Mock conversion stats for admin experiment rows. */
export function mockExperimentStats(experimentId: string, variant: string) {
  const seed = experimentBucket(`${experimentId}:${variant}`, "stats");
  const sessions = 800 + seed * 17;
  const conversions = Math.round(sessions * (0.08 + (seed % 12) / 200));
  return {
    sessions,
    conversions,
    ratePct: Number(((conversions / sessions) * 100).toFixed(1)),
  };
}

export function migrateCheckoutRules(
  saved: AdminCheckoutRule[] | undefined,
  seed: AdminCheckoutRule[],
): AdminCheckoutRule[] {
  if (!Array.isArray(saved) || saved.length === 0) return seed;
  const byId = new Map(saved.map((r) => [r.id, r]));
  for (const rule of seed) {
    if (!byId.has(rule.id)) byId.set(rule.id, rule);
  }
  return [...byId.values()].sort((a, b) => a.priority - b.priority);
}

export function seedCheckoutRules(now = new Date().toISOString()): AdminCheckoutRule[] {
  return [
    {
      id: "cr-cod-max",
      name: "Enforce COD maximum",
      description: "Hide COD when cart exceeds the configured COD limit (via set_cod_max).",
      enabled: true,
      priority: 10,
      conditions: [],
      actions: [{ type: "set_cod_max", value: "10000" }],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "cr-hide-cod-digital",
      name: "No COD on digital",
      description: "Digital fulfillments must use prepaid.",
      enabled: true,
      priority: 20,
      conditions: [
        { field: "fulfillment_type", operator: "equals", value: "digital" },
      ],
      actions: [{ type: "hide_payment_method", value: "cod" }],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "cr-free-ship",
      name: "Free shipping on preorders",
      description: "Pre-order carts get free shipping.",
      enabled: true,
      priority: 30,
      conditions: [
        { field: "fulfillment_type", operator: "equals", value: "preorder" },
      ],
      actions: [{ type: "set_shipping", value: "free" }],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "cr-prepaid-bump",
      name: "Prepaid bump for preorders",
      description: "Offer 12% prepaid discount on pre-order checkouts.",
      enabled: false,
      priority: 40,
      conditions: [
        { field: "fulfillment_type", operator: "equals", value: "preorder" },
      ],
      actions: [{ type: "set_prepaid_discount_pct", value: "12" }],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "cr-pin-block",
      name: "Block restricted PINs",
      description: "Demo blocklist for PINs starting with 000.",
      enabled: false,
      priority: 5,
      conditions: [{ field: "pincode", operator: "contains", value: "000" }],
      actions: [
        {
          type: "block_checkout",
          value: "We cannot ship to this PIN yet. Try another address.",
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "cr-banner",
      name: "Checkout trust banner",
      description: "Show a prepaid savings reminder on the payment step.",
      enabled: true,
      priority: 50,
      conditions: [],
      actions: [
        {
          type: "set_banner",
          value: "Pay prepaid to lock your minimum price and save at checkout.",
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "cr-gateways-upi",
      name: "UPI-first gateways",
      description: "Prefer UPI and hide wallet on pre-order carts.",
      enabled: true,
      priority: 55,
      conditions: [
        { field: "fulfillment_type", operator: "equals", value: "preorder" },
      ],
      actions: [
        { type: "allow_gateways", value: "upi,card" },
        { type: "prefer_gateway", value: "upi" },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "cr-gst-inclusive",
      name: "GST inclusive copy",
      description: "Show inclusive tax message for India checkout.",
      enabled: true,
      priority: 60,
      conditions: [],
      actions: [
        { type: "set_tax_rate", value: "18" },
        {
          type: "set_tax_inclusive_message",
          value: "Prices include 18% GST for India billing.",
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "cr-carrier-table",
      name: "Metro carrier table",
      description: "Rate table for Bengaluru PINs — Blue Dart free, Delhivery ₹79.",
      enabled: true,
      priority: 65,
      conditions: [{ field: "pincode", operator: "contains", value: "560" }],
      actions: [
        { type: "set_rate_table", value: "bluedart:0,delhivery:79,dunzo:149" },
        { type: "hide_carrier", value: "pickup" },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "cr-deposit-split",
      name: "25% deposit split",
      description: "Enable pay-later with a 25/75 split on high-value pre-orders.",
      enabled: false,
      priority: 70,
      conditions: [
        { field: "subtotal", operator: "less_than_or_equal", value: "99999" },
      ],
      actions: [
        { type: "enable_pay_later", value: "true" },
        { type: "set_deposit_pct", value: "25" },
        {
          type: "split_payment",
          value: "25:Pay 25% today|75:Balance on release",
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "cr-exp-banner-a",
      name: "A/B — trust banner (control)",
      description: "Control variant for checkout banner experiment.",
      enabled: true,
      priority: 80,
      experimentId: "exp-checkout-banner",
      variant: "control",
      trafficPct: 50,
      conditions: [],
      actions: [
        {
          type: "set_banner",
          value: "Pay prepaid to lock your minimum price and save at checkout.",
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "cr-exp-banner-b",
      name: "A/B — trust banner (urgency)",
      description: "Variant B — urgency-led banner copy.",
      enabled: true,
      priority: 81,
      experimentId: "exp-checkout-banner",
      variant: "urgency",
      trafficPct: 50,
      conditions: [],
      actions: [
        {
          type: "set_banner",
          value: "Lock launch-day pricing — prepaid reservations close midnight IST.",
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "cr-script-metro",
      name: "Script — metro free ship",
      description: "Advanced script condition for metro + high subtotal.",
      enabled: false,
      priority: 45,
      conditionMode: "script",
      script: "subtotal >= 5000 && pincode.startsWith('56')",
      conditions: [],
      actions: [{ type: "set_shipping", value: "free" }],
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/**
 * The rules that decide what a customer is offered at checkout, and the words
 * that say what each one does.
 *
 * Two halves:
 *
 *  1. THE ENGINE (unchanged in shape) — `resolveCheckoutPolicy` is the browser
 *     mirror of `CheckoutPolicyService` on the server. The server is the
 *     authority: it prices every real order and refuses the ones a rule blocks.
 *     This copy runs the practice shop and the "what would this do" line in the
 *     admin, so where the two disagree the admin lies about real money.
 *
 *  2. THE GRAMMAR — every rule the engine can express, said as one sentence a
 *     shopkeeper could read out to a customer. Same `SentenceSlot` shape the
 *     automatic messages use, so the admin has one way of showing a rule rather
 *     than two.
 */

import type { AdminSettings, AutomationCondition } from "@/data/admin";
import { formatInr } from "@/data/admin";
import { sentenceToText, type SentenceSlot } from "@/lib/automationGrammar";

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
  | "set_cod_advance"
  | "set_reservation_amount"
  | "set_tax_inclusive"
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
  /**
   * Whether catalogue prices already contain GST. A real boolean — the
   * storefront previously inferred this from `taxInclusiveMessage` being a
   * non-empty string, so a message saying prices EXCLUDE tax was read as
   * "inclusive" and silently dropped 18% from every client-side total.
   */
  taxInclusive: boolean;
  taxInclusiveMessage: string | null;
  carriers: CheckoutCarrierOption[];
  hiddenCarriers: CheckoutCarrierId[];
  defaultCarrierId: CheckoutCarrierId | null;
  depositPct: number | null;
  /** Flat ₹ paid online to confirm COD; deducted from the door collection. */
  codAdvance: number;
  codAdvanceLabel: string | null;
  /** When true the advance replaces the codMax ceiling entirely. */
  codAdvanceUnlocksCap: boolean;
  /** Default flat ₹ to reserve a pre-order (product value takes precedence). */
  reservationAmount: number;
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
  // Per-condition script mode was removed (client new Function / server eval()).

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
  // Script mode was removed for security; such rules no longer match.
  if (rule.conditionMode === "script") return false;
  if (rule.conditions.length === 0) return true;
  return rule.conditions.every((c) => conditionMatches(c, ctx));
}

/**
 * Script mode was removed — it used `new Function` (client) / `eval()` (server),
 * an arbitrary-code-execution surface. Kept as a no-op so any legacy reference
 * resolves to "does not match" rather than executing code.
 */
export function evalCheckoutScript(
  _script: string,
  _ctx: CheckoutContext,
): ScriptEvalResult {
  return { ok: false, error: "Script mode has been removed." };
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
    // These four come from Settings → Checkout on the server
    // (CheckoutPolicyService::basePolicy). This copy used to hard-code them,
    // so the shop owner could set "prices already include GST" to off, or ask
    // for ₹100 up front on every cash-on-delivery order, and see none of it in
    // the admin preview or the practice storefront — only on a real order,
    // after a customer had already been quoted the other number.
    taxInclusive: settings.taxInclusive !== false,
    taxInclusiveMessage: null,
    carriers: structuredClone(DEMO_CARRIERS),
    hiddenCarriers: [],
    defaultCarrierId: "bluedart",
    depositPct: null,
    codAdvance: Math.max(0, settings.codAdvance ?? 0),
    codAdvanceLabel: settings.codAdvanceLabel?.trim() || null,
    codAdvanceUnlocksCap: settings.codAdvanceUnlocksCap === true,
    reservationAmount: 0,
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
        // "100" | "100!" (also lifts the COD cap) | "100:Custom label"
        case "set_cod_advance": {
          const [amountRaw, label] = String(action.value ?? "").split(":");
          const trimmed = (amountRaw ?? "").trim();
          policy = {
            ...policy,
            codAdvance: Math.max(0, Number(trimmed.replace(/!$/, "")) || 0),
            codAdvanceLabel: label?.trim() || null,
            codAdvanceUnlocksCap: trimmed.endsWith("!"),
          };
          break;
        }
        case "set_tax_inclusive": {
          policy = { ...policy, taxInclusive: action.value !== "false" };
          break;
        }
        case "set_reservation_amount": {
          policy = {
            ...policy,
            reservationAmount: Math.max(0, Number(action.value) || 0),
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

  // An advance is a commitment that stands in for the value ceiling: once the
  // customer has actually paid something, high-value cash on delivery is
  // allowed. The server has always worked this way; this copy did not, so a
  // shop that had switched the ceiling off still saw cash on delivery vanish
  // from its own storefront above ₹10,000.
  const advanceLiftsCap = policy.codAdvance > 0 && policy.codAdvanceUnlocksCap;

  if (policy.methods.includes("cod") && !advanceLiftsCap && ctx.subtotal > policy.codMax) {
    policy = {
      ...policy,
      methods: policy.methods.filter((m) => m !== "cod"),
      gateways: policy.gateways.filter((g) => g !== "cod"),
      banner:
        policy.banner ??
        `COD unavailable above ${formatInr(policy.codMax)}. Pay prepaid to continue.`,
    };
    // Never leave a checkout with no way to pay at all.
    if (policy.methods.length === 0) policy = { ...policy, methods: ["prepaid"] };
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

// `mockExperimentStats` used to live here: it hashed the rule's own id into a
// session count and a conversion rate, and the admin printed the result under
// the rule as "Mock CVR 11.4% · 103/902 sessions". Nobody visited that shop.
// A number the owner might act on must come from something that happened.

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

/**
 * The practice shop's rules.
 *
 * There were thirteen. Two were halves of a split test whose only readout was
 * an invented conversion rate; one ran on a "script" condition the server
 * removed for safety, so it showed as On and did nothing for ever; and one said
 * "high-value pre-orders" over a condition that matches every order UNDER
 * ₹99,999. A practice shop is where the owner learns what a rule is, so every
 * rule in it has to be one he could really have written, doing really what it
 * says.
 */
export function seedCheckoutRules(now = new Date().toISOString()): AdminCheckoutRule[] {
  return [
    {
      id: "cr-hide-cod-digital",
      name: "",
      description: "",
      enabled: true,
      priority: 10,
      conditions: [{ field: "fulfillment_type", operator: "equals", value: "digital" }],
      actions: [{ type: "hide_payment_method", value: "cod" }],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "cr-cod-max",
      name: "",
      description: "",
      enabled: true,
      priority: 20,
      conditions: [],
      actions: [{ type: "set_cod_max", value: "10000" }],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "cr-small-order-delivery",
      name: "",
      description: "",
      enabled: true,
      priority: 30,
      conditions: [{ field: "subtotal", operator: "less_than_or_equal", value: "1999" }],
      actions: [{ type: "set_shipping", value: "flat:79" }],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "cr-preorder-hold",
      name: "",
      description: "",
      enabled: false,
      priority: 40,
      conditions: [{ field: "fulfillment_type", operator: "equals", value: "preorder" }],
      actions: [{ type: "set_reservation_amount", value: "500" }],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "cr-pin-block",
      name: "",
      description: "",
      enabled: false,
      priority: 50,
      conditions: [{ field: "pincode", operator: "contains", value: "000" }],
      actions: [
        {
          type: "block_checkout",
          value: "We cannot deliver to this PIN code yet. Please try another address.",
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
  ];
}

// ---------------------------------------------------------------------------
// One rule, one sentence
// ---------------------------------------------------------------------------

/**
 * The old screen showed a rule as a name, a grey description someone typed once
 * and never updated, and a line reading "1 condition · Shipping". Nothing on it
 * said what happened to a customer or to any money, and the three parts could
 * disagree with each other for ever without anything looking wrong.
 *
 * Every word below is chosen so the finished sentence is one the shop owner
 * could say out loud across the counter. Two rules make it safe rather than
 * decorative:
 *
 *  1. The words are built from the SAVED rule, never from its description, so
 *     the sentence cannot drift away from what the checkout will really do.
 *  2. The list and the editor call the same builder, so the sentence he reads
 *     in the list is the same string, character for character, as the one he
 *     edits — that is the whole reason the list can be trusted.
 *
 * Amounts, percentages and charges are offered as ready-made choices rather
 * than typed. A shopkeeper sets round numbers, and a closed list means a rule
 * cannot be saved with a value the engine will not understand. Anything already
 * saved that is not on the list is added to it, so nothing is ever lost or
 * quietly rounded.
 */

type Choice = { value: string; label: string };

/** Keep a saved value selectable even when it is not one of the ready-made ones. */
function withSaved(options: Choice[], saved: string | undefined, label: (v: string) => string): Choice[] {
  const value = (saved ?? "").trim();
  if (!value || options.some((o) => o.value === value)) return options;
  return [...options, { value, label: label(value) }];
}

/**
 * How an amount nobody offered still reads as money.
 *
 * A rule saved as `flat:63` must say "₹63" in the sentence. Falling back to the
 * stored value would put "flat:63" in front of him — the exact shape of thing
 * this screen exists to stop showing.
 */
function savedLabel(type: CheckoutActionType, value: string): string {
  if (type === "set_shipping") {
    if (value === "free") return "free";
    const amount = Number(value.replace(/^flat:/, ""));
    return Number.isFinite(amount) && value.startsWith("flat:") ? rupees(amount) : value;
  }
  if (type === "set_cod_max" || type === "set_cod_advance" || type === "set_reservation_amount") {
    const amount = Number(value);
    return Number.isFinite(amount) ? rupees(amount) : value;
  }
  if (type === "set_prepaid_discount_pct" || type === "set_deposit_pct" || type === "set_tax_rate") {
    const pct = Number(value);
    return Number.isFinite(pct) ? `${pct}%` : value;
  }
  if (type === "set_carrier" || type === "hide_carrier") {
    return CARRIER_LABELS[value as CheckoutCarrierId] ?? value;
  }
  if (type === "prefer_gateway" || type === "hide_gateway") {
    return PAY_BUTTON_WORDS[value] ?? value;
  }
  return value;
}

const rupees = (n: number) => formatInr(n);

export const ORDER_KIND_WORDS: Record<string, string> = {
  physical: "something you post",
  digital: "a game code",
  preorder: "a pre-order",
};

export const ORDER_KIND_OPTIONS: Choice[] = Object.entries(ORDER_KIND_WORDS).map(
  ([value, label]) => ({ value, label }),
);

export const PAY_WITH_WORDS: Record<string, string> = {
  prepaid: "online",
  cod: "cash on delivery",
};

export const PAY_WITH_OPTIONS: Choice[] = Object.entries(PAY_WITH_WORDS).map(
  ([value, label]) => ({ value, label }),
);

const AMOUNT_STEPS = [500, 1000, 1500, 1999, 2500, 5000, 7500, 10000, 15000, 20000, 25000, 50000];
const AMOUNT_OPTIONS: Choice[] = AMOUNT_STEPS.map((n) => ({ value: String(n), label: rupees(n) }));

const DELIVERY_CHARGE_OPTIONS: Choice[] = [
  { value: "free", label: "free" },
  ...[39, 49, 59, 79, 99, 149, 199].map((n) => ({ value: `flat:${n}`, label: rupees(n) })),
];

const DISCOUNT_PCT_OPTIONS: Choice[] = [5, 8, 10, 12, 15, 20, 25].map((n) => ({
  value: String(n),
  label: `${n}%`,
}));

const DEPOSIT_PCT_OPTIONS: Choice[] = [10, 20, 25, 30, 50, 75].map((n) => ({
  value: String(n),
  label: `${n}%`,
}));

const ADVANCE_OPTIONS: Choice[] = [50, 100, 200, 300, 500, 1000].map((n) => ({
  value: String(n),
  label: rupees(n),
}));

const RESERVATION_OPTIONS: Choice[] = [250, 500, 1000, 2000, 5000].map((n) => ({
  value: String(n),
  label: rupees(n),
}));

/** The GST slabs a shop in India can actually be on. */
const GST_OPTIONS: Choice[] = [0, 5, 12, 18, 28].map((n) => ({ value: String(n), label: `${n}%` }));

const CARRIER_OPTIONS: Choice[] = (Object.keys(CARRIER_LABELS) as CheckoutCarrierId[]).map((id) => ({
  value: id,
  label: CARRIER_LABELS[id],
}));

/** What the customer taps to pay. Never "gateway" — he does not use that word. */
const PAY_BUTTON_WORDS: Record<string, string> = {
  upi: "UPI",
  card: "card",
  wallet: "wallet",
  cod: "cash on delivery",
};

const PAY_BUTTON_OPTIONS: Choice[] = ["upi", "card", "wallet"].map((value) => ({
  value,
  label: PAY_BUTTON_WORDS[value],
}));

const METHOD_SET_OPTIONS: Choice[] = [
  { value: "prepaid", label: "paying online" },
  { value: "cod", label: "cash on delivery" },
  { value: "prepaid,cod", label: "paying online or cash on delivery" },
];

const FIELD_WORDS: Record<string, string> = {
  mobile: "their phone number",
  firstName: "their first name",
  lastName: "their last name",
  address: "their address",
  city: "their city",
  pincode: "their PIN code",
  upi: "their UPI ID",
};

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

/**
 * The three clauses he can change from inside the sentence.
 *
 * They cover what a shop actually sorts orders by: what kind of thing it is,
 * how big it is, and how it is being paid for. Everything else a rule can match
 * on — a PIN code, a city, a range of stock — is typed text, so it is said in
 * the sentence but changed in a box under Details, where a typo cannot be
 * mistaken for a choice.
 */
function isClause(c: CheckoutRuleCondition, field: string, operator: string) {
  return c.field === field && c.operator === operator;
}

export function orderKindClause(rule: Pick<AdminCheckoutRule, "conditions">): string {
  return rule.conditions.find((c) => isClause(c, "fulfillment_type", "equals"))?.value ?? "";
}

export function payWithClause(rule: Pick<AdminCheckoutRule, "conditions">): string {
  return rule.conditions.find((c) => isClause(c, "payment_method", "equals"))?.value ?? "";
}

export function upToAmountClause(rule: Pick<AdminCheckoutRule, "conditions">): string {
  return rule.conditions.find((c) => isClause(c, "subtotal", "less_than_or_equal"))?.value ?? "";
}

/** The six things about an order the checkout can actually look at. */
const KNOWN_CONDITION_FIELDS: CheckoutConditionField[] = [
  "subtotal",
  "pincode",
  "city",
  "payment_method",
  "fulfillment_type",
  "product_category",
];

/**
 * Clauses that can never be true, so the whole rule can never run.
 *
 * A rule waiting on something the shop stopped recording — a field renamed on
 * the server, a condition written by hand through the API — sits in the list
 * showing "On", for ever, doing nothing. That is the exact shape of "I cannot
 * tell what is real", so the screen says it out loud instead of leaving him to
 * find out when a customer is charged the wrong delivery.
 */
export function deadConditions(
  rule: Pick<AdminCheckoutRule, "conditions">,
): CheckoutRuleCondition[] {
  return rule.conditions.filter((condition) => {
    if (KNOWN_CONDITION_FIELDS.includes(condition.field as CheckoutConditionField)) return false;
    // An unknown thing reads as empty. "is X" and "has X in it" can then never
    // be true; "is not X" always is, and "X or less" compares 0, so those two
    // still run and are not called dead.
    return (
      (condition.operator === "equals" || condition.operator === "contains") &&
      condition.value !== ""
    );
  });
}

/** Conditions the sentence says but cannot offer as a list — PIN codes, cities. */
export function typedConditions(
  rule: Pick<AdminCheckoutRule, "conditions">,
): { condition: CheckoutRuleCondition; index: number; label: string }[] {
  return rule.conditions
    .map((condition, index) => ({ condition, index }))
    .filter(
      ({ condition }) =>
        !isClause(condition, "fulfillment_type", "equals") &&
        !isClause(condition, "payment_method", "equals") &&
        !isClause(condition, "subtotal", "less_than_or_equal"),
    )
    .map(({ condition, index }) => ({
      condition,
      index,
      label:
        condition.field === "pincode"
          ? "Which PIN codes"
          : condition.field === "city"
            ? "Which city"
            : condition.field === "product_category"
              ? "Which kind of item"
              : "What to match",
    }));
}

/**
 * Write a clause back, keeping every other clause exactly where it was.
 *
 * An empty answer removes the clause. It must not be saved as a clause with an
 * empty value: that would compare the order against "" and match nothing, so
 * the rule would show as On and never once run.
 */
export function setCheckoutClause(
  conditions: CheckoutRuleCondition[],
  field: string,
  operator: CheckoutRuleCondition["operator"],
  value: string,
): CheckoutRuleCondition[] {
  const index = conditions.findIndex((c) => isClause(c, field, operator));
  if (!value) return conditions.filter((c) => !isClause(c, field, operator));
  const next: CheckoutRuleCondition = { field, operator, value };
  if (index === -1) return [...conditions, next];
  const out = [...conditions];
  out[index] = next;
  return out;
}

function conditionSlots(
  condition: CheckoutRuleCondition,
  handlers?: CheckoutSentenceHandlers,
): SentenceSlot[] {
  if (isClause(condition, "fulfillment_type", "equals")) {
    return [
      { kind: "text", text: "the order is" },
      {
        kind: "choice",
        id: "kind",
        value: condition.value,
        options: withSaved(ORDER_KIND_OPTIONS, condition.value, (v) => v),
        ariaLabel: "What kind of order this is about",
        emptyLabel: "any kind of order",
        onChange: handlers?.onOrderKind,
      },
    ];
  }

  if (isClause(condition, "payment_method", "equals")) {
    return [
      { kind: "text", text: "the customer is paying" },
      {
        kind: "choice",
        id: "payWith",
        value: condition.value,
        options: withSaved(PAY_WITH_OPTIONS, condition.value, (v) => v),
        ariaLabel: "How the customer is paying",
        emptyLabel: "any way",
        onChange: handlers?.onPayWith,
      },
    ];
  }

  if (isClause(condition, "subtotal", "less_than_or_equal")) {
    return [
      { kind: "text", text: "the order is" },
      {
        kind: "choice",
        id: "upTo",
        value: condition.value,
        options: withSaved(AMOUNT_OPTIONS, condition.value, (v) => rupees(Number(v) || 0)),
        ariaLabel: "Up to what amount",
        emptyLabel: "any amount",
        onChange: handlers?.onUpToAmount,
      },
      { kind: "text", text: "or less" },
    ];
  }

  // Typed clauses. Said in full, so a rule someone else set up is readable
  // rather than a count of "2 conditions", but changed under Details.
  const subject =
    condition.field === "pincode"
      ? "the PIN code"
      : condition.field === "city"
        ? "the city"
        : condition.field === "product_category"
          ? "the items are from"
          : condition.field === "subtotal"
            ? "the order"
            : condition.field === "payment_method"
              ? "the way of paying"
              : condition.field === "fulfillment_type"
                ? "the kind of order"
                : // A thing the checkout no longer records. Named, not hidden,
                  // because he has to be able to tell someone what it says.
                  `something called ${condition.field}`;
  const said =
    condition.operator === "contains"
      ? `${subject} has ${condition.value} in it`
      : condition.operator === "not_equals"
        ? `${subject} is not ${condition.value}`
        : condition.operator === "less_than_or_equal"
          ? `${subject} is ${condition.value} or less`
          : `${subject} is ${condition.value}`;
  return [{ kind: "text", text: said }];
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type ActionWords = {
  /** The words before the value. Also the label in the "what to do" list, so
   *  the sentence in the list and the sentence in the editor are one string. */
  before: string;
  /** The words after it, where English needs them ("take 10% off for …"). */
  after?: string;
  options?: Choice[];
  /** The value is prose a customer reads. Never a list; edited under Details. */
  prose?: string;
  /** Not offered when writing a new rule — only read back, so an older rule
   *  or one set up by someone else still reads as a sentence. */
  readOnly?: boolean;
};

export const CHECKOUT_ACTION_WORDS: Record<CheckoutActionType, ActionWords> = {
  set_shipping: { before: "set the delivery charge to", options: DELIVERY_CHARGE_OPTIONS },
  hide_payment_method: {
    before: "do not offer",
    options: [
      { value: "cod", label: "cash on delivery" },
      { value: "prepaid", label: "paying online" },
    ],
  },
  set_cod_max: { before: "stop offering cash on delivery above", options: AMOUNT_OPTIONS },
  set_prepaid_discount_pct: {
    before: "take",
    after: "off for paying online",
    options: DISCOUNT_PCT_OPTIONS,
  },
  set_cod_advance: {
    before: "before accepting cash on delivery, ask for",
    after: "online",
    options: ADVANCE_OPTIONS,
  },
  set_reservation_amount: { before: "to hold a pre-order, ask for", options: RESERVATION_OPTIONS },
  set_deposit_pct: {
    before: "ask for",
    after: "now and the rest later",
    options: DEPOSIT_PCT_OPTIONS,
  },
  set_carrier: { before: "send it by", options: CARRIER_OPTIONS },
  hide_carrier: { before: "do not offer the courier", options: CARRIER_OPTIONS },
  prefer_gateway: { before: "show this first:", options: PAY_BUTTON_OPTIONS },
  hide_gateway: { before: "do not offer payment by", options: PAY_BUTTON_OPTIONS },
  set_tax_rate: { before: "charge", after: "GST", options: GST_OPTIONS },
  set_banner: { before: "show this note at checkout:", prose: "The note the customer reads" },
  block_checkout: {
    before: "do not let the order through, and say:",
    prose: "What the customer is told instead",
  },

  // Read-only. Every one of these is real on the server and is kept exactly as
  // it was saved; none is something this shop owner would set up himself, and
  // three of them (the courier price list, the split, the boxes on the form)
  // are lists rather than one answer, so a dropdown cannot say them honestly.
  allow_payment_methods: { before: "only offer", options: METHOD_SET_OPTIONS, readOnly: true },
  allow_gateways: { before: "only offer payment by", readOnly: true },
  set_rate_table: { before: "offer these couriers:", readOnly: true },
  split_payment: { before: "split the payment:", readOnly: true },
  enable_pay_later: { before: "", readOnly: true },
  exempt_tax: { before: "charge no GST", readOnly: true },
  set_tax_inclusive: { before: "", readOnly: true },
  set_tax_inclusive_message: {
    before: "say this about GST:",
    prose: "What the price line says about GST",
    readOnly: true,
  },
  require_field: { before: "also ask the customer for", readOnly: true },
  hide_field: { before: "do not ask for", readOnly: true },
};

/** The things he can choose to do, in the order a shop cares about them. */
export const OFFERED_ACTIONS: CheckoutActionType[] = [
  "set_shipping",
  "hide_payment_method",
  "set_cod_max",
  "set_prepaid_discount_pct",
  "set_cod_advance",
  "set_reservation_amount",
  "set_deposit_pct",
  "set_carrier",
  "hide_carrier",
  "prefer_gateway",
  "hide_gateway",
  "set_tax_rate",
  "set_banner",
  "block_checkout",
];

export function actionChoices(current: CheckoutActionType): Choice[] {
  const offered = OFFERED_ACTIONS.map((value) => ({
    value,
    label: CHECKOUT_ACTION_WORDS[value].before,
  }));
  if (OFFERED_ACTIONS.includes(current)) return offered;
  // The rule already does this. Dropping it from the list would make the only
  // way to keep the rule "do not touch it", so it is added rather than hidden.
  const words = CHECKOUT_ACTION_WORDS[current];
  return [...offered, { value: current, label: words?.before || current.split("_").join(" ") }];
}

/** Actions whose value is prose a customer reads, so it is typed, not chosen. */
export function proseActions(
  rule: Pick<AdminCheckoutRule, "actions">,
): { action: CheckoutRuleAction; index: number; label: string }[] {
  return rule.actions
    .map((action, index) => ({ action, index, words: CHECKOUT_ACTION_WORDS[action.type] }))
    .filter((entry) => Boolean(entry.words?.prose))
    .map(({ action, index, words }) => ({ action, index, label: words!.prose! }));
}

/** The couriers a price list offers, said as money. */
function rateTableWords(value: string | undefined): string {
  const table = parseRateTable(value);
  if (table.length === 0) return "none";
  return table
    .map((c) => `${c.label} ${c.amount === 0 ? "free" : rupees(c.amount)}`)
    .join(", ");
}

function payButtonWords(value: string | undefined): string {
  const list = parseGatewayList(value);
  if (list.length === 0) return "none";
  return list.map((g) => PAY_BUTTON_WORDS[g] ?? g).join(" or ");
}

function splitWords(value: string | undefined): string {
  const splits = parseSplitPayments(value);
  if (splits.length === 0) return "none";
  return splits.map((s) => s.label).join(", then ");
}

function actionSlots(
  action: CheckoutRuleAction,
  index: number,
  handlers?: CheckoutSentenceHandlers,
): SentenceSlot[] {
  const words = CHECKOUT_ACTION_WORDS[action.type];
  if (!words) {
    // Something the server grew that this screen has not learned to say. Shown
    // as-is rather than swallowed, because a rule he cannot read is still a
    // rule that is charging his customers.
    return [{ kind: "text", text: `${action.type.split("_").join(" ")} ${action.value ?? ""}`.trim() }];
  }

  const slots: SentenceSlot[] = [];
  const editable = Boolean(handlers?.onActionType) && !words.readOnly;

  if (editable) {
    slots.push({
      kind: "choice",
      id: `action-${index}-type`,
      value: action.type,
      options: actionChoices(action.type),
      ariaLabel: "What this rule does",
      emptyLabel: "choose what it does",
      onChange: (value) => handlers?.onActionType?.(index, value),
    });
  } else if (words.before) {
    slots.push({ kind: "text", text: words.before });
  }

  // The value.
  if (words.prose) {
    const value = (action.value ?? "").trim();
    slots.push({
      kind: "choice",
      id: `action-${index}-prose`,
      value,
      // Kept as its own single option so the words show in the sentence when
      // they are there, and the amber "still to write" shows when they are not.
      options: value ? [{ value, label: `“${value}”` }] : [],
      ariaLabel: words.prose,
      emptyLabel: "not written yet",
    });
  } else if (words.options) {
    slots.push({
      kind: "choice",
      id: `action-${index}-value`,
      value: valueForChoice(action),
      options: withSaved(words.options, valueForChoice(action), (v) => savedLabel(action.type, v)),
      ariaLabel: words.before,
      emptyLabel: "still to choose",
      onChange:
        editable && handlers?.onActionValue
          ? (value) => handlers.onActionValue?.(index, value)
          : undefined,
    });
  } else {
    const spoken =
      action.type === "allow_gateways"
        ? payButtonWords(action.value)
        : action.type === "set_rate_table"
          ? rateTableWords(action.value)
          : action.type === "split_payment"
            ? splitWords(action.value)
            : action.type === "require_field" || action.type === "hide_field"
              ? FIELD_WORDS[action.value ?? ""] ?? action.value ?? ""
              : action.type === "enable_pay_later"
                ? action.value === "false"
                  ? "do not allow paying in parts"
                  : "allow paying part now and the rest later"
                : action.type === "set_tax_inclusive"
                  ? action.value === "false"
                    ? "add GST on top of the shown price"
                    : "treat the shown price as already including GST"
                  : action.value ?? "";
    if (spoken) slots.push({ kind: "text", text: spoken });
  }

  // "before accepting cash on delivery, ask for ₹100 online, at any order value"
  if (action.type === "set_cod_advance" && String(action.value ?? "").trim().endsWith("!")) {
    slots.push({ kind: "text", text: "online, at any order value" });
  } else if (words.after) {
    slots.push({ kind: "text", text: words.after });
  }

  // A courier carries its own charge: "send it by Delhivery Standard for ₹79".
  if (action.type === "set_carrier") {
    const amount = String(Number(action.value?.split(":")[1]) || 0);
    slots.push({ kind: "text", text: "for" });
    slots.push({
      kind: "choice",
      id: `action-${index}-carrier-charge`,
      value: amount === "0" ? "free" : `flat:${amount}`,
      options: withSaved(DELIVERY_CHARGE_OPTIONS, amount === "0" ? "free" : `flat:${amount}`, (v) =>
        savedLabel("set_shipping", v),
      ),
      ariaLabel: "What that courier costs the customer",
      emptyLabel: "free",
      onChange:
        editable && handlers?.onCarrierCharge
          ? (value) => handlers.onCarrierCharge?.(index, value)
          : undefined,
    });
  }

  return slots;
}

/**
 * Put a chosen value back into an action without losing the part the dropdown
 * does not own.
 *
 * Two of these carry more than one fact in one string: an advance can end in
 * "!" (meaning it also lifts the cash-on-delivery ceiling) and can carry the
 * label the customer reads, and a courier carries its own charge. Overwriting
 * the whole value on every change would quietly switch the ceiling back on and
 * reset the charge to nothing — a rule he did not change, changing.
 */
export function writeActionValue(action: CheckoutRuleAction, next: string): CheckoutRuleAction {
  const old = String(action.value ?? "");

  if (action.type === "set_cod_advance") {
    const unlocks = (old.split(":")[0] ?? "").trim().endsWith("!") ? "!" : "";
    const label = old.includes(":") ? `:${old.split(":").slice(1).join(":")}` : "";
    return { ...action, value: `${next}${unlocks}${label}` };
  }

  if (action.type === "set_carrier") {
    const amount = Number(old.split(":")[1]) || 0;
    return { ...action, value: `${next}:${amount}` };
  }

  return { ...action, value: next };
}

/** The delivery charge that travels with a chosen courier. */
export function writeCarrierCharge(
  action: CheckoutRuleAction,
  charge: string,
): CheckoutRuleAction {
  const carrier = String(action.value ?? "").split(":")[0] || "bluedart";
  const amount = charge === "free" ? 0 : Number(charge.replace(/^flat:/, "")) || 0;
  return { ...action, value: `${carrier}:${amount}` };
}

/** The part of an action's value that the dropdown owns. */
function valueForChoice(action: CheckoutRuleAction): string {
  const raw = String(action.value ?? "").trim();
  // The "!" that lifts the cash-on-delivery ceiling is a separate fact about
  // the rule, not part of the amount, and is put back on save.
  if (action.type === "set_cod_advance") return raw.replace(/!$/, "").split(":")[0] ?? "";
  if (action.type === "set_carrier") return raw.split(":")[0] ?? "";
  return raw;
}

// ---------------------------------------------------------------------------
// The sentence
// ---------------------------------------------------------------------------

export type CheckoutSentenceHandlers = {
  onOrderKind?: (value: string) => void;
  onPayWith?: (value: string) => void;
  onUpToAmount?: (value: string) => void;
  onActionType?: (index: number, value: string) => void;
  onActionValue?: (index: number, value: string) => void;
  onCarrierCharge?: (index: number, value: string) => void;
};

/**
 * The rule as one sentence.
 *
 * Pass handlers and every choice inside it becomes a dropdown sitting in the
 * line of text; pass none and the same words come back in bold. The two are the
 * same string, which is what lets the list be read instead of opened.
 */
export function buildCheckoutSentence(
  rule: Pick<AdminCheckoutRule, "conditions" | "actions">,
  handlers?: CheckoutSentenceHandlers,
): SentenceSlot[] {
  const slots: SentenceSlot[] = [];

  if (rule.conditions.length === 0) {
    slots.push({ kind: "text", text: "On every order" });
  } else {
    slots.push({ kind: "text", text: "When" });
    rule.conditions.forEach((condition, index) => {
      if (index > 0) slots.push({ kind: "text", text: "and" });
      slots.push(...conditionSlots(condition, handlers));
    });
  }

  slots.push({ kind: "text", text: "—" });

  if (rule.actions.length === 0) {
    slots.push({ kind: "text", text: "nothing happens" });
    return slots;
  }

  rule.actions.forEach((action, index) => {
    if (index > 0) slots.push({ kind: "text", text: "and" });
    slots.push(...actionSlots(action, index, handlers));
  });

  return slots;
}

/**
 * The sentence as one string, and the rule's saved name.
 *
 * The old builder refused to save without a name, so the list filled with
 * "Enforce COD maximum" over a line reading "Always · COD max". Naming a rule
 * after what it says means the server's own list of rules reads as English too,
 * and nothing can go stale against the rule it names.
 */
export function checkoutSentenceText(
  rule: Pick<AdminCheckoutRule, "conditions" | "actions">,
): string {
  // A note he wrote may already end in a full stop, and "…save at checkout.”."
  // is the sort of small wrongness that makes a screen feel machine-made.
  return sentenceToText(buildCheckoutSentence(rule)).replace(/([.!?]”)\.$/, "$1");
}

// ---------------------------------------------------------------------------
// What it does to a real order
// ---------------------------------------------------------------------------

/**
 * The order the screen tries every rule against.
 *
 * A rule that says "set the delivery charge to ₹79" is still not an answer to
 * "what does this cost my customer". So the screen keeps one order on it —
 * an amount, a kind of thing, a way of paying, a PIN code — and every rule says
 * what it does to THAT order in rupees, or says plainly that it does nothing to
 * it. The numbers are worked out the same way the server works out a real
 * order, so they are arithmetic on an order he chose, not an invented figure.
 */
export type ExampleOrder = {
  subtotal: number;
  kind: NonNullable<CheckoutContext["fulfillmentType"]>;
  payWith: CheckoutPaymentMethod;
  pincode: string;
};

export const EXAMPLE_ORDER_AMOUNTS = [999, 1999, 2999, 4999, 9999, 14999, 24999];

export const DEFAULT_EXAMPLE_ORDER: ExampleOrder = {
  subtotal: 2999,
  kind: "physical",
  payWith: "prepaid",
  pincode: "560001",
};

export function exampleContext(order: ExampleOrder): CheckoutContext {
  return {
    subtotal: order.subtotal,
    pincode: order.pincode || undefined,
    paymentMethod: order.payWith,
    fulfillmentType: order.kind,
    // Fixed, so two rules compared side by side are compared on one shopper and
    // a split test does not make the same rule look different each render.
    sessionKey: "what-this-does",
  };
}

export type OrderMoney = {
  discount: number;
  shipping: number;
  gst: number;
  total: number;
  /** Paid online now, when the rules ask for only part up front. */
  dueNow: number | null;
};

/**
 * The money on one order under one policy.
 *
 * Deliberately the same order of operations as `OrderService::price` on the
 * server — discount, then delivery, then GST out of or on top of the total —
 * because a number in the admin that is worked out differently from the number
 * on the invoice is worse than no number at all.
 */
export function orderMoney(policy: CheckoutPolicy, order: ExampleOrder): OrderMoney {
  const payingOnline = order.payWith === "prepaid";
  const discount =
    payingOnline && policy.prepaidDiscountPct > 0
      ? Math.floor((order.subtotal * policy.prepaidDiscountPct) / 100)
      : 0;
  const shipping = policy.shippingAmount;
  const gross = Math.max(0, order.subtotal - discount + shipping);
  const rate = policy.taxRatePct;

  let gst = 0;
  let total = gross;
  if (!policy.taxExempt && rate > 0) {
    if (policy.taxInclusive) {
      total = gross;
      gst = total - Math.round(gross / (1 + rate / 100));
    } else {
      gst = Math.round((gross * rate) / 100);
      total = gross + gst;
    }
  }

  let dueNow: number | null = null;
  if (order.kind === "preorder" && policy.reservationAmount > 0) {
    dueNow = Math.min(policy.reservationAmount, total);
  } else if (order.payWith === "cod" && policy.codAdvance > 0) {
    dueNow = Math.min(policy.codAdvance, total);
  } else if (policy.depositPct !== null) {
    dueNow = Math.floor((total * policy.depositPct) / 100);
  }

  return { discount, shipping, gst, total, dueNow };
}

/** Does this rule apply to that order? */
export function ruleMatchesOrder(rule: AdminCheckoutRule, ctx: CheckoutContext): boolean {
  return ruleConditionsMatch(rule, ctx);
}

/** The first thing about the order that keeps this rule out of it. */
export function firstUnmetClause(rule: AdminCheckoutRule, ctx: CheckoutContext): string {
  const failing = rule.conditions.find((c) => !conditionMatches(c, ctx));
  if (!failing) return "";
  // The same words the sentence uses, so "only when …" and the rule itself are
  // plainly the same statement. The full stop belongs to the caller's line.
  return sentenceToText(conditionSlots(failing)).replace(/\.$/, "");
}

export type RuleEffect = {
  applies: boolean;
  /** When it does not: the words that say why, in his terms. */
  whyNot: string;
  /** What changes on this order, most expensive first. */
  changes: string[];
  totalBefore: number;
  totalAfter: number;
  /** A rule in a split test reaches only a share of customers. */
  splitTest: boolean;
};

/**
 * What this one rule does to that one order.
 *
 * Worked out by pricing the order with every OTHER switched-on rule, then again
 * with this one added — so what it reports is this rule's own contribution, in
 * the company of the rules that really run beside it. A rule that another rule
 * overrules therefore reports honestly that it changes nothing, which is the
 * question the old screen could not answer at all.
 */
export function describeRuleEffect(
  settings: AdminSettings,
  allRules: AdminCheckoutRule[],
  rule: AdminCheckoutRule,
  order: ExampleOrder,
): RuleEffect {
  const ctx = exampleContext(order);
  const others = allRules.filter((r) => r.id !== rule.id && r.enabled);
  const before = resolveCheckoutPolicy(settings, others, ctx);
  const after = resolveCheckoutPolicy(settings, [...others, { ...rule, enabled: true }], ctx);
  const moneyBefore = orderMoney(before, order);
  const moneyAfter = orderMoney(after, order);

  const applies = ruleMatchesOrder(rule, ctx);
  const changes: string[] = [];

  if (after.blocked && !before.blocked) {
    changes.push(
      `The customer cannot place this order. They see: “${after.blockMessage ?? "Checkout is unavailable for this cart."}”`,
    );
  }

  if (moneyAfter.shipping !== moneyBefore.shipping) {
    changes.push(
      `Delivery ${money(moneyAfter.shipping)} instead of ${money(moneyBefore.shipping)}.`,
    );
  }

  if (moneyAfter.discount !== moneyBefore.discount) {
    changes.push(
      moneyAfter.discount > 0
        ? `Paying online takes off ${rupees(moneyAfter.discount)}${
            moneyBefore.discount > 0 ? ` instead of ${rupees(moneyBefore.discount)}` : ""
          }. A coupon code does not add to this — the customer gets whichever is bigger.`
        : `No money comes off for paying online any more.`,
    );
  }

  const codBefore = before.methods.includes("cod");
  const codAfter = after.methods.includes("cod");
  if (codBefore !== codAfter) {
    changes.push(
      codAfter
        ? "Cash on delivery is offered on this order."
        : "Cash on delivery is not offered on this order — the customer has to pay online.",
    );
  } else if (after.codMax !== before.codMax) {
    changes.push(
      `Cash on delivery stops above ${rupees(after.codMax)} — this order is under that, so nothing changes here yet.`,
    );
  }

  if (moneyAfter.gst !== moneyBefore.gst) {
    changes.push(`GST ${rupees(moneyAfter.gst)} instead of ${rupees(moneyBefore.gst)}.`);
  }

  if (moneyAfter.dueNow !== moneyBefore.dueNow) {
    changes.push(
      moneyAfter.dueNow === null
        ? "The whole amount is due at once."
        : `${rupees(moneyAfter.dueNow)} now, ${rupees(
            Math.max(0, moneyAfter.total - moneyAfter.dueNow),
          )} later.`,
    );
  }

  if (after.banner && after.banner !== before.banner) {
    changes.push(`The customer sees a note: “${after.banner}”`);
  }
  if (after.taxInclusiveMessage && after.taxInclusiveMessage !== before.taxInclusiveMessage) {
    changes.push(`Under the price it says: “${after.taxInclusiveMessage}”`);
  }

  const gone = before.gateways.filter((g) => !after.gateways.includes(g));
  const added = after.gateways.filter((g) => !before.gateways.includes(g));
  if (gone.length > 0) {
    changes.push(`No longer pays by ${gone.map((g) => PAY_BUTTON_WORDS[g] ?? g).join(" or ")}.`);
  }
  if (added.length > 0) {
    changes.push(`Can also pay by ${added.map((g) => PAY_BUTTON_WORDS[g] ?? g).join(" or ")}.`);
  }
  if (after.preferredGateway !== before.preferredGateway && after.preferredGateway) {
    changes.push(`${PAY_BUTTON_WORDS[after.preferredGateway]} is shown first.`);
  }

  const carriersBefore = before.carriers.map((c) => c.id).join(",");
  const carriersAfter = after.carriers.map((c) => c.id).join(",");
  if (carriersBefore !== carriersAfter) {
    changes.push(
      after.carriers.length === 0
        ? "No courier is offered."
        : `Couriers offered: ${after.carriers
            .map((c) => `${c.label} ${c.amount === 0 ? "free" : rupees(c.amount)}`)
            .join(", ")}.`,
    );
  }

  const askedNow = after.requiredFields.filter((f) => !before.requiredFields.includes(f));
  const notAsked = after.hiddenFields.filter((f) => !before.hiddenFields.includes(f));
  if (askedNow.length > 0) {
    changes.push(`Also asks for ${askedNow.map((f) => FIELD_WORDS[f] ?? f).join(" and ")}.`);
  }
  if (notAsked.length > 0) {
    changes.push(`Stops asking for ${notAsked.map((f) => FIELD_WORDS[f] ?? f).join(" and ")}.`);
  }

  return {
    applies,
    whyNot: applies ? "" : firstUnmetClause(rule, ctx),
    changes,
    totalBefore: moneyBefore.total,
    totalAfter: moneyAfter.total,
    splitTest: Boolean(rule.experimentId),
  };
}

/** ₹0 delivery is "free" to a shopkeeper, not "₹0". */
function money(amount: number): string {
  return amount === 0 ? "free" : rupees(amount);
}

// ---------------------------------------------------------------------------
// The rules most shops want, whether or not they have them
// ---------------------------------------------------------------------------

/**
 * These replace a separate "Templates" screen.
 *
 * That screen was ten cards of one-line descriptions behind its own route, and
 * three separate controls on the rules page led to it. Picking a card opened
 * the same four-step form, so a "template" saved nobody any thinking — and four
 * of the ten were not rules a shop would want at all ("Force FREE shipping
 * label for matching carts", over a condition matching every order under
 * ₹999,999; "Require UPI on prepaid (demo field)").
 *
 * Once a rule reads as a sentence, a starting point is just a sentence he has
 * not turned on yet. So they sit at the bottom of the one list, in grey, each
 * with the reason it is worth having — the same shape the automatic messages
 * screen already uses.
 */
export type CommonCheckoutRule = {
  id: string;
  conditions: CheckoutRuleCondition[];
  actions: CheckoutRuleAction[];
  /** One line under the grey sentence: what it saves him. */
  why: string;
};

export const COMMON_CHECKOUT_RULES: CommonCheckoutRule[] = [
  {
    id: "common-no-cod-digital",
    conditions: [{ field: "fulfillment_type", operator: "equals", value: "digital" }],
    actions: [{ type: "hide_payment_method", value: "cod" }],
    why: "There is no doorstep to collect cash at — the code has already gone out.",
  },
  {
    id: "common-cod-ceiling",
    conditions: [],
    actions: [{ type: "set_cod_max", value: "10000" }],
    why: "Caps what leaves the shop before anybody has paid you.",
  },
  {
    id: "common-small-order-delivery",
    conditions: [{ field: "subtotal", operator: "less_than_or_equal", value: "1999" }],
    actions: [{ type: "set_shipping", value: "flat:79" }],
    why: "Small orders stop costing you the courier, and bigger ones stay free.",
  },
  {
    id: "common-preorder-hold",
    conditions: [{ field: "fulfillment_type", operator: "equals", value: "preorder" }],
    actions: [{ type: "set_reservation_amount", value: "500" }],
    why: "A pre-order somebody has paid something towards is one that gets collected.",
  },
];

/**
 * Is he already doing this?
 *
 * Matched on what the rule does and what it looks at, never on its wording, so
 * a rule he wrote himself is not offered back to him as a suggestion.
 */
export function alreadyHasRule(
  common: CommonCheckoutRule,
  rules: Pick<AdminCheckoutRule, "conditions" | "actions">[],
): boolean {
  const wantedActions = common.actions.map((a) => a.type).sort().join(",");
  const wantedFields = common.conditions.map((c) => c.field).sort().join(",");
  return rules.some(
    (rule) =>
      rule.actions.map((a) => a.type).sort().join(",") === wantedActions &&
      rule.conditions.map((c) => c.field).sort().join(",") === wantedFields,
  );
}

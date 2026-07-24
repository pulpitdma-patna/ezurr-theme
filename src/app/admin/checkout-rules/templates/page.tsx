"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CheckoutRuleBuilder } from "@/components/admin/CheckoutRuleBuilder";
import { useAutoBanner } from "@/hooks/useAutoBanner";
import { upsertCheckoutRule } from "@/lib/adminStore";
import { api, isApiEnabled } from "@/lib/apiClient";
import type { AdminCheckoutRule, CheckoutActionType } from "@/lib/checkoutRules";
import type { AutomationCondition } from "@/data/admin";

type Template = {
  id: string;
  name: string;
  description: string;
  conditions: AutomationCondition[];
  actions: { type: CheckoutActionType; value?: string }[];
  priority: number;
};

const templates: Template[] = [
  {
    id: "tpl-cod-cap",
    name: "COD under ₹10,000",
    description: "Set COD maximum so large carts fall back to prepaid.",
    priority: 10,
    conditions: [],
    actions: [{ type: "set_cod_max", value: "10000" }],
  },
  {
    id: "tpl-no-cod-digital",
    name: "Prepaid-only digital",
    description: "Hide COD when fulfillment is digital.",
    priority: 20,
    conditions: [
      { field: "fulfillment_type", operator: "equals", value: "digital" },
    ],
    actions: [{ type: "hide_payment_method", value: "cod" }],
  },
  {
    id: "tpl-prepaid-boost",
    name: "Preorder prepaid boost",
    description: "Offer 15% prepaid discount on pre-order carts.",
    priority: 40,
    conditions: [
      { field: "fulfillment_type", operator: "equals", value: "preorder" },
    ],
    actions: [{ type: "set_prepaid_discount_pct", value: "15" }],
  },
  {
    id: "tpl-free-ship",
    name: "Free shipping message",
    description: "Force FREE shipping label for matching carts.",
    priority: 30,
    conditions: [
      { field: "subtotal", operator: "less_than_or_equal", value: "999999" },
    ],
    actions: [{ type: "set_shipping", value: "free" }],
  },
  {
    id: "tpl-pin-block",
    name: "Block PIN prefix",
    description: "Block checkout when PIN contains a restricted prefix.",
    priority: 5,
    conditions: [{ field: "pincode", operator: "contains", value: "000" }],
    actions: [
      {
        type: "block_checkout",
        value: "We cannot ship to this PIN yet.",
      },
    ],
  },
  {
    id: "tpl-require-upi",
    name: "Require UPI on prepaid",
    description: "Ask for UPI when prepaid is selected (demo field).",
    priority: 60,
    conditions: [
      { field: "payment_method", operator: "equals", value: "prepaid" },
    ],
    actions: [{ type: "require_field", value: "upi" }],
  },
  {
    id: "tpl-upi-gateway",
    name: "UPI-only gateways",
    description: "Limit prepaid checkout to UPI and card — hide wallet.",
    priority: 55,
    conditions: [],
    actions: [
      { type: "allow_gateways", value: "upi,card" },
      { type: "prefer_gateway", value: "upi" },
    ],
  },
  {
    id: "tpl-gst",
    name: "GST inclusive messaging",
    description: "Set 18% tax rate with inclusive billing copy.",
    priority: 60,
    conditions: [],
    actions: [
      { type: "set_tax_rate", value: "18" },
      { type: "set_tax_inclusive_message", value: "Prices include 18% GST." },
    ],
  },
  {
    id: "tpl-carriers",
    name: "Carrier rate table",
    description: "Blue Dart free + Delhivery ₹79 for metro PINs.",
    priority: 65,
    conditions: [{ field: "pincode", operator: "contains", value: "560" }],
    actions: [{ type: "set_rate_table", value: "bluedart:0,delhivery:79" }],
  },
  {
    id: "tpl-deposit",
    name: "25% deposit split",
    description: "Pay-later with 25% due today on pre-orders.",
    priority: 70,
    conditions: [],
    actions: [
      { type: "enable_pay_later", value: "true" },
      { type: "set_deposit_pct", value: "25" },
      { type: "split_payment", value: "25:Pay 25% today|75:Balance on release" },
    ],
  },
];

function ruleFromTemplate(template: Template): AdminCheckoutRule {
  const now = new Date().toISOString();
  return {
    id: "",
    name: template.name,
    description: template.description,
    enabled: true,
    priority: template.priority,
    conditions: structuredClone(template.conditions),
    actions: structuredClone(template.actions),
    createdAt: now,
    updatedAt: now,
  };
}

export default function CheckoutRuleTemplatesPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<AdminCheckoutRule | null>(null);
  const [toast, setToast] = useAutoBanner(2200);

  return (
    <div>
      <AdminPageHeader
        title="Checkout rule templates"
        description="Starter recipes for payment, shipping, and checkout messaging."
        actions={
          <Link
            href="/admin/checkout-rules"
            className="inline-flex h-9 items-center rounded-lg border border-black/[0.1] bg-white px-3 text-xs font-semibold"
          >
            ← All rules
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <article
            key={template.id}
            className="flex flex-col rounded-2xl border border-black/[0.07] bg-white p-5"
          >
            <h3 className="text-sm font-semibold text-[#1D1D1F]">{template.name}</h3>
            <p className="mt-2 flex-1 text-xs leading-relaxed text-[#6E6E73]">
              {template.description}
            </p>
            <button
              type="button"
              onClick={() => setDraft(ruleFromTemplate(template))}
              className="mt-4 h-9 rounded-lg bg-[#1D1D1F] px-3 text-xs font-semibold text-white"
            >
              Use template
            </button>
          </article>
        ))}
      </div>

      {draft ? (
        <CheckoutRuleBuilder
          rule={draft}
          onClose={() => setDraft(null)}
          onSave={async (rule) => {
            if (isApiEnabled()) {
              try {
                // New rule from a template carries no id, so this POSTs to the
                // server; mirror it into the local store for instant display.
                const saved = await api.upsertCheckoutRule(rule);
                upsertCheckoutRule(saved as AdminCheckoutRule);
                setDraft(null);
                setToast("Rule saved from template");
                router.push("/admin/checkout-rules");
              } catch {
                setToast("Could not save rule to the server");
              }
              return;
            }
            upsertCheckoutRule({ ...rule, id: rule.id || `cr-${Date.now()}` });
            setDraft(null);
            setToast("Rule saved from template");
            router.push("/admin/checkout-rules");
          }}
        />
      ) : null}
    </div>
  );
}

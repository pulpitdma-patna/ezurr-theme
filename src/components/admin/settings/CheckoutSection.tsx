"use client";

import Link from "next/link";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { SettingsToggle } from "@/components/admin/settings/SettingsToggle";
import {
  Cluster,
  Field,
  RupeeInput,
  calloutClass,
  fieldClass,
  type SettingsPanelProps,
} from "@/components/admin/settings/SettingsShared";
import { clampMoney, clampPercent } from "@/components/admin/settings/settingsValues";
import { formatInr } from "@/data/admin";

/**
 * What a customer is allowed to do at checkout, and what it costs them.
 *
 * The old order was: discount, order-number prefix, three switches, then three
 * money boxes — so the switch "An advance lifts the cash-on-delivery limit" sat
 * two controls above the advance it depends on, and told the owner to "set an
 * advance below". Cash on delivery is one decision with four parts and is now
 * one group, in the order the decision is actually made.
 *
 * Two pieces of copy here were wrong rather than merely dense, and both were
 * checked against what the server does:
 *
 *  - "Free delivery above ₹X" reads as a delivery charge below ₹X. There isn't
 *    one. The checkout policy starts every cart at FREE / ₹0 and this setting
 *    only changes the WORDS on carts under the amount, to "Calculated at
 *    dispatch" — still charging nothing. A real delivery charge can only come
 *    from a checkout exception. An owner who believed the old label was
 *    under-collecting on every small order and had no way to see it.
 *  - "Order numbers start with" is gone. Orders are numbered EZ-XXXXXXXX by the
 *    server, which never reads this setting, so the box changed nothing and its
 *    own preview ("EZX24081203") showed a number this shop has never issued —
 *    while the bill preview two tabs away correctly showed INV-EZ-A1B2C3D4.
 */
export function CheckoutSection({ settings, patch, active, status, disabled }: SettingsPanelProps) {
  const advanceLiftsCap = settings.codAdvanceUnlocksCap && settings.codAdvance > 0;

  return (
    <SettingsSection
      id="checkout"
      active={active}
      title="Checkout"
      description="How customers pay you, and what checkout tells them about delivery."
      status={status}
      disabled={disabled}
    >
      <Cluster
        title="GST"
        lead="What tax you charge, and whether it is already inside the prices on your products."
      >
        <SettingsToggle
          label="My prices already include GST"
          description={
            settings.taxInclusive
              ? "A customer pays exactly the price shown on the product."
              : "GST is added on top at checkout, so the customer pays more than the price shown."
          }
          checked={settings.taxInclusive}
          onChange={(checked) => patch({ taxInclusive: checked })}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="GST rate"
            hint={
              settings.taxExempt
                ? "Not used at the moment — you have said this shop charges no GST."
                : "The rate for most of what you sell. A checkout rule can charge a different rate on particular orders."
            }
          >
            <span className="flex items-center gap-2">
              <select
                value={String(settings.taxRatePct)}
                disabled={settings.taxExempt}
                onChange={(e) => patch({ taxRatePct: Number(e.target.value) })}
                className={fieldClass}
              >
                {/* The real slabs, not a free number. A shop that types 1.8 or
                    180 into a box here misprices every product it sells, and
                    nothing downstream would question it. */}
                {[0, 5, 12, 18, 28].map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}%
                  </option>
                ))}
              </select>
            </span>
          </Field>
        </div>

        <SettingsToggle
          label="This shop charges no GST"
          description={
            settings.taxExempt
              ? "No GST on any order, and your bills will say so."
              : "Turn this on only if you are below the GST registration limit."
          }
          checked={settings.taxExempt}
          onChange={(checked) => patch({ taxExempt: checked })}
        />
      </Cluster>

      <Cluster
        title="Paying online"
        lead="What a customer saves by paying before the parcel goes out."
      >
        <Field
          label="Discount for paying online"
          hint="Taken off the goods total when they pay online. Cash orders do not get it."
        >
          <span className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={50}
              inputMode="numeric"
              value={settings.prepaidDiscount}
              onChange={(e) => patch({ prepaidDiscount: clampPercent(e.target.value) })}
              className={fieldClass}
            />
            <span className="shrink-0 text-sm font-semibold text-[#6E6E73]">%</span>
          </span>
        </Field>
      </Cluster>

      <Cluster
        title="Cash on delivery"
        lead="Whether you will send a parcel out and take the money at the door."
      >
        <SettingsToggle
          label="Take cash on delivery"
          description={
            settings.codEnabled
              ? `Offered up to ${formatInr(settings.codLimit)}`
              : "Every order must be paid online"
          }
          checked={settings.codEnabled}
          onChange={(checked) => patch({ codEnabled: checked })}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Biggest order you will send on cash"
            hint={
              advanceLiftsCap
                ? "Not used at the moment — the advance below lifts this limit."
                : `Past ${formatInr(settings.codLimit)}, checkout says cash on delivery is not available and asks the customer to pay online.`
            }
          >
            <RupeeInput
              value={settings.codLimit}
              disabled={!settings.codEnabled}
              onChange={(value) => patch({ codLimit: clampMoney(value) })}
            />
          </Field>
          <Field
            label="Advance to confirm a cash order"
            hint="Paid online to hold the order, then taken off what you collect at the door. 0 means nothing up front."
          >
            <RupeeInput
              value={settings.codAdvance}
              disabled={!settings.codEnabled}
              onChange={(value) => patch({ codAdvance: clampMoney(value) })}
            />
          </Field>
        </div>

        <SettingsToggle
          label="An advance lifts the limit above"
          description={
            settings.codAdvance > 0
              ? `Once ${formatInr(settings.codAdvance)} is paid, an order of any size can be cash on delivery`
              : "Set an advance first — on its own this changes nothing"
          }
          checked={settings.codAdvanceUnlocksCap}
          onChange={(checked) => patch({ codAdvanceUnlocksCap: checked })}
        />
      </Cluster>

      <Cluster title="Delivery" lead="What checkout tells a customer about the cost of delivery.">
        <Field
          label="Say delivery is free above"
          hint={
            <>
              Above this, checkout says delivery is FREE. Below it, checkout says
              &ldquo;Calculated at dispatch&rdquo; — and either way{" "}
              <strong className="font-semibold text-[#6E6E73]">
                nothing is added to the bill
              </strong>
              . To actually charge for delivery, add an exception below.
            </>
          }
        >
          <RupeeInput
            value={settings.freeShippingMin}
            onChange={(value) => patch({ freeShippingMin: clampMoney(value) })}
          />
        </Field>
      </Cluster>

      <div className={calloutClass}>
        <p>
          One-off exceptions — a delivery charge for far-off pincodes, cash turned off in one city,
          an extra field asked for on some orders — live on their own screen.
        </p>
        <Link
          href="/admin/checkout-rules"
          className="mt-1.5 inline-flex text-[11px] font-semibold text-[#1D1D1F] underline-offset-2 hover:underline"
        >
          Add an exception →
        </Link>
      </div>
    </SettingsSection>
  );
}

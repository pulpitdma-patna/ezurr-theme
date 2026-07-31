"use client";

import Link from "next/link";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { SettingsToggle } from "@/components/admin/settings/SettingsToggle";
import {
  Cluster,
  Field,
  calloutClass,
  fieldClass,
  linkClass,
  type SettingsPanelProps,
} from "@/components/admin/settings/SettingsShared";
import { clampMoney } from "@/components/admin/settings/settingsValues";

/**
 * When to be warned that something is running out, and what a sold-out product
 * does on the website.
 *
 * This tab was called "Stock & region" and held a Time zone list and a Currency
 * list beside the stock warning. Both are gone, and neither is a trim for
 * tidiness — they were controls that changed nothing:
 *
 *  - Currency offered "US dollars" and "Dirhams". Nothing anywhere reads the
 *    stored value: every amount in this admin goes through formatInr and every
 *    amount on the server through Money::inr, both of which write ₹ and Indian
 *    digit grouping unconditionally. Choosing dollars changed one string in a
 *    settings row and not one price on the shop.
 *  - Time zone offered Dubai and UTC. Every time this admin prints is formatted
 *    with an explicit Asia/Kolkata, deliberately, so that two people looking at
 *    the same order see the same hour. The list could not move a single clock.
 *
 * A control that does nothing is worse than a missing one: he would have set the
 * currency to dollars, believed his shop had changed, and priced accordingly.
 */
export function StockSection({ settings, patch, active, status, disabled }: SettingsPanelProps) {
  return (
    <SettingsSection
      id="operations"
      active={active}
      title="Stock"
      description="When to warn you that something is running out."
      status={status}
      disabled={disabled}
    >
      <Cluster
        title="Running low"
        lead="The count at which a product starts asking to be re-ordered."
      >
        <Field
          label="Warn me when stock drops to"
          hint={`Today's screen and your products list flag anything at ${settings.lowStockThreshold} or fewer left.`}
        >
          <input
            type="number"
            min={0}
            max={100}
            inputMode="numeric"
            value={settings.lowStockThreshold}
            onChange={(e) => patch({ lowStockThreshold: clampMoney(e.target.value) })}
            className={`${fieldClass} max-w-[10rem]`}
          />
        </Field>
      </Cluster>

      <Cluster
        title="When something is sold out"
        lead="What a customer finds on your website once the last one goes."
      >
        <SettingsToggle
          label="Hide products that are out of stock"
          description={
            settings.hideOutOfStock
              ? "They come off your website completely until you add stock"
              : "They stay on your website, marked sold out"
          }
          checked={settings.hideOutOfStock}
          onChange={(checked) => patch({ hideOutOfStock: checked })}
        />
      </Cluster>

      {/*
        The two analytics IDs used to be typed on this tab and shown greyed-out
        on the Integrations card — two boxes for one value, one screen apart.
        They are another company's account numbers, so they are edited on that
        company's card now, and this line is here for the owner who remembers
        them being here.
      */}
      <div className={calloutClass}>
        Google Analytics and the Facebook Pixel are set up on their own cards under{" "}
        <Link href="/admin/integrations" className={linkClass}>
          Integrations
        </Link>
        .
      </div>
    </SettingsSection>
  );
}

"use client";

import Link from "next/link";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { SettingsToggle } from "@/components/admin/settings/SettingsToggle";
import {
  Cluster,
  calloutClass,
  linkClass,
  type SettingsPanelProps,
} from "@/components/admin/settings/SettingsShared";

/**
 * Which notes the shop is allowed to leave for its owner.
 *
 * The three switches were labelled "Tell me about new orders", "Tell me when
 * something is running low", "Tell me when a pre-order is due out" — which reads
 * as a promise that the shop will reach him. It will not: these flags are read
 * in exactly one place, the step an automatic rule calls "tell me in the shop",
 * and all they can do is stop that note being raised. No message is sent to his
 * phone by any of them, and no message to a CUSTOMER is affected — those are
 * separate steps in the same rules and these switches never touch them.
 *
 * The first one is also broader than its old name: it covers a payment landing
 * and a payment failing as well as an order arriving or moving on. An owner who
 * turned off "new orders" to stop the noise was also turning off "a payment just
 * failed", which is the one he most needs.
 */
export function AlertsSection({ settings, patch, active, status, disabled }: SettingsPanelProps) {
  return (
    <SettingsSection
      id="notifications"
      active={active}
      title="Alerts"
      description="Which notes your shop leaves for you as you work."
      status={status}
      disabled={disabled}
    >
      <Cluster
        title="Notes in the shop"
        lead="Your automatic rules can be set to leave you a note. These decide whether they may."
      >
        <SettingsToggle
          label="Orders and payments"
          description="A new order, an order moving on, a payment taken, a payment that failed"
          checked={settings.notifyNewOrder}
          onChange={(checked) => patch({ notifyNewOrder: checked })}
        />
        <SettingsToggle
          label="Something running low"
          description="A product reaching the count you set under Stock"
          checked={settings.notifyLowStock}
          onChange={(checked) => patch({ notifyLowStock: checked })}
        />
        <SettingsToggle
          label="A pre-order due out"
          description="A pre-order reaching the day it releases"
          checked={settings.notifyPreorderRelease}
          onChange={(checked) => patch({ notifyPreorderRelease: checked })}
        />
        <p className="text-[11px] leading-relaxed text-[#86868B]">
          Turning one off never silences a message to a customer. Those are set separately.
        </p>
      </Cluster>

      <div className={calloutClass}>
        What is actually sent, to whom, and in what words is set up under{" "}
        <Link href="/admin/automations" className={linkClass}>
          Automatic messages
        </Link>
        .
      </div>
    </SettingsSection>
  );
}

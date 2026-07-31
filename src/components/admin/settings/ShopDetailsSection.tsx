"use client";

import { useState } from "react";
import Link from "next/link";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { SettingsToggle } from "@/components/admin/settings/SettingsToggle";
import {
  Cluster,
  Field,
  fieldClass,
  insetPanelClass,
  linkClass,
  type SettingsPanelProps,
} from "@/components/admin/settings/SettingsShared";
import { digitsOnly, looksLikeEmail } from "@/components/admin/settings/settingsValues";

/**
 * Who the shop is, and how a customer reaches it.
 *
 * Six boxes in a two-column grid, in this order: name, city, email, phone,
 * WhatsApp number, WhatsApp greeting. Read down that column and there is no
 * clue that two of them are printed on every bill he hands over, that one of
 * them is the number on a button on his website, or that the last one is a
 * sentence a customer sees. They are three different decisions and they are now
 * three groups.
 *
 * The chat-button switch moved here from Checkout. It was one tab away from the
 * number it needs, and its own description said so — "Add a WhatsApp number
 * under Shop details first" — which is an instruction to go somewhere else, not
 * a setting.
 */
export function ShopDetailsSection({
  settings,
  patch,
  active,
  status,
  disabled,
}: SettingsPanelProps) {
  const [emailError, setEmailError] = useState("");

  return (
    <SettingsSection
      id="store"
      active={active}
      title="Shop details"
      description="Who you are, and how a customer reaches you."
      status={status}
      disabled={disabled}
    >
      <div className={`${insetPanelClass} flex flex-wrap items-center justify-between gap-2.5`}>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-[#6E6E73]">Customers see</div>
          <div className="mt-0.5 text-xs text-[#424245]">
            <span className="font-semibold text-[#1D1D1F]">
              {settings.storeName || "Ezurr Play HQ"}
            </span>
            {settings.city ? (
              <>
                {" "}
                · <span className="text-[#6E6E73]">{settings.city}</span>
              </>
            ) : null}
          </div>
        </div>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold text-white ring-1 ring-black/[0.06]"
          style={{ background: `oklch(0.45 0.12 ${settings.accentHue})` }}
          aria-hidden
        >
          {(settings.storeName || "EZ").slice(0, 2).toUpperCase()}
        </div>
      </div>

      <Cluster
        title="Your name and town"
        lead="Shown on your website and printed at the top of every bill you hand over."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Shop name"
            hint={
              settings.docBusinessName
                ? `Bills print your registered name — “${settings.docBusinessName}” — instead of this.`
                : "Also the name printed on your bills."
            }
          >
            <input
              value={settings.storeName}
              onChange={(e) => patch({ storeName: e.target.value })}
              className={fieldClass}
              placeholder="Ezurr Play HQ"
            />
          </Field>
          <Field
            label="City"
            hint={
              settings.docCity ? (
                // Naming the conflict and stopping was a dead end: he has moved
                // shop, he has changed the city here, and the screen tells him
                // his bills still say the old one without saying where to go.
                // The way out is one tap.
                <>
                  Bills print “{settings.docCity}” instead of this.{" "}
                  <Link href="/admin/settings?tab=tax" className="font-semibold underline">
                    Change that under GST &amp; invoices
                  </Link>
                  .
                </>
              ) : (
                "Also the city printed on your bills."
              )
            }
          >
            <input
              value={settings.city}
              onChange={(e) => patch({ city: e.target.value })}
              className={fieldClass}
              placeholder="Bengaluru"
            />
          </Field>
        </div>
      </Cluster>

      {/*
        The consequence sentence here is the whole reason this is its own group.
        Both of these are printed on every bill (the seller block takes them
        straight from these two fields, with no separate box anywhere) — so a
        stale phone number is a customer who cannot reach the shop about the
        parcel in his hands.
      */}
      <Cluster
        title="How customers reach you"
        lead="Both are printed on every bill, so a customer with a problem can find you."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Email customers can write to"
            hint={
              emailError ? (
                <span role="alert" className="text-[#B42318]">
                  {emailError}
                </span>
              ) : undefined
            }
          >
            <input
              type="email"
              value={settings.supportEmail}
              onChange={(e) => {
                const value = e.target.value;
                patch({ supportEmail: value });
                setEmailError(
                  value && !looksLikeEmail(value) ? "That doesn't look like an email address." : "",
                );
              }}
              className={fieldClass}
              placeholder="hello@ezurr.com"
            />
          </Field>
          <Field label="Phone customers can call" hint="10 digits. No +91, no spaces.">
            <input
              value={settings.supportPhone}
              onChange={(e) => patch({ supportPhone: digitsOnly(e.target.value, 10) })}
              className={fieldClass}
              placeholder="9876500000"
              inputMode="numeric"
            />
          </Field>
        </div>
      </Cluster>

      <Cluster
        title="The chat button on your website"
        lead="A button on every page that opens WhatsApp with you already selected."
      >
        <SettingsToggle
          label="Show the chat button"
          description={
            settings.whatsappNumber
              ? `Opens WhatsApp to +91 ${settings.whatsappNumber}`
              : "Add your WhatsApp number below first"
          }
          checked={settings.whatsappWidgetEnabled}
          onChange={(checked) => patch({ whatsappWidgetEnabled: checked })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {/*
            Named at length on purpose. There are two WhatsApp numbers in this
            admin — this one and the number your messages are sent from, under
            Integrations — and while both were labelled "WhatsApp number" they
            were forever being given each other's value.
          */}
          <Field
            label="Number customers message"
            hint={
              <>
                The number messages your shop <em>sends</em> come from is on the WhatsApp card under{" "}
                <Link href="/admin/integrations" className={linkClass}>
                  Integrations
                </Link>
                .
              </>
            }
          >
            <input
              value={settings.whatsappNumber}
              onChange={(e) => patch({ whatsappNumber: digitsOnly(e.target.value, 12) })}
              className={fieldClass}
              placeholder="9876500000"
              inputMode="numeric"
            />
          </Field>
          <Field
            label="What the customer's message says"
            hint="Already typed in for them when the chat opens."
          >
            <input
              value={settings.whatsappGreeting}
              onChange={(e) => patch({ whatsappGreeting: e.target.value.slice(0, 200) })}
              className={fieldClass}
              placeholder="Hi! I have a question about my order."
            />
          </Field>
        </div>
      </Cluster>
    </SettingsSection>
  );
}

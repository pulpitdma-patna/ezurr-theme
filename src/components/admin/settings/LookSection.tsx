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
import { formatReleaseLabel } from "@/hooks/useLiveThemeSettings";

const HUE_PRESETS = [
  { label: "Violet", value: 255 },
  { label: "Blue", value: 230 },
  { label: "Teal", value: 180 },
  { label: "Green", value: 145 },
  { label: "Amber", value: 75 },
  { label: "Rose", value: 15 },
];

/**
 * Colour, the pay-online banner, and the one date the whole shop counts down to.
 *
 * Two things here were described as something they are not, and both send the
 * owner looking for a control that does not exist:
 *
 *  - the banner was called "the offer strip … across the top of the home page".
 *    It is not a strip: it is a full banner section with a picture, a heading
 *    and a button, sitting wherever the website builder puts it, and every word
 *    of it is editable there. Calling it a strip is why he went hunting for a
 *    "strip" in the builder.
 *  - the date was called "Date on the home page countdown". The same date also
 *    prints "Releases …" on every pre-order product page, so changing it for the
 *    countdown quietly changes what a customer is promised on the product page.
 */
export function LookSection({ settings, patch, active, status, disabled }: SettingsPanelProps) {
  const releaseLabel = formatReleaseLabel(settings.releaseDate);

  return (
    <SettingsSection
      id="appearance"
      active={active}
      title="Look"
      description="Your colour, your pay-online banner, and your pre-order date — all live on your website."
      status={status}
      disabled={disabled}
    >
      <div className={`${calloutClass} text-[#3A3A3C]`}>
        Sections, photos and wording on the home page are edited in the{" "}
        <Link href="/admin/cms/home" className="font-semibold text-[#1D1D1F] underline">
          website builder
        </Link>
        .
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[1fr_11.5rem]">
        <div className="space-y-3.5">
          <Cluster title="Your colour" lead="Buttons, links and highlights across your website.">
            <div className="flex flex-wrap gap-1">
              {HUE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => patch({ accentHue: preset.value })}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold transition ${
                    settings.accentHue === preset.value
                      ? "border-[#1D1D1F] bg-[#1D1D1F] text-white"
                      : "border-black/[0.08] bg-white text-[#6E6E73] hover:text-[#1D1D1F]"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
                    style={{ background: `oklch(0.55 0.17 ${preset.value})` }}
                  />
                  {preset.label}
                </button>
              ))}
            </div>
            <Field label="Or slide to any shade in between">
              <input
                type="range"
                min={0}
                max={360}
                value={settings.accentHue}
                onChange={(e) => patch({ accentHue: Number(e.target.value) })}
                className="w-full accent-[#1D1D1F]"
                aria-label="Colour"
              />
            </Field>
          </Cluster>

          <Cluster
            title="The pay-online banner"
            lead="A banner on your home page telling customers they save by paying before delivery."
          >
            <SettingsToggle
              label="Show the pay-online banner"
              description={
                settings.showOffer
                  ? `Reads “Save ${settings.prepaidDiscount}%” — the discount set under Checkout`
                  : "Your home page shows no pay-online banner"
              }
              checked={settings.showOffer}
              onChange={(checked) => patch({ showOffer: checked })}
            />
            <p className="text-[11px] leading-relaxed text-[#86868B]">
              Its picture and wording are yours to change in the{" "}
              <Link href="/admin/cms/home" className={linkClass}>
                website builder
              </Link>{" "}
              — only the percentage comes from Checkout, so the banner can never
              promise a discount your checkout does not give.
            </p>
          </Cluster>

          <Cluster
            title="Your pre-order date"
            lead="One date for the whole shop, not per product."
          >
            <Field
              label="Date everything is due out"
              hint={`Counts down on your home page and reads “Releases ${releaseLabel}” on every pre-order page.`}
            >
              <input
                type="date"
                value={settings.releaseDate}
                onChange={(e) => patch({ releaseDate: e.target.value })}
                className={`${fieldClass} max-w-xs`}
              />
            </Field>
          </Cluster>
        </div>

        <div className="overflow-hidden rounded-lg border border-black/[0.08] bg-[#0C0C0E] p-3 text-white lg:sticky lg:top-3 lg:self-start">
          <div className="text-[10px] font-semibold text-white/50">Preview</div>
          <div
            className="mt-2 h-12 rounded-md"
            style={{
              background: `linear-gradient(135deg, oklch(0.55 0.17 ${settings.accentHue}), oklch(0.35 0.08 ${settings.accentHue}))`,
            }}
          />
          <div className="mt-2 text-xs font-semibold tracking-[-0.02em]">
            {settings.storeName || "Ezurr Play HQ"}
          </div>
          <div className="mt-0.5 text-[10px] text-white/50">
            Banner {settings.showOffer ? "on" : "off"} · {releaseLabel}
          </div>
          <Link
            href="/"
            className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-md bg-white text-[11px] font-semibold text-[#1D1D1F]"
          >
            Open your website
          </Link>
        </div>
      </div>
    </SettingsSection>
  );
}

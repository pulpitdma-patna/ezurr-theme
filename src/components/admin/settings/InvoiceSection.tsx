"use client";

import Link from "next/link";
import { MediaLibraryPicker } from "@/components/admin/MediaLibraryPicker";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { SettingsToggle } from "@/components/admin/settings/SettingsToggle";
import {
  Cluster,
  Field,
  MoreOptions,
  calloutClass,
  fieldClass,
  insetPanelClass,
  labelClass,
  linkClass,
  type SettingsPanelProps,
} from "@/components/admin/settings/SettingsShared";
import {
  digitsOnly,
  normalizeGstin,
  normalizePan,
} from "@/components/admin/settings/settingsValues";

/**
 * Everything that is printed on the tax invoice.
 *
 * Fifteen boxes, and the top two of them were "GSTIN" and — nine boxes further
 * down — "GSTIN on the bill". Two boxes, one number, and the shop's bills quietly
 * preferred the second one: the seller block prints docGstin and falls back to
 * the older store-level gstin only when it is empty. So an owner who corrected
 * the top box after a re-registration would keep handing out bills carrying the
 * old number, with both values visible on the same screen and no hint which one
 * was winning. There is one box now and it writes both, which is the only way
 * they cannot disagree.
 *
 * The state box is not a formality either, and its consequence is printed
 * against it rather than explained on a help page: with no state stored, no bill
 * can claim an intra-state supply, so every one of them charges IGST — including
 * the customer who walked in from the next street.
 */
export function InvoiceSection({ settings, patch, active, status, disabled }: SettingsPanelProps) {
  // What actually prints. The bill prefers the bill-specific number and falls
  // back to the older one, so showing that same choice here means the box says
  // what the customer will read.
  const gstNumber = settings.docGstin || settings.gstin || "";

  return (
    <SettingsSection
      id="tax"
      active={active}
      title="GST & invoices"
      description="What is printed on the bill your customer keeps and your CA files."
      status={status}
      disabled={disabled}
    >
      <Cluster title="Your GST number" lead="One number, printed on every bill you give out.">
        <Field
          label="GST number"
          hint={
            gstNumber ? (
              "Printed on every bill."
            ) : (
              <span className="text-[#8A5A00]">
                Empty — your bills are going out without a GST number on them.
              </span>
            )
          }
        >
          <input
            value={gstNumber}
            onChange={(e) => {
              const value = normalizeGstin(e.target.value);
              // Both keys, always. See the note at the top of this file.
              patch({ docGstin: value, gstin: value });
            }}
            placeholder="29AABCE1234F1Z5"
            maxLength={15}
            className={`${fieldClass} ez-mono`}
          />
        </Field>
      </Cluster>

      <Cluster
        title="The name and address on your bills"
        lead="Your registered details, exactly as they should read on a tax invoice."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {/*
            The fallback is stated only when there is one. The seller name falls
            back to the shop name literally — an empty shop name is not swapped
            for anything — so with both boxes empty the bill goes out with no
            name at the top, and saying "bills print your shop name" would be
            pointing at nothing.
          */}
          <Field
            label="Registered business name"
            className="sm:col-span-2"
            hint={
              settings.docBusinessName ? undefined : settings.storeName ? (
                `Empty — bills print your shop name, “${settings.storeName}”.`
              ) : (
                <span className="text-[#8A5A00]">
                  Empty, and so is your shop name — bills have nothing to print at the top.
                </span>
              )
            }
          >
            <input
              value={settings.docBusinessName}
              onChange={(e) => patch({ docBusinessName: e.target.value })}
              placeholder={settings.storeName || "Registered name"}
              className={fieldClass}
            />
          </Field>
          <Field label="Address line 1">
            <input
              value={settings.docAddressLine1}
              onChange={(e) => patch({ docAddressLine1: e.target.value })}
              className={fieldClass}
            />
          </Field>
          <Field label="Address line 2" hint="Only if you need it.">
            <input
              value={settings.docAddressLine2}
              onChange={(e) => patch({ docAddressLine2: e.target.value })}
              className={fieldClass}
            />
          </Field>
          <Field
            label="City"
            hint={
              settings.docCity || !settings.city
                ? undefined
                : `Empty — bills print “${settings.city}”, from Shop details.`
            }
          >
            <input
              value={settings.docCity}
              onChange={(e) => patch({ docCity: e.target.value })}
              placeholder={settings.city || "Bengaluru"}
              className={fieldClass}
            />
          </Field>
          <Field
            label="State"
            hint={
              settings.docState ? (
                `A customer in ${settings.docState} is billed CGST + SGST. Everyone else, IGST.`
              ) : (
                <span className="text-[#8A5A00]">
                  Empty — every bill has to charge IGST, even for a customer in your own state,
                  where it should be CGST + SGST.
                </span>
              )
            }
          >
            <input
              value={settings.docState}
              onChange={(e) => patch({ docState: e.target.value })}
              placeholder="Karnataka"
              className={fieldClass}
            />
          </Field>
          <Field label="Pincode">
            <input
              value={settings.docPincode}
              onChange={(e) => patch({ docPincode: digitsOnly(e.target.value, 6) })}
              className={fieldClass}
              inputMode="numeric"
              placeholder="560001"
            />
          </Field>
          <Field label="PAN" hint="Printed under your GST number. Leave it empty to keep it off.">
            <input
              value={settings.docPan}
              onChange={(e) => patch({ docPan: normalizePan(e.target.value) })}
              className={`${fieldClass} ez-mono`}
              placeholder="AABCE1234F"
            />
          </Field>
        </div>
      </Cluster>

      {/*
        Set at the start and then never again — a logo, a numbering prefix and
        two paragraphs of standing wording. On the surface they were four of the
        fifteen boxes he had to read past every time he came to fix an address.
      */}
      <MoreOptions
        summary="Logo, wording and bill numbering"
        lead="Set once when you start. Most shops never open this again."
      >
        {/*
          Not wrapped in a `Field`: that is a <label>, and this picker is three
          controls, so a tap anywhere near the preview would fire the first one.
          It replaces a box that asked him to paste a web address — which meant
          the logo could only be added by someone who already had it hosted
          somewhere, i.e. not by him.
        */}
        <div className="flex flex-col gap-1">
          <span className={labelClass}>Logo printed on bills and packing lists</span>
          <MediaLibraryPicker
            value={settings.docLogoUrl}
            onChange={(url) => patch({ docLogoUrl: url })}
            folder="media"
          />
        </div>

        <Field label="Bill numbers start with">
          <input
            value={settings.docInvoicePrefix}
            onChange={(e) => patch({ docInvoicePrefix: e.target.value })}
            placeholder="INV-"
            className={`${fieldClass} max-w-[10rem]`}
          />
        </Field>

        <div className={`${insetPanelClass} bg-white`}>
          <div className="text-[11px] font-semibold text-[#6E6E73]">
            A bill number will look like
          </div>
          <div className="ez-mono mt-0.5 text-xs font-semibold text-[#1D1D1F]">
            {`${settings.docInvoicePrefix || "INV-"}EZ-A1B2C3D4`}
          </div>
          <p className="mt-1 text-[11px] text-[#86868B]">
            The rest is the order&rsquo;s own number, so printing a bill twice never gives it a new
            one.
          </p>
        </div>

        <Field label="Terms printed at the bottom">
          <textarea
            value={settings.docDeclaration}
            onChange={(e) => patch({ docDeclaration: e.target.value })}
            rows={3}
            className={`${fieldClass} h-auto py-2 leading-relaxed`}
          />
        </Field>

        <Field label="Last line on the page">
          <input
            value={settings.docFooterNote}
            onChange={(e) => patch({ docFooterNote: e.target.value })}
            className={fieldClass}
          />
        </Field>

        <SettingsToggle
          label="Leave room for signatures"
          description={
            settings.docSignatureLine
              ? "Bills get a customer and a seller line; packing lists get packed-by and checked-by"
              : "No signature lines on either"
          }
          checked={settings.docSignatureLine}
          onChange={(checked) => patch({ docSignatureLine: checked })}
        />
      </MoreOptions>

      {/*
        This callout used to say CGST/SGST/IGST and HSN "are not captured on
        orders yet". They were — every bill has split tax by place of supply for
        months — and the sentence sent the owner off to add GST up by hand.
        The HSN half is now stated as it actually behaves: it comes from the
        product, so a product without one contributes no code.
      */}
      <div className={calloutClass}>
        Every order already carries its CGST and SGST, or its IGST, worked out from the customer&rsquo;s
        state — plus the HSN code of any product you have given one.{" "}
        <Link href="/admin/reports" className={linkClass}>
          See this month&rsquo;s GST →
        </Link>
      </div>
    </SettingsSection>
  );
}

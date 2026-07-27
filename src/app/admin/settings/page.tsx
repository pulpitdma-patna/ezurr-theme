"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  SettingsNav,
  SETTINGS_TABS,
  type SettingsTabId,
} from "@/components/admin/settings/SettingsNav";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { SettingsToggle } from "@/components/admin/settings/SettingsToggle";
import { defaultAdminSettings, formatInr, type AdminSettings } from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { ADMIN_SETTING_KEYS, useAdminSettingsSync } from "@/hooks/useAdminSettingsSync";
import { useAdminToast } from "@/components/admin/AdminToast";
import { formatReleaseLabel } from "@/hooks/useLiveThemeSettings";
import { useStaffRole } from "@/hooks/useStaffRole";
import { STAFF_ROLE_OPTIONS } from "@/lib/adminPermissions";
import { resetAdminStore, updateSettings } from "@/lib/adminStore";
import { api, isApiEnabled } from "@/lib/apiClient";
import { invalidateApiSettings } from "@/hooks/useApiSettings";

const fieldClass =
  "h-9 w-full rounded-lg border border-black/[0.07] bg-[#FAFAFB] px-3 text-sm outline-none transition hover:border-black/[0.10] focus:border-black/[0.14] focus:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] disabled:opacity-50";

const labelClass =
  "ez-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#86868B]";

const secondaryBtnClass =
  "inline-flex h-9 items-center rounded-lg border border-black/[0.08] bg-white px-3.5 text-xs font-semibold text-[#1D1D1F] shadow-[0_1px_2px_rgba(17,17,19,0.03)] transition hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

const insetPanelClass =
  "rounded-lg border border-black/[0.06] bg-[#FAFAFB] px-3 py-2.5";

const calloutClass =
  "rounded-lg border border-black/[0.06] bg-[#FAFAFB] px-3 py-2.5 text-[11px] leading-relaxed text-[#6E6E73]";

const HUE_PRESETS = [
  { label: "Violet", value: 255 },
  { label: "Blue", value: 230 },
  { label: "Teal", value: 180 },
  { label: "Green", value: 145 },
  { label: "Amber", value: 75 },
  { label: "Rose", value: 15 },
];

function isValidTab(value: string | null): value is SettingsTabId {
  return SETTINGS_TABS.some((tab) => tab.id === value);
}


export default function AdminSettingsPage() {
  const { settings } = useAdminStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab");
  const initialTab: SettingsTabId = isValidTab(urlTab) ? urlTab : "store";
  const [tab, setTab] = useState<SettingsTabId>(initialTab);
  const [seenUrlTab, setSeenUrlTab] = useState(urlTab);
  if (urlTab !== seenUrlTab) {
    setSeenUrlTab(urlTab);
    if (isValidTab(urlTab)) setTab(urlTab);
  }

  const [confirmReset, setConfirmReset] = useState(false);
  const toast = useAdminToast();
  const [emailError, setEmailError] = useState("");

  const selectTab = useCallback(
    (id: SettingsTabId) => {
      setTab(id);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", id);
      router.replace(`/admin/settings?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!event.altKey) return;
      const index = SETTINGS_TABS.findIndex((t) => t.id === tab);
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        const next = SETTINGS_TABS[(index + 1) % SETTINGS_TABS.length];
        selectTab(next.id);
      }
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        const prev =
          SETTINGS_TABS[(index - 1 + SETTINGS_TABS.length) % SETTINGS_TABS.length];
        selectTab(prev.id);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [tab, selectTab]);

  // The shell syncs these on every admin page now, so this screen no longer
  // needs its own copy of the same fetch.
  useAdminSettingsSync();

  // Accumulate changed keys and flush to the API once typing pauses, instead of
  // firing a PUT on every keystroke.
  const pendingRef = useRef<Record<string, unknown>>({});
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushSettings = useCallback((successMessage: string) => {
    if (flushTimer.current) {
      clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    const payload = pendingRef.current;
    pendingRef.current = {};
    if (!Object.keys(payload).length) return;
    void api
      .updateAdminSettings(payload)
      .then(() => {
        invalidateApiSettings();
        toast.push(successMessage, "success");
      })
      .catch((err) =>
        toast.push(
          err instanceof Error ? `Not saved: ${err.message}` : "Not saved to server",
          "danger",
        ),
      );
  }, [toast]);

  // Persist any pending change if the page unmounts before the debounce fires.
  useEffect(() => () => flushSettings("Saved just now"), [flushSettings]);

  function patch(partial: Partial<AdminSettings>, successMessage = "Saved just now") {
    updateSettings(partial);
    if (!isApiEnabled()) {
      toast.push(successMessage, "success");
      return;
    }
    let queued = false;
    for (const k of ADMIN_SETTING_KEYS) {
      if (k in partial) {
        pendingRef.current[k] = partial[k];
        queued = true;
      }
    }
    if (!queued) {
      toast.push(successMessage, "success");
      return;
    }
    toast.push("Saving…", "neutral");
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(() => flushSettings(successMessage), 600);
  }

  function resetKnobs() {
    updateSettings({
      accentHue: defaultAdminSettings.accentHue,
      showOffer: defaultAdminSettings.showOffer,
      releaseDate: defaultAdminSettings.releaseDate,
      prepaidDiscount: defaultAdminSettings.prepaidDiscount,
      codEnabled: defaultAdminSettings.codEnabled,
      codLimit: defaultAdminSettings.codLimit,
      freeShippingMin: defaultAdminSettings.freeShippingMin,
      orderIdPrefix: defaultAdminSettings.orderIdPrefix,
      lowStockThreshold: defaultAdminSettings.lowStockThreshold,
      timezone: defaultAdminSettings.timezone,
      currencyLabel: defaultAdminSettings.currencyLabel,
      notifyNewOrder: defaultAdminSettings.notifyNewOrder,
      notifyLowStock: defaultAdminSettings.notifyLowStock,
      notifyPreorderRelease: defaultAdminSettings.notifyPreorderRelease,
    });
    toast.push("Theme & commerce knobs reset", "success");
  }

  function resetDemo() {
    resetAdminStore();
    setConfirmReset(false);
    toast.push("Demo data restored", "success");
    selectTab("store");
  }

  const prefixPreview = `${(settings.orderIdPrefix || "EZX").toUpperCase().slice(0, 6)}24081203`;
  const releaseLabel = formatReleaseLabel(settings.releaseDate);

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Settings"
        description="Workspace preferences for your storefront, checkout, and ops alerts."
        breadcrumbs={[
          { label: "System", href: "/admin/settings" },
          { label: "Settings" },
        ]}
        actions={
          <Link href="/" className={secondaryBtnClass}>
            Open storefront
          </Link>
        }
      />

      <section className="overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(17,17,19,0.03)]">
        <SettingsNav activeId={tab} onChange={selectTab}>
          <SettingsSection
            id="store"
            active={tab === "store"}
            title="Store profile"
            description="Identity customers and support channels see across the shop."
          >
            <div className={`${insetPanelClass} flex flex-wrap items-center justify-between gap-2.5`}>
              <div className="min-w-0">
                <div className="ez-mono text-[8px] uppercase tracking-[0.14em] text-[#AEAEB2]">
                  Live preview
                </div>
                <div className="mt-0.5 text-xs text-[#424245]">
                  Customer sees ·{" "}
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

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Store name">
                <input
                  value={settings.storeName}
                  onChange={(e) => patch({ storeName: e.target.value })}
                  className={fieldClass}
                  placeholder="Ezurr Play HQ"
                />
              </Field>
              <Field label="City">
                <input
                  value={settings.city}
                  onChange={(e) => patch({ city: e.target.value })}
                  className={fieldClass}
                  placeholder="Bengaluru"
                />
              </Field>
              <Field label="Support email">
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => {
                    const value = e.target.value;
                    patch({ supportEmail: value });
                    setEmailError(
                      value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
                        ? "Enter a valid email"
                        : "",
                    );
                  }}
                  className={fieldClass}
                  placeholder="hello@ezurr.com"
                />
                {emailError ? (
                  <span className="mt-1 text-[11px] text-[#B42318]">{emailError}</span>
                ) : null}
              </Field>
              <Field label="Support phone">
                <input
                  value={settings.supportPhone}
                  onChange={(e) =>
                    patch({ supportPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })
                  }
                  className={fieldClass}
                  placeholder="9876500000"
                  inputMode="numeric"
                />
              </Field>
              <Field label="WhatsApp number">
                <input
                  value={settings.whatsappNumber}
                  onChange={(e) =>
                    patch({ whatsappNumber: e.target.value.replace(/\D/g, "").slice(0, 12) })
                  }
                  className={fieldClass}
                  placeholder="9876500000"
                  inputMode="numeric"
                />
                <p className="mt-1.5 text-[11px] text-[#86868B]">
                  Powers the floating chat button on the storefront.
                </p>
              </Field>
              <Field label="WhatsApp greeting">
                <input
                  value={settings.whatsappGreeting}
                  onChange={(e) => patch({ whatsappGreeting: e.target.value.slice(0, 200) })}
                  className={fieldClass}
                  placeholder="Hi! I have a question about my order."
                />
              </Field>
              <Field label="GSTIN" className="sm:col-span-2">
                <input
                  value={settings.gstin}
                  onChange={(e) => patch({ gstin: e.target.value.toUpperCase() })}
                  className={`${fieldClass} ez-mono`}
                  placeholder="Optional · 15-character GSTIN"
                  maxLength={15}
                />
              </Field>
            </div>
          </SettingsSection>

          <SettingsSection
            id="appearance"
            active={tab === "appearance"}
            title="Appearance"
            description="Accent and merchandising blocks that apply live on the storefront."
          >
            <div className={`${calloutClass} text-[#3A3A3C]`}>
              Edit homepage sections, widgets, and custom code in the{" "}
              <a href="/admin/cms/home" className="font-semibold text-[#1D1D1F] underline">
                homepage builder
              </a>
              .
            </div>
            <div className="grid gap-3.5 lg:grid-cols-[1fr_11.5rem]">
              <div className="space-y-3">
                <Field label={`Accent hue · ${settings.accentHue}`}>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={settings.accentHue}
                    onChange={(e) => patch({ accentHue: Number(e.target.value) })}
                    className="w-full accent-[#1D1D1F]"
                  />
                  <div className="mt-2 flex flex-wrap gap-1">
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
                </Field>

                <SettingsToggle
                  label="Show offer banner"
                  description="Prepaid advantage strip on the home page"
                  checked={settings.showOffer}
                  onChange={(checked) => patch({ showOffer: checked })}
                />

                <Field label="Featured release date">
                  <input
                    type="date"
                    value={settings.releaseDate}
                    onChange={(e) => patch({ releaseDate: e.target.value })}
                    className={`${fieldClass} max-w-xs`}
                  />
                  <p className="mt-1.5 text-[11px] text-[#86868B]">
                    Countdown & labels show · {releaseLabel}
                  </p>
                </Field>
              </div>

              <div className="overflow-hidden rounded-lg border border-black/[0.08] bg-[#0C0C0E] p-3 text-white">
                <div className="ez-mono text-[7px] uppercase tracking-[0.16em] text-white/40">
                  Theme chip
                </div>
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
                  Offer {settings.showOffer ? "on" : "off"} · Ships {releaseLabel}
                </div>
                <Link
                  href="/"
                  className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-md bg-white text-[11px] font-semibold text-[#1D1D1F]"
                >
                  Preview storefront
                </Link>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            id="checkout"
            active={tab === "checkout"}
            title="Checkout"
            description="Payment preferences and cart thresholds."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Prepaid discount">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={settings.prepaidDiscount}
                    onChange={(e) =>
                      patch({
                        prepaidDiscount: Math.min(50, Math.max(0, Number(e.target.value) || 0)),
                      })
                    }
                    className={fieldClass}
                  />
                  <span className="shrink-0 text-sm font-semibold text-[#6E6E73]">%</span>
                </div>
                <p className="mt-1.5 text-[11px] text-[#86868B]">
                  Banner + checkout use this live.
                </p>
              </Field>
              <Field label="Order ID prefix">
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    value={settings.orderIdPrefix}
                    maxLength={6}
                    onChange={(e) =>
                      patch({
                        orderIdPrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                      })
                    }
                    className={`${fieldClass} max-w-[140px] ez-mono`}
                    placeholder="EZX"
                  />
                  <span className="ez-mono text-[10px] text-[#86868B]">
                    {prefixPreview}
                  </span>
                </div>
              </Field>
            </div>

            <SettingsToggle
              label="COD enabled"
              description={
                settings.codEnabled
                  ? `Available under ${formatInr(settings.codLimit)}`
                  : "COD unavailable at checkout"
              }
              checked={settings.codEnabled}
              onChange={(checked) => patch({ codEnabled: checked })}
            />

            <SettingsToggle
              label="WhatsApp chat widget"
              description={
                settings.whatsappNumber
                  ? `Floating chat button → +91 ${settings.whatsappNumber}`
                  : "Add a WhatsApp number above to enable"
              }
              checked={settings.whatsappWidgetEnabled}
              onChange={(checked) => patch({ whatsappWidgetEnabled: checked })}
            />

            <SettingsToggle
              label="COD advance lifts the limit"
              description={
                settings.codAdvance > 0
                  ? `Paying ${formatInr(settings.codAdvance)} makes COD available at any order value`
                  : "Set a COD advance above to use this"
              }
              checked={settings.codAdvanceUnlocksCap}
              onChange={(checked) => patch({ codAdvanceUnlocksCap: checked })}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="COD limit">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#86868B]">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={0}
                    disabled={!settings.codEnabled}
                    value={settings.codLimit}
                    onChange={(e) =>
                      patch({ codLimit: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className={`${fieldClass} pl-7 disabled:opacity-50`}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-[#86868B]">
                  {settings.codAdvanceUnlocksCap && settings.codAdvance > 0
                    ? "Ignored while the COD advance lifts the cap."
                    : "Orders above this must be prepaid."}
                </p>
              </Field>
              <Field label="COD advance">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#86868B]">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={0}
                    disabled={!settings.codEnabled}
                    value={settings.codAdvance}
                    onChange={(e) =>
                      patch({ codAdvance: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className={`${fieldClass} pl-7 disabled:opacity-50`}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-[#86868B]">
                  Paid online to confirm COD; deducted from the amount collected
                  at the door. 0 = nothing up front.
                </p>
              </Field>
              <Field label="Free shipping minimum">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#86868B]">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={settings.freeShippingMin}
                    onChange={(e) =>
                      patch({ freeShippingMin: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className={`${fieldClass} pl-7`}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-[#86868B]">Cart subtotal threshold.</p>
              </Field>
            </div>

            <div className={calloutClass}>
              <p>
                Runtime rules layer on top of these defaults — payment method gates, shipping
                labels, field requirements, and checkout blocks.
              </p>
              <Link
                href="/admin/checkout-rules"
                className="mt-1.5 inline-flex text-[11px] font-semibold text-[#1D1D1F] underline-offset-2 hover:underline"
              >
                Manage rules →
              </Link>
            </div>
          </SettingsSection>

          <SettingsSection
            id="operations"
            active={tab === "operations"}
            title="Operations"
            description="Stock alerts and locale defaults for the HQ console."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Low-stock threshold">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={settings.lowStockThreshold}
                  onChange={(e) =>
                    patch({
                      lowStockThreshold: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className={fieldClass}
                />
                <p className="mt-1.5 text-[11px] text-[#86868B]">
                  Dashboard alerts at ≤ {settings.lowStockThreshold} units.
                </p>
              </Field>
              <Field label="Timezone">
                <select
                  value={settings.timezone}
                  onChange={(e) => patch({ timezone: e.target.value })}
                  className={fieldClass}
                >
                  <option value="Asia/Kolkata">Asia/Kolkata</option>
                  <option value="Asia/Dubai">Asia/Dubai</option>
                  <option value="UTC">UTC</option>
                </select>
              </Field>
              <Field label="Currency">
                <select
                  value={settings.currencyLabel}
                  onChange={(e) => patch({ currencyLabel: e.target.value })}
                  className={fieldClass}
                >
                  <option value="INR">INR · ₹</option>
                  <option value="USD">USD · $</option>
                  <option value="AED">AED · د.إ</option>
                </select>
              </Field>
            </div>

            <div className="mt-1">
              <SettingsToggle
                label="Hide out-of-stock products"
                description={
                  settings.hideOutOfStock
                    ? "Products with 0 stock are hidden from storefront listings"
                    : "Out-of-stock products stay visible (marked “Sold out”)"
                }
                checked={settings.hideOutOfStock}
                onChange={(checked) => patch({ hideOutOfStock: checked })}
              />
            </div>

            <div className="border-t border-black/[0.05] pt-3.5">
              <p className="mb-2.5 ez-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#86868B]">
                Analytics
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="GA4 Measurement ID">
                  <input
                    value={settings.gaMeasurementId}
                    onChange={(e) => patch({ gaMeasurementId: e.target.value.trim() })}
                    placeholder="G-XXXXXXXXXX"
                    className={fieldClass}
                  />
                  <p className="mt-1.5 text-[11px] text-[#86868B]">
                    Loads Google Analytics 4 after cookie consent. Leave blank to disable.
                  </p>
                </Field>
                <Field label="Meta Pixel ID">
                  <input
                    value={settings.metaPixelId}
                    onChange={(e) => patch({ metaPixelId: e.target.value.trim() })}
                    placeholder="000000000000000"
                    className={fieldClass}
                  />
                  <p className="mt-1.5 text-[11px] text-[#86868B]">
                    Loads the Meta Pixel after consent. Leave blank to disable.
                  </p>
                </Field>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            id="team"
            active={tab === "team"}
            title="Team"
            description="Staff roles for this HQ (UI gate only until Phase 2 authZ)."
          >
            <div className="overflow-hidden rounded-lg border border-black/[0.06]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFB] ez-mono text-[8px] uppercase tracking-[0.12em] text-[#86868B]">
                  <tr>
                    <th className="px-3 py-2">Member</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05]">
                  {[
                    { name: "Admin", role: "Owner", access: "Full" },
                    { name: "Ops desk", role: "Manager", access: "Orders · inventory" },
                    { name: "Support", role: "Support", access: "Customers · notes" },
                    { name: "Finance", role: "Viewer", access: "Reports read-only" },
                  ].map((row) => (
                    <tr key={row.name}>
                      <td className="px-3 py-2 font-medium">{row.name}</td>
                      <td className="px-3 py-2 text-[#6E6E73]">{row.role}</td>
                      <td className="px-3 py-2 text-[#86868B]">{row.access}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-[#86868B]">
              Manage invites and the permissions matrix on{" "}
              <Link href="/admin/team" className="font-semibold text-[#424245] hover:underline">
                Team
              </Link>
              . Demo role switcher lives in Danger zone.
            </p>
          </SettingsSection>

          <SettingsSection
            id="tax"
            active={tab === "tax"}
            title="Tax"
            description="GST readiness for exports — rates are not calculated until order tax snapshots exist."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="GSTIN">
                <input
                  value={settings.gstin ?? ""}
                  onChange={(e) => patch({ gstin: e.target.value })}
                  placeholder="Optional"
                  className={fieldClass}
                />
              </Field>
              <div className={`${calloutClass} border-dashed text-[#6E6E73]`}>
                CGST / SGST / IGST splits and HSN codes are not captured on orders yet. Use Reports → Tax / GST for readiness exports.
              </div>
            </div>

            <div className="border-t border-black/[0.06] pt-3.5">
              <h3 className="text-xs font-semibold tracking-[-0.01em] text-[#1D1D1F]">
                Documents
              </h3>
              <p className="mt-0.5 max-w-xl text-[11px] leading-relaxed text-[#6E6E73]">
                Header, tax identity, and footer used on printed invoices and packing
                slips. State is the seller&rsquo;s place of supply — without it an invoice
                falls back to IGST instead of a CGST/SGST split.
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Legal business name" className="sm:col-span-2">
                  <input
                    value={settings.docBusinessName}
                    onChange={(e) => patch({ docBusinessName: e.target.value })}
                    placeholder={settings.storeName || "Registered entity name"}
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
                <Field label="Address line 2">
                  <input
                    value={settings.docAddressLine2}
                    onChange={(e) => patch({ docAddressLine2: e.target.value })}
                    placeholder="Optional"
                    className={fieldClass}
                  />
                </Field>
                <Field label="City">
                  <input
                    value={settings.docCity}
                    onChange={(e) => patch({ docCity: e.target.value })}
                    placeholder={settings.city || "Bengaluru"}
                    className={fieldClass}
                  />
                </Field>
                <Field label="State (place of supply)">
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
                    onChange={(e) => patch({ docPincode: e.target.value })}
                    className={fieldClass}
                  />
                </Field>
                <Field label="Invoice GSTIN">
                  <input
                    value={settings.docGstin}
                    onChange={(e) => patch({ docGstin: e.target.value })}
                    placeholder={settings.gstin || "29AABCE1234F1Z5"}
                    className={fieldClass}
                  />
                </Field>
                <Field label="PAN">
                  <input
                    value={settings.docPan}
                    onChange={(e) => patch({ docPan: e.target.value })}
                    placeholder="Optional"
                    className={fieldClass}
                  />
                </Field>
                <Field label="Logo URL">
                  <input
                    value={settings.docLogoUrl}
                    onChange={(e) => patch({ docLogoUrl: e.target.value })}
                    placeholder="https://…"
                    className={fieldClass}
                  />
                </Field>
                <Field label="Invoice number prefix" className="sm:col-span-2">
                  <input
                    value={settings.docInvoicePrefix}
                    onChange={(e) => patch({ docInvoicePrefix: e.target.value })}
                    placeholder="INV-"
                    className={fieldClass}
                  />
                </Field>
                <Field label="Declaration / terms" className="sm:col-span-2">
                  <textarea
                    value={settings.docDeclaration}
                    onChange={(e) => patch({ docDeclaration: e.target.value })}
                    rows={3}
                    className={`${fieldClass} h-auto py-2 leading-relaxed`}
                  />
                </Field>
                <Field label="Footer note" className="sm:col-span-2">
                  <input
                    value={settings.docFooterNote}
                    onChange={(e) => patch({ docFooterNote: e.target.value })}
                    className={fieldClass}
                  />
                </Field>
              </div>

              <div className={`${insetPanelClass} mt-3 bg-white`}>
                <div className="ez-mono text-[8px] uppercase tracking-[0.14em] text-[#AEAEB2]">
                  Invoice number preview
                </div>
                <div className="ez-mono mt-0.5 text-xs font-semibold text-[#1D1D1F]">
                  {`${settings.docInvoicePrefix || "INV-"}EZ-A1B2C3D4`}
                </div>
                <p className="mt-1 text-[11px] text-[#86868B]">
                  Derived from the order id, so re-printing never renumbers an invoice.
                </p>
              </div>

              <div className="mt-3">
                <SettingsToggle
                  label="Signature line"
                  description={
                    settings.docSignatureLine
                      ? "Invoice prints a customer / seller signature line; packing slip prints packed-by and checked-by"
                      : "No signature lines on printed documents"
                  }
                  checked={settings.docSignatureLine}
                  onChange={(checked) => patch({ docSignatureLine: checked })}
                />
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            id="shipping"
            active={tab === "shipping"}
            title="Shipping"
            description="Zone stubs for metro / rest of India. Wired to free-shipping minimum from Checkout."
          >
            <ul className="space-y-1.5">
              {[
                { zone: "Metro", rate: "₹79 flat · free above checkout minimum" },
                { zone: "Rest of India", rate: "₹119 flat · free above checkout minimum" },
                { zone: "COD surcharge", rate: "Included in payment method rules" },
              ].map((row) => (
                <li
                  key={row.zone}
                  className={`${insetPanelClass} flex items-center justify-between gap-3`}
                >
                  <span className="text-xs font-semibold">{row.zone}</span>
                  <span className="text-[11px] text-[#6E6E73]">{row.rate}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-[#86868B]">
              Free shipping threshold: {formatInr(settings.freeShippingMin)}. Carrier APIs stay under Integrations.
            </p>
          </SettingsSection>

          <SettingsSection
            id="notifications"
            active={tab === "notifications"}
            title="Notifications"
            description="Demo preferences — nothing is sent from this theme."
          >
            <div className="space-y-3">
              <SettingsToggle
                label="New order alerts"
                description="Demo · not sent"
                checked={settings.notifyNewOrder}
                onChange={(checked) => patch({ notifyNewOrder: checked })}
              />
              <SettingsToggle
                label="Low stock alerts"
                description="Demo · not sent"
                checked={settings.notifyLowStock}
                onChange={(checked) => patch({ notifyLowStock: checked })}
              />
              <SettingsToggle
                label="Pre-order release alerts"
                description="Demo · not sent"
                checked={settings.notifyPreorderRelease}
                onChange={(checked) => patch({ notifyPreorderRelease: checked })}
              />
            </div>
            <div className={`${calloutClass} border-dashed`}>
              Email / SMS / WhatsApp delivery is out of scope for this mock HQ. Toggles persist
              so you can design ops flows against them.
            </div>
          </SettingsSection>

          <SettingsSection
            id="danger"
            active={tab === "danger"}
            title="Danger zone"
            description="Irreversible demo actions for this browser’s localStorage."
            danger
          >
            <DemoRolePicker />
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className={`${insetPanelClass} bg-white p-3`}>
                <div className="text-xs font-semibold text-[#1D1D1F]">Reset theme knobs</div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[#86868B]">
                  Restores accent, offer, checkout, and ops defaults. Keeps catalog & orders.
                </p>
                <button
                  type="button"
                  onClick={resetKnobs}
                  className="mt-3 inline-flex h-8 items-center rounded-md border border-black/10 bg-[#FAFAFB] px-3 text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
                >
                  Reset knobs
                </button>
              </div>
              <div className="rounded-lg border border-[#F5C2C0] bg-[#FFF8F8] p-3">
                <div className="text-xs font-semibold text-[#B42318]">Reset demo data</div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[#912018]/80">
                  Wipes localStorage and restores seed catalog, orders, codes, and settings.
                </p>
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="mt-3 inline-flex h-8 items-center rounded-md bg-[#B42318] px-3 text-[11px] font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B42318]"
                >
                  Reset everything
                </button>
              </div>
            </div>
            <details className={`${calloutClass} [&_summary]:cursor-pointer [&_summary]:font-semibold [&_summary]:text-[#6E6E73]`}>
              <summary>Sign-in note</summary>
              <p className="mt-2 leading-relaxed">
                Every sign-in is an OTP verified by the API — there is no local
                fallback and no phone-number shortcut to admin. Grant admin and
                staff roles under <span className="ez-mono">Team</span>. Remaining
                mock ops data lives in <span className="ez-mono">ezurr_admin_store</span>.
              </p>
            </details>
          </SettingsSection>
        </SettingsNav>
      </section>

      <ConfirmDialog
        open={confirmReset}
        title="Reset all demo data?"
        description="This clears localStorage and restores seed catalog, orders, customers, codes, and settings."
        confirmLabel="Reset demo data"
        danger
        onConfirm={resetDemo}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function DemoRolePicker() {
  const { role, setRole } = useStaffRole();
  return (
    <div className={`${insetPanelClass} bg-white`}>
      <div className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
        Demo role (this browser)
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {STAFF_ROLE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setRole(option.value)}
            className={`h-7 rounded-md px-2.5 text-[11px] font-semibold transition ${
              role === option.value
                ? "bg-[#1D1D1F] text-white"
                : "border border-black/10 bg-white text-[#424245] hover:bg-[#FAFAFB]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-[#86868B]">
        Active: <span className="font-semibold capitalize text-[#1D1D1F]">{role}</span> — gates
        coupons, refunds, imports, and releases in the UI.
      </p>
    </div>
  );
}

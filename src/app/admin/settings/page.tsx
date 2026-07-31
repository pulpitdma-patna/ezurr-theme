"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SaveStatus } from "@/components/admin/SaveStatus";
import { SettingsNav, SETTINGS_TABS, type SettingsTabId } from "@/components/admin/settings/SettingsNav";
import { AlertsSection } from "@/components/admin/settings/AlertsSection";
import { CheckoutSection } from "@/components/admin/settings/CheckoutSection";
import { InvoiceSection } from "@/components/admin/settings/InvoiceSection";
import { LookSection } from "@/components/admin/settings/LookSection";
import { ShopDetailsSection } from "@/components/admin/settings/ShopDetailsSection";
import { StartOverSection } from "@/components/admin/settings/StartOverSection";
import { StockSection } from "@/components/admin/settings/StockSection";
import { resolveInitialTab } from "@/components/admin/settings/settingsValues";
import type { AdminSettings } from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import {
  ADMIN_SETTING_KEYS,
  holdSettingKeys,
  useAdminSettingsSync,
} from "@/hooks/useAdminSettingsSync";
import { useSaveState } from "@/hooks/useSaveState";
import { useStaffRole } from "@/hooks/useStaffRole";
import { can } from "@/lib/adminPermissions";
import { resetAdminStore, updateSettings } from "@/lib/adminStore";
import { api, isApiEnabled } from "@/lib/apiClient";
import { invalidateApiSettings } from "@/hooks/useApiSettings";

/**
 * What this shop has decided about how it behaves.
 *
 * This file is now the wiring and nothing else — which tab is open, who is
 * allowed to write, and one queue that every control on every tab goes through.
 * Each tab's controls live in their own component under
 * `components/admin/settings/`, because a 920-line file was how "GSTIN" and
 * "GSTIN on the bill" ended up nine boxes apart on the same tab without anyone
 * noticing they were the same number.
 *
 * The save was fixed before this rework and is left alone: `useSaveState` only
 * ever claims "saved" from a resolved response that echoed back what was sent,
 * and it says so in a permanent line in the tab header rather than a toast.
 *
 * Three controls were removed rather than reworded, each verified against the
 * code that would have to read it:
 *  - Currency (nothing reads it; every amount is ₹ either side);
 *  - Time zone (nothing reads it; every admin time is printed in IST);
 *  - "Order numbers start with" (the server numbers orders EZ-XXXXXXXX and never
 *    looks at the setting, so the box and its preview were both fiction).
 * The notes on each of those sit in the tab that used to hold them.
 *
 * What is NOT here any more, and where it went:
 *  - Team: four invented staff members rendered to a shop with real ones. The
 *    real list is /admin/team.
 *  - Shipping: three fixed sentences and no control.
 *  - Google Analytics and Facebook Pixel: another company's account numbers,
 *    so they belong on that company's card under Integrations.
 *  - The sign-in note: it explained our browser storage to a shopkeeper.
 */

const secondaryBtnClass =
  "inline-flex h-9 items-center rounded-lg border border-black/[0.08] bg-white px-3.5 text-xs font-semibold text-[#1D1D1F] shadow-[0_1px_2px_rgba(17,17,19,0.03)] transition hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

export default function AdminSettingsPage() {
  const store = useAdminStore();
  const settings = store.settings;
  const apiOn = isApiEnabled();
  const { role } = useStaffRole();
  // Checked at render, not on press. The server refuses a settings write from
  // anyone but the owner, and an admin with no staff role written down is
  // granted nothing at all — so a manager pressing a switch here used to get a
  // red message after the fact for something we should never have offered.
  const canWriteSettings = !apiOn || can("settings.write", role);
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab");

  // Nothing to start over from once this is a real shop: the only action left
  // on that tab restores sample data into this browser.
  const tabs = useMemo(
    () => (apiOn ? SETTINGS_TABS.filter((tab) => tab.id !== "danger") : SETTINGS_TABS),
    [apiOn],
  );
  const [tab, setTab] = useState<SettingsTabId>(() => resolveInitialTab(urlTab, null, tabs));
  const [seenUrlTab, setSeenUrlTab] = useState(urlTab);
  if (urlTab !== seenUrlTab) {
    setSeenUrlTab(urlTab);
    // A bookmark of a tab that no longer exists (?tab=team, ?tab=shipping)
    // leaves you where you are instead of opening an empty panel.
    setTab((current) => resolveInitialTab(urlTab, null, tabs, current));
  }

  const selectTab = useCallback(
    (id: SettingsTabId) => {
      setTab(id);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", id);
      router.replace(`/admin/settings?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  // The website builder links here as /admin/settings#appearance and the
  // checkout-exceptions screen as #checkout. Both were landing on Shop details,
  // so following "change your colours" from the builder meant hunting for the
  // tab by hand.
  //
  // Rewritten as a query rather than switched directly, for two reasons: the tab
  // then survives a refresh or a share, and the switch goes through the one
  // path above that already answers "which tab is this URL", instead of a second
  // copy of that question living in an effect.
  useEffect(() => {
    if (urlTab) return;
    const fromHash = resolveInitialTab(null, window.location.hash, tabs, "store");
    if (fromHash === "store") return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", fromHash);
    router.replace(`/admin/settings?${params.toString()}`, { scroll: false });
  }, [urlTab, tabs, router, searchParams]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!event.altKey) return;
      const index = tabs.findIndex((t) => t.id === tab);
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        selectTab(tabs[(index + 1) % tabs.length].id);
      }
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        selectTab(tabs[(index - 1 + tabs.length) % tabs.length].id);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [tab, tabs, selectTab]);

  // The shell syncs these on every admin page. It now leaves alone any key that
  // is still being edited here — it used to race the owner's typing and put the
  // server's older value back under his cursor.
  useAdminSettingsSync();

  const save = useCallback(async (payload: Record<string, unknown>) => {
    const echo = await api.updateAdminSettings(payload);
    invalidateApiSettings();
    return echo;
  }, []);

  const { state: saveState, queue } = useSaveState({
    save,
    debounceMs: 600,
    onPendingKeysChange: holdSettingKeys,
  });

  const patch = useCallback(
    (partial: Partial<AdminSettings>) => {
      if (!canWriteSettings) return;
      updateSettings(partial);
      if (!apiOn) return;

      // Only keys this screen can actually send. The old code toasted "Saved
      // just now" for anything outside this list without sending it anywhere,
      // which is the exact shape of lie this rework exists to remove: if a
      // control cannot reach the server it does not belong on the screen, and
      // while one is here it must not claim to have saved.
      const payload: Record<string, unknown> = {};
      for (const key of ADMIN_SETTING_KEYS) {
        if (key in partial) payload[key] = partial[key];
      }
      queue(payload);
    },
    [apiOn, canWriteSettings, queue],
  );

  function resetDemo() {
    resetAdminStore();
    selectTab("store");
  }

  const status = !apiOn ? (
    <span className="text-[11px] font-medium text-[#8A5A00]">Kept in this browser only</span>
  ) : canWriteSettings ? (
    <SaveStatus state={saveState} />
  ) : (
    <span className="text-[11px] font-medium text-[#86868B]">Only the owner can change these.</span>
  );

  const panel = { settings, patch, status, disabled: !canWriteSettings };

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Shop settings"
        description="How your shop behaves. Nothing here is a password, and nothing here can be wrong because of another company."
        actions={
          <Link href="/" className={secondaryBtnClass}>
            Open your website
          </Link>
        }
      />

      {!apiOn ? (
        <AdminNotice tone="demo">
          Practice shop. Nothing here is your real shop — anything you change is kept in this
          browser only.
        </AdminNotice>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(17,17,19,0.03)]">
        <SettingsNav activeId={tab} onChange={selectTab} tabs={tabs}>
          <ShopDetailsSection {...panel} active={tab === "store"} />
          <LookSection {...panel} active={tab === "appearance"} />
          <CheckoutSection {...panel} active={tab === "checkout"} />
          <StockSection {...panel} active={tab === "operations"} />
          <InvoiceSection {...panel} active={tab === "tax"} />
          <AlertsSection {...panel} active={tab === "notifications"} />
          {!apiOn ? (
            <StartOverSection
              active={tab === "danger"}
              status={status}
              disabled={!canWriteSettings}
              contents={{
                products: store.products.length,
                orders: store.orders.length,
                customers: store.customers.length,
                coupons: store.coupons.length,
                checkoutRules: store.checkoutRules.length,
              }}
              onReset={resetDemo}
            />
          ) : null}
        </SettingsNav>
      </section>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { api, isApiEnabled } from "@/lib/apiClient";
import { updateSettings } from "@/lib/adminStore";
import type { AdminSettings } from "@/data/admin";
import { invalidateApiSettings } from "@/hooks/useApiSettings";

/**
 * Pull the store's saved settings into the local admin store, once per load.
 *
 * This used to live inside /admin/settings alone, which meant every other admin
 * screen rendered `defaultAdminSettings` — including the sidebar, which showed
 * the seeded name "Ezurr Play HQ" as the owner's brand on every page until they
 * happened to open Settings. The setup wizard asks for a store name in its first
 * field, so that gap made the very first thing the owner typed look ignored.
 *
 * Safe to call from more than one place: it only ever copies server values in.
 */
export const ADMIN_SETTING_KEYS: Extract<keyof AdminSettings, string>[] = [
  "storeName", "supportEmail", "supportPhone", "city", "gstin",
  "accentHue", "showOffer", "releaseDate", "prepaidDiscount", "codEnabled",
  "codLimit", "freeShippingMin", "orderIdPrefix", "lowStockThreshold", "hideOutOfStock",
  "timezone", "currencyLabel", "notifyNewOrder", "notifyLowStock", "notifyPreorderRelease",
  "gaMeasurementId", "metaPixelId",
  "codAdvance", "codAdvanceLabel", "codAdvanceUnlocksCap", "reservationAmount",
  "whatsappWidgetEnabled", "whatsappNumber", "whatsappGreeting",
  "docBusinessName", "docAddressLine1", "docAddressLine2", "docCity", "docState",
  "docPincode", "docGstin", "docPan", "docLogoUrl", "docInvoicePrefix",
  "docDeclaration", "docFooterNote", "docSignatureLine",
];

export function useAdminSettingsSync() {
  useEffect(() => {
    if (!isApiEnabled()) return;
    let cancelled = false;

    void api
      .adminSettings()
      .then((remote) => {
        if (cancelled) return;
        const next: Partial<AdminSettings> = {};
        for (const k of ADMIN_SETTING_KEYS) {
          if (k in remote && remote[k] !== null && remote[k] !== undefined) {
            (next as Record<string, unknown>)[k] = remote[k];
          }
        }
        updateSettings(next);
        invalidateApiSettings();
      })
      .catch(() => {
        // Keep whatever is local. A failure here must not blank the admin.
      });

    return () => {
      cancelled = true;
    };
  }, []);
}

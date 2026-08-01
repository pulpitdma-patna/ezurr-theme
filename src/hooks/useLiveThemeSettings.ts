"use client";

import { useSyncExternalStore } from "react";
import { defaultAdminSettings, type AdminSettings } from "@/data/admin";
import {
  getApiSettingsSnapshot,
  subscribeApiSettings,
  useApiSettings,
} from "@/hooks/useApiSettings";
import {
  getLiveThemeSettings,
  subscribeAdminStore,
} from "@/lib/adminStore";
import { isApiEnabled } from "@/lib/apiClient";

const serverSettings: AdminSettings = { ...defaultAdminSettings };

function getStorefrontSettings(): AdminSettings {
  if (isApiEnabled()) {
    return getApiSettingsSnapshot();
  }
  return getLiveThemeSettings();
}

function subscribeStorefrontSettings(onStoreChange: () => void) {
  if (isApiEnabled()) {
    return subscribeApiSettings(onStoreChange);
  }
  return subscribeAdminStore(onStoreChange);
}

/** Prefer Laravel settings in API mode; adminStore/localStorage otherwise. */
export function useLiveThemeSettings(): AdminSettings {
  const apiState = useApiSettings();
  const localSettings = useSyncExternalStore(
    subscribeAdminStore,
    getLiveThemeSettings,
    () => serverSettings,
  );

  return isApiEnabled() ? apiState.settings : localSettings;
}

export function getThemeOrDefault(): AdminSettings {
  if (typeof window === "undefined") return { ...defaultAdminSettings };
  return getStorefrontSettings();
}

/** Format settings.releaseDate (YYYY-MM-DD) for storefront labels. */
/**
 * The date a pre-order is due, in words.
 *
 * Takes the product's own date. It used to be handed the SHOP-WIDE setting on
 * every pre-order screen — so seven games with seven different release dates all
 * told the customer the same day, and a deposit was taken against a date the
 * shop had never promised for that title.
 *
 * Returns null when there is no date, and callers say so rather than borrowing
 * another product's: "we do not know yet" is a fact he can act on, and a
 * confident wrong date is not.
 */
export function formatReleaseLabel(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;
  return formatReleaseDate(isoDate);
}

function formatReleaseDate(isoDate: string) {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export { subscribeStorefrontSettings, getStorefrontSettings };

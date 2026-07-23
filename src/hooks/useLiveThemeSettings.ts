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
export function formatReleaseLabel(isoDate: string) {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export { subscribeStorefrontSettings, getStorefrontSettings };

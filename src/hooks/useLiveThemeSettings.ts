"use client";

import { useSyncExternalStore } from "react";
import { defaultAdminSettings, type AdminSettings } from "@/data/admin";
import {
  getLiveThemeSettings,
  subscribeAdminStore,
} from "@/lib/adminStore";

const serverSettings: AdminSettings = { ...defaultAdminSettings };

/** Prefer admin store settings on the client; fall back to defaults. */
export function useLiveThemeSettings(): AdminSettings {
  return useSyncExternalStore(
    subscribeAdminStore,
    getLiveThemeSettings,
    () => serverSettings,
  );
}

export function getThemeOrDefault(): AdminSettings {
  if (typeof window === "undefined") return { ...defaultAdminSettings };
  return getLiveThemeSettings();
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

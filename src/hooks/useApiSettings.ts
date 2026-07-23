"use client";

import { useEffect, useState } from "react";
import { defaultAdminSettings, type AdminSettings } from "@/data/admin";
import { api, isApiEnabled } from "@/lib/apiClient";

type ApiSettingsState = {
  settings: AdminSettings;
  loading: boolean;
  error: string | null;
  source: "api" | "defaults";
};

let cached: AdminSettings | null = null;
let inflight: Promise<AdminSettings> | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

function apiToSettings(raw: Record<string, unknown>): AdminSettings {
  return {
    ...defaultAdminSettings,
    codEnabled: raw.codEnabled !== false,
    codLimit: Number(raw.codLimit ?? defaultAdminSettings.codLimit),
    prepaidDiscount: Number(raw.prepaidDiscount ?? defaultAdminSettings.prepaidDiscount),
    freeShippingMin: Number(raw.freeShippingMin ?? defaultAdminSettings.freeShippingMin),
    releaseDate: String(raw.releaseDate ?? defaultAdminSettings.releaseDate),
    accentHue: Number(raw.accentHue ?? defaultAdminSettings.accentHue),
    showOffer: raw.showOffer !== false,
  };
}

export function subscribeApiSettings(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getApiSettingsSnapshot(): AdminSettings {
  return cached ?? defaultAdminSettings;
}

export async function fetchApiSettings(): Promise<AdminSettings> {
  if (!isApiEnabled()) return defaultAdminSettings;
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = api
    .settings()
    .then((raw) => {
      const next = apiToSettings(raw);
      cached = next;
      notify();
      return next;
    })
    .catch(() => defaultAdminSettings)
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function invalidateApiSettings() {
  cached = null;
  notify();
}

/** Storefront settings from Laravel when API mode is on; defaults otherwise. */
// Homepage CMS blocks remain local-only in API mode (see PageRenderer).
export function useApiSettings(): ApiSettingsState {
  const apiOn = isApiEnabled();
  const [settings, setSettings] = useState<AdminSettings>(
    apiOn ? getApiSettingsSnapshot() : defaultAdminSettings,
  );
  const [loading, setLoading] = useState(apiOn && !cached);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"api" | "defaults">(
    apiOn && cached ? "api" : "defaults",
  );

  useEffect(() => {
    if (!apiOn) {
      setSettings(defaultAdminSettings);
      setLoading(false);
      setError(null);
      setSource("defaults");
      return;
    }

    function sync() {
      setSettings(getApiSettingsSnapshot());
    }

    if (cached) {
      sync();
      setLoading(false);
      setSource("api");
    } else {
      setLoading(true);
      void api
        .settings()
        .then((raw) => {
          const next = apiToSettings(raw);
          cached = next;
          notify();
          setSettings(next);
          setSource("api");
          setError(null);
        })
        .catch((err: Error) => {
          setError(err.message || "Could not load store settings");
          setSettings(defaultAdminSettings);
          setSource("defaults");
        })
        .finally(() => setLoading(false));
    }

    return subscribeApiSettings(() => {
      sync();
    });
  }, [apiOn]);

  return { settings, loading, error, source };
}

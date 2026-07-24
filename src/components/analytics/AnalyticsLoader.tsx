"use client";

import { useEffect } from "react";
import { useLiveThemeSettings } from "@/hooks/useLiveThemeSettings";
import { getConsent, subscribeConsent } from "@/lib/consent";
import { initAnalytics } from "@/lib/analytics";

/**
 * Injects GA4 + Meta Pixel — but only when (a) an ID is configured in Settings
 * and (b) the visitor has granted consent. Ships completely dark until both are
 * true. The per-request nonce is passed so injected scripts satisfy the CSP.
 */
export function AnalyticsLoader({ nonce }: { nonce?: string }) {
  const settings = useLiveThemeSettings();
  const ga = settings.gaMeasurementId?.trim() || undefined;
  const pixel = settings.metaPixelId?.trim() || undefined;

  useEffect(() => {
    if (!ga && !pixel) return;
    const apply = () => {
      if (getConsent() === "granted") initAnalytics({ ga, pixel, nonce });
    };
    apply();
    return subscribeConsent(apply);
  }, [ga, pixel, nonce]);

  return null;
}

"use client";

import { EditorialBanner } from "@/components/home/EditorialBanner";
import { useLiveThemeSettings } from "@/hooks/useLiveThemeSettings";

export function OfferBannerGate() {
  const settings = useLiveThemeSettings();
  if (!settings.showOffer) return null;

  const pct = settings.prepaidDiscount;
  return (
    <EditorialBanner
      eyebrow="Prepaid advantage"
      badge="Automatically applied"
      title={`Save ${pct}% before the story begins.`}
      description="Pay by UPI or card and the discount is applied at checkout, on top of your locked minimum pre-order price."
      href="/preorders"
      cta="Browse pre-orders"
      image="/images/banner-prepaid-violet.png"
      imageAlt="Abstract violet glass and futuristic coastal city"
      theme="violet"
      fullWidth
      imagePosition="70% center"
      prepaidPercent={pct}
    />
  );
}

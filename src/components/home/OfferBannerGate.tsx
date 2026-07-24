"use client";

import { EditorialBanner } from "@/components/home/EditorialBanner";
import { useLiveThemeSettings } from "@/hooks/useLiveThemeSettings";

/** Real catalog product shots — pre-order hero + supporting game + controller. */
const PREPAID_BANNER_PRODUCTS = [
  {
    src: "https://ezurr.com/cdn/shop/files/GAMPLAY540.jpg?v=1782735956&width=1200",
    alt: "Grand Theft Auto VI — Standard Edition",
  },
  {
    src: "https://ezurr.com/cdn/shop/files/PREPLAY346.jpg?v=1773153102&width=800",
    alt: "Marvel's Wolverine",
  },
  {
    src: "https://ezurr.com/cdn/shop/files/ACCPLAY256.jpg?v=1772605855&width=800",
    alt: "DualSense Wireless Controller — Midnight Black",
  },
] as const;

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
      image={PREPAID_BANNER_PRODUCTS[0].src}
      imageAlt={PREPAID_BANNER_PRODUCTS.map((item) => item.alt).join(", ")}
      productImages={[...PREPAID_BANNER_PRODUCTS]}
      theme="violet"
      fullWidth
      prepaidPercent={pct}
    />
  );
}

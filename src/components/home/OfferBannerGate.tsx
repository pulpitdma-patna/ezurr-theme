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

/**
 * Every string here used to be hardcoded, so selecting this section in the page
 * builder offered nothing but a visibility checkbox — the owner could turn their
 * prepaid banner off and could not change a word of it.
 *
 * The discount percentage stays derived from Appearance settings. It is
 * substituted into the title wherever `{pct}` appears, rather than being typed,
 * because a number typed here would silently contradict the discount actually
 * applied at checkout the first time either changed.
 */
export function OfferBannerGate({
  eyebrow = "Prepaid advantage",
  title = "Save {pct}% before the story begins.",
  description = "Pay by UPI or card and the discount is applied at checkout, on top of your locked minimum pre-order price.",
  badge = "Automatically applied",
  cta = "Browse pre-orders",
  href = "/preorders",
  image,
  imageAlt,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  badge?: string;
  cta?: string;
  href?: string;
  /** The owner's own banner image. Empty keeps the stock product line-up. */
  image?: string;
  imageAlt?: string;
} = {}) {
  const settings = useLiveThemeSettings();
  if (!settings.showOffer) return null;

  const pct = settings.prepaidDiscount;
  return (
    <EditorialBanner
      eyebrow={eyebrow}
      badge={badge}
      title={title.replaceAll("{pct}", String(pct))}
      description={description}
      href={href}
      cta={cta}
      image={image || PREPAID_BANNER_PRODUCTS[0].src}
      imageAlt={
        image
          ? (imageAlt ?? "")
          : PREPAID_BANNER_PRODUCTS.map((item) => item.alt).join(", ")
      }
      // The three-shot collage is the DEFAULT dressing, not part of the layout.
      // Once the owner supplies their own banner image, overlaying stock product
      // shots on top of it would be the store fighting its own artwork.
      productImages={image ? undefined : [...PREPAID_BANNER_PRODUCTS]}
      theme="violet"
      fullWidth
      prepaidPercent={pct}
    />
  );
}

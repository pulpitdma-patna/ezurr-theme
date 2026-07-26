import type { Metadata, Viewport } from "next";
import { Geist, Space_Mono } from "next/font/google";
import "./globals.css";
import { headers } from "next/headers";
import { ApiAuthBoot } from "@/components/ApiAuthBoot";
import { ThemeAccent } from "@/components/ThemeAccent";
import { CartProvider } from "@/lib/cart";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { AnalyticsLoader } from "@/components/analytics/AnalyticsLoader";
import { ConsentBanner } from "@/components/consent/ConsentBanner";
import { WhatsAppWidget } from "@/components/support/WhatsAppWidget";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://ezurr.com";

const siteName = "Ezurr";
const siteTitle = "Ezurr — Play HQ · India's Ultimate Gaming Store";
const siteDescription =
  "India's ultimate gaming store — games, consoles and gear at the lowest price, guaranteed.";

export const metadata: Metadata = {
  // Absolute base for canonical + Open Graph URLs emitted per page.
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s · Ezurr",
  },
  description: siteDescription,
  alternates: { canonical: "/" },
  // Shared links used to render as a bare URL with no title, description or
  // image. WhatsApp is the dominant sharing channel in this market, so every
  // link passed between customers was costing a preview. Pages that need their
  // own card (products, categories) override these; everything else inherits.
  openGraph: {
    type: "website",
    siteName,
    locale: "en_IN",
    url: "/",
    title: siteTitle,
    description: siteDescription,
    images: [{ url: "/images/hero-cyan-play.png", width: 1200, height: 630, alt: siteName }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/images/hero-cyan-play.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en">
      <body className={`${geist.variable} ${spaceMono.variable} min-h-screen antialiased`}>
        <ApiAuthBoot />
        <ThemeAccent />
        <AnalyticsLoader nonce={nonce} />
        <CartProvider>
          {children}
          <CartDrawer />
        </CartProvider>
        <WhatsAppWidget />
        <ConsentBanner />
      </body>
    </html>
  );
}

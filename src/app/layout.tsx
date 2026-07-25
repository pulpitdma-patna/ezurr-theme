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

export const metadata: Metadata = {
  // Absolute base for canonical + Open Graph URLs emitted per page.
  metadataBase: new URL(siteUrl),
  title: {
    default: "Ezurr — Play HQ · India's Ultimate Gaming Store",
    template: "%s · Ezurr",
  },
  description:
    "India's ultimate gaming store — games, consoles and gear at the lowest price, guaranteed.",
  alternates: { canonical: "/" },
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

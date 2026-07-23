import type { Metadata, Viewport } from "next";
import { Geist, Space_Mono } from "next/font/google";
import "./globals.css";
import { ApiAuthBoot } from "@/components/ApiAuthBoot";
import { ThemeAccent } from "@/components/ThemeAccent";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Ezurr — Play HQ · India's Ultimate Gaming Store",
    template: "%s · Ezurr",
  },
  description:
    "India's ultimate gaming store — games, consoles and gear at the lowest price, guaranteed.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${spaceMono.variable} min-h-screen antialiased`}>
        <ApiAuthBoot />
        <ThemeAccent />
        {children}
      </body>
    </html>
  );
}

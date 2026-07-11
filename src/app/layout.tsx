import type { Metadata, Viewport } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";
import { ThemeAccent } from "@/components/ThemeAccent";

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
      <body
        className={`${spaceMono.variable} min-h-screen antialiased`}
        style={
          {
            "--font-system":
              "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif",
          } as React.CSSProperties
        }
      >
        <ThemeAccent />
        {children}
      </body>
    </html>
  );
}

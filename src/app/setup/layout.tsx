import type { Metadata } from "next";

/**
 * page.tsx is a client component, and "use client" modules cannot export
 * metadata, so the route's title lives in this segment layout.
 */
export const metadata: Metadata = {
  title: "Set up your store",
  // A setup page must never be indexed: it is the one public route that can
  // create an administrator, and only for as long as the store is unclaimed.
  robots: { index: false, follow: false },
};

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return children;
}

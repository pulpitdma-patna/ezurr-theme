import type { Metadata } from "next";

/**
 * page.tsx is a client component (OTP state, router), and "use client" modules
 * cannot export metadata — so the route's title lives in this segment layout
 * instead. Without it /auth inherits the homepage title verbatim.
 */
export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to Ezurr with your mobile number to track orders, save a wishlist and check out faster.",
  alternates: { canonical: "/auth" },
  // Sign-in forms carry no content worth ranking, and an indexed one only
  // invites phishing lookalikes to outrank it.
  robots: { index: false, follow: true },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}

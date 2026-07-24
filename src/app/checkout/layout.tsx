import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pre-order checkout",
  // Transactional flow — keep it out of the index.
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}

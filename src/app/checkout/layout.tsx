import type { Metadata } from "next";

export const metadata: Metadata = {
  // Neutral: this layout covers the generic cart checkout as well as the
  // single-product and pre-order routes beneath it. Naming it "Pre-order
  // checkout" put that title on every ordinary order.
  title: "Checkout",
  // Transactional flow — keep it out of the index.
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

/**
 * page.tsx is a client component (it reads the cart store), and "use client"
 * modules cannot export metadata — so the route's title lives in this segment
 * layout instead. Without it /cart inherits the homepage title verbatim.
 */
export const metadata: Metadata = {
  title: "Your cart",
  description:
    "Review the games, consoles and accessories in your Ezurr cart before checking out.",
  alternates: { canonical: "/cart" },
  // A personal, per-visitor page: nothing here is worth a search result.
  robots: { index: false, follow: true },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}

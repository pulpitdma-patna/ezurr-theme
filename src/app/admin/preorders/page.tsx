"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Pre-order is a product attribute, not a section, so it is a filter on Products.
 *
 * This used to redirect with `?fulfilment=preorder` — one `l`, the theme's own
 * internal spelling — for a parameter the Products screen never read in either
 * spelling. So the command palette, the dashboard's pre-order alert and every
 * bookmark all landed on the full catalogue, unfiltered, with nothing on screen
 * saying why. The parameter now matches the column and the screen reads it.
 */
export default function AdminPreordersRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/products?fulfillment_type=preorder");
  }, [router]);

  return (
    <div className="ez-mono py-10 text-center text-[10px] uppercase tracking-[0.16em] text-[#86868B]">
      Pre-orders now live in Products — redirecting…
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Pre-order is a product attribute (`fulfillment_type`), not a section — the
 * catalog side now lives in the Products pre-order tab. The route stays so old
 * bookmarks and the dashboard's pre-order alert keep working.
 */
export default function AdminPreordersRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/products?fulfilment=preorder");
  }, [router]);

  return (
    <div className="ez-mono py-10 text-center text-[10px] uppercase tracking-[0.16em] text-[#86868B]">
      Pre-orders now live in Products — redirecting…
    </div>
  );
}

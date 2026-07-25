"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Inventory was folded into Products — stock is edited inline from the product
 * row now. The route stays so old bookmarks and the dashboard's low-stock alert
 * (`/admin/inventory?filter=low`) keep working.
 */
export default function AdminInventoryRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter") ?? searchParams.get("stock");

  useEffect(() => {
    const stock =
      filter === "low" || filter === "out" || filter === "in_stock" ? filter : null;
    router.replace(`/admin/products${stock ? `?stock=${stock}` : ""}`);
  }, [router, filter]);

  return (
    <div className="ez-mono py-10 text-center text-[10px] uppercase tracking-[0.16em] text-[#86868B]">
      Inventory now lives in Products — redirecting…
    </div>
  );
}

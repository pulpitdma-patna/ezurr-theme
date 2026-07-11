"use client";

import { useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/ui/ProductCard";
import { getCatalogProductKey } from "@/lib/productKey";
import type { CatalogProduct } from "@/lib/types";

type ProductGridProps = {
  products: CatalogProduct[];
  pageSize?: number;
};

export function ProductGrid({ products, pageSize = 12 }: ProductGridProps) {
  const [shown, setShown] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && shown < products.length) {
          setShown((s) => Math.min(s + pageSize, products.length));
        }
      },
      { rootMargin: "500px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [shown, products.length, pageSize]);

  const visible = products.slice(0, shown);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
        {visible.map((p, i) => (
          <ProductCard key={getCatalogProductKey(p, i)} {...p} />
        ))}
      </div>
      <div ref={sentinelRef} className="h-px" />
      {shown < products.length && (
        <div className="flex justify-center py-9 pb-2">
          <span className="ez-mono text-[11px] uppercase tracking-[0.16em] text-[#86868B]">
            Loading more…
          </span>
        </div>
      )}
    </>
  );
}

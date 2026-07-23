"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/ui/ProductCard";
import { getCatalogProductKey } from "@/lib/productKey";
import { api, isApiEnabled } from "@/lib/apiClient";
import { mapApiProductToCatalog } from "@/lib/apiMappers";
import type { CatalogProduct } from "@/lib/types";

export function RelatedProductsSection({
  categorySlug,
  excludeKey,
}: {
  categorySlug?: string;
  excludeKey?: string;
}) {
  const apiOn = isApiEnabled();
  const [products, setProducts] = useState<CatalogProduct[]>([]);

  useEffect(() => {
    if (!apiOn) return;
    let cancelled = false;
    void api
      .products(categorySlug ? { category: categorySlug } : undefined)
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res.data) ? res.data : [];
        setProducts(
          rows
            .filter((p) => p.key !== excludeKey)
            .slice(0, 4)
            .map(mapApiProductToCatalog),
        );
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [apiOn, categorySlug, excludeKey]);

  if (!apiOn || products.length === 0) return null;

  return (
    <section className="ez-page ez-section mx-auto">
      <div className="mb-6 flex flex-col gap-2 sm:mb-9 sm:gap-2.5">
        <div className="ez-mono text-[10px] uppercase tracking-[0.16em] text-[#86868B] sm:text-[11px]">
          You might also like
        </div>
        <h2 className="ez-h2 m-0 font-bold">Related products</h2>
        <p className="m-0 max-w-[520px] text-[14px] leading-relaxed text-[#6E6E73]">
          More products from the same category.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
        {products.map((p, i) => (
          <ProductCard
            key={getCatalogProductKey(p, i)}
            {...p}
            productKey={getCatalogProductKey(p, i)}
            variant="preorder"
          />
        ))}
      </div>
    </section>
  );
}

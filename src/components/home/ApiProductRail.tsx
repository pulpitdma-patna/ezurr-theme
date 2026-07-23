"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductRail } from "@/components/home/ProductRail";
import { api, isApiEnabled } from "@/lib/apiClient";
import { mapApiProductToCatalog } from "@/lib/apiMappers";
import { resolveProductRailProducts } from "@/lib/cms/resolveSectionProps";
import type { CatalogProduct } from "@/lib/types";
import type { ProductRailSource } from "@/lib/cms/types";

type ApiProductRailProps = {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  variant?: "product" | "preorder" | "square";
  /** CMS block props — source, limit, productKeys, etc. */
  railProps: Record<string, unknown>;
};

function sourceToCategory(source: ProductRailSource | string): string | undefined {
  if (source === "manual") return undefined;
  if (source === "games") return "games";
  if (source === "consoles") return "consoles";
  if (source === "accessories") return "accessories";
  if (source === "preorders") return "preorders";
  return String(source);
}

export function ApiProductRail({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
  variant = "product",
  railProps,
}: ApiProductRailProps) {
  const apiOn = isApiEnabled();
  const source = (railProps.source as ProductRailSource) || "games";
  const limit = Math.max(1, Number(railProps.limit) || 10);
  const keysKey = Array.isArray(railProps.productKeys)
    ? (railProps.productKeys as string[]).join("|")
    : "";

  const staticProducts = useMemo(
    () => resolveProductRailProducts(railProps),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stabilize on primitive rail fields
    [source, limit, keysKey],
  );

  const [products, setProducts] = useState<CatalogProduct[]>(
    apiOn ? [] : staticProducts,
  );
  const [loading, setLoading] = useState(apiOn);

  useEffect(() => {
    if (!apiOn) {
      setProducts(staticProducts);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        if (source === "manual") {
          const keys = keysKey ? keysKey.split("|").filter(Boolean) : [];
          if (keys.length === 0) {
            const res = await api.products({ per_page: Math.max(limit, 24) });
            const rows = Array.isArray(res.data) ? res.data : [];
            if (!cancelled) {
              setProducts(
                rows.length
                  ? rows.slice(0, limit).map(mapApiProductToCatalog)
                  : staticProducts,
              );
            }
            return;
          }
          const fetched = await Promise.all(
            keys.slice(0, limit).map((key) =>
              api.product(key).catch(() => null),
            ),
          );
          if (!cancelled) {
            const mapped = fetched
              .filter(Boolean)
              .map((p) => mapApiProductToCatalog(p!));
            setProducts(mapped.length ? mapped : staticProducts);
          }
          return;
        }

        const category = sourceToCategory(source);
        const res = await api.products(
          category
            ? { category, per_page: Math.max(limit, 24) }
            : { per_page: Math.max(limit, 24) },
        );
        const rows = Array.isArray(res.data) ? res.data : [];
        if (!cancelled) {
          setProducts(
            rows.length
              ? rows.slice(0, limit).map(mapApiProductToCatalog)
              : staticProducts,
          );
        }
      } catch {
        // Keep CMS/static shelf visible when API/CORS is unavailable.
        if (!cancelled) setProducts(staticProducts);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiOn, source, limit, keysKey, staticProducts]);

  if (apiOn && loading) {
    return (
      <section className="ez-page ez-section" aria-busy="true">
        <p className="ez-mono text-[10px] uppercase tracking-[0.14em] text-[#86868B]">
          Loading products…
        </p>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section className="ez-page ez-section">
        <p className="text-sm text-[#6E6E73]">No products for this rail yet.</p>
      </section>
    );
  }

  return (
    <ProductRail
      eyebrow={eyebrow}
      title={title}
      description={description}
      products={products}
      href={href}
      linkLabel={linkLabel}
      variant={variant}
    />
  );
}

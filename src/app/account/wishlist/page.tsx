"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ProductCard } from "@/components/ui/ProductCard";
import { SectionHeading } from "@/components/home/SectionHeading";
import { useAccountStore } from "@/hooks/useAccountStore";
import { getWishlistProducts, removeWishlistKey, catalogKeyForProduct } from "@/lib/accountStore";
import { formatInr } from "@/data/admin";
import { api, isApiEnabled, type ApiWishlistItem } from "@/lib/apiClient";
import { DEFAULT_IMG } from "@/lib/productResolve";

export default function WishlistPage() {
  const apiOn = isApiEnabled();
  const account = useAccountStore();
  const [remote, setRemote] = useState<ApiWishlistItem[]>([]);
  const [loading, setLoading] = useState(apiOn);

  const reload = useCallback(async () => {
    if (!apiOn) return;
    try {
      setRemote(await api.accountWishlist());
    } catch {
      /* keep prior */
    } finally {
      setLoading(false);
    }
  }, [apiOn]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // re-read the local store when it changes (mock path)
  void account.wishlistKeys;
  const localProducts = getWishlistProducts();

  const count = apiOn ? remote.length : localProducts.length;

  async function removeRemote(productKey: string) {
    setRemote((prev) => prev.filter((p) => p.productKey !== productKey)); // optimistic
    await api.removeWishlist(productKey).catch(() => reload());
  }

  return (
    <div>
      <SectionHeading
        titleAs="h1"
        eyebrow="Saved for later"
        title="Your wishlist."
        description={
          count
            ? `${count} product${count === 1 ? "" : "s"} waiting for your next setup.`
            : "Heart products on the storefront to save them here."
        }
      />

      {loading ? (
        <div className="mt-6 text-sm text-[#86868B]">Loading wishlist…</div>
      ) : count === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-black/[0.1] bg-[#F7F7F8] px-5 py-12 text-center">
          <p className="text-sm font-semibold">Wishlist is empty</p>
          <Link
            href="/"
            className="mt-4 inline-flex h-10 items-center rounded-full bg-[#1D1D1F] px-5 text-sm font-semibold text-white"
          >
            Browse catalog
          </Link>
        </div>
      ) : apiOn ? (
        <div className="mt-2 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {remote.map((item) => (
            <div key={item.productKey} className="relative">
              <ProductCard
                name={item.title}
                price={formatInr(item.price)}
                strike=""
                img={item.image_url || DEFAULT_IMG}
                brand={item.category_slug || "Ezurr"}
                productKey={item.productKey}
                href={`/products/${encodeURIComponent(item.productKey)}`}
                showWishlist={false}
              />
              <button
                type="button"
                aria-label={`Remove ${item.title} from wishlist`}
                onClick={() => void removeRemote(item.productKey)}
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm shadow-sm"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {localProducts.map((product, index) => {
            const key = catalogKeyForProduct(product, index);
            return (
              <div key={key} className="relative">
                <ProductCard {...product} productKey={key} showWishlist={false} />
                <button
                  type="button"
                  aria-label={`Remove ${product.name} from wishlist`}
                  onClick={() => removeWishlistKey(key)}
                  className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm shadow-sm"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

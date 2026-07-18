"use client";

import Link from "next/link";
import { ProductCard } from "@/components/ui/ProductCard";
import { SectionHeading } from "@/components/home/SectionHeading";
import { useAccountStore } from "@/hooks/useAccountStore";
import { getWishlistProducts, removeWishlistKey, catalogKeyForProduct } from "@/lib/accountStore";

export default function WishlistPage() {
  const account = useAccountStore();
  const products = getWishlistProducts();
  // re-read when store changes
  void account.wishlistKeys;

  return (
    <div>
      <SectionHeading
        titleAs="h1"
        eyebrow="Saved for later"
        title="Your wishlist."
        description={
          products.length
            ? `${products.length} product${products.length === 1 ? "" : "s"} waiting for your next setup.`
            : "Heart products on the storefront to save them here."
        }
      />

      {products.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-black/[0.1] bg-[#F7F7F8] px-5 py-12 text-center">
          <p className="text-sm font-semibold">Wishlist is empty</p>
          <Link
            href="/"
            className="mt-4 inline-flex h-10 items-center rounded-full bg-[#1D1D1F] px-5 text-sm font-semibold text-white"
          >
            Browse catalog
          </Link>
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product, index) => {
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

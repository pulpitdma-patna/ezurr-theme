import accessories from "@/data/accessories.json";
import games from "@/data/games.json";
import { ProductCard } from "@/components/ui/ProductCard";
import { SectionHeading } from "@/components/home/SectionHeading";
import { getCatalogProductKey } from "@/lib/productKey";
import type { CatalogProduct } from "@/lib/types";

const savedProducts = [
  ...(games as CatalogProduct[]).slice(0, 4),
  ...(accessories as CatalogProduct[]).slice(0, 4),
];

export default function WishlistPage() {
  return (
    <div>
      <SectionHeading
        titleAs="h1"
        eyebrow="Saved for later"
        title="Your wishlist."
        description="Eight products waiting for your next setup."
        controls={
          <span className="rounded-full bg-[#EAF6ED] px-3 py-2 text-xs font-semibold text-[#2D6B3C]">
            2 price drops
          </span>
        }
      />

      <div className="mt-2 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {savedProducts.map((product, index) => (
          <div key={getCatalogProductKey(product, index)} className="relative">
            <ProductCard {...product} />
            <button
              type="button"
              aria-label={`Remove ${product.name} from wishlist`}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm shadow-sm"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

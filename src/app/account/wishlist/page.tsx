import accessories from "@/data/accessories.json";
import games from "@/data/games.json";
import { ProductCard } from "@/components/ui/ProductCard";
import { getCatalogProductKey } from "@/lib/productKey";
import type { CatalogProduct } from "@/lib/types";

const savedProducts = [
  ...(games as CatalogProduct[]).slice(0, 4),
  ...(accessories as CatalogProduct[]).slice(0, 4),
];

export default function WishlistPage() {
  return (
    <div>
      <span className="ez-section-kicker">Saved for later</span>
      <h1 className="mt-3 text-[clamp(2.1rem,5vw,3.75rem)] font-semibold leading-none tracking-[-0.05em]">Your wishlist.</h1>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <p className="text-base text-[#6E6E73]">Eight products waiting for your next setup.</p>
        <span className="rounded-full bg-[#EAF6ED] px-3 py-2 text-xs font-semibold text-[#2D6B3C]">2 price drops</span>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {savedProducts.map((product, index) => (
          <div key={getCatalogProductKey(product, index)} className="relative">
            <ProductCard {...product} />
            <button
              type="button"
              aria-label={`Remove ${product.name} from wishlist`}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.07] bg-white/90 text-lg shadow-sm backdrop-blur"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

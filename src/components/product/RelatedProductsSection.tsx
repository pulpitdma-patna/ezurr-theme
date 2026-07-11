import preordersData from "@/data/preorders.json";
import { ProductCard } from "@/components/ui/ProductCard";
import { getCatalogProductKey } from "@/lib/productKey";
import type { CatalogProduct } from "@/lib/types";

const preorders = preordersData as CatalogProduct[];

const relatedProducts = preorders
  .filter((p) => !p.name.toLowerCase().includes("grand theft auto vi"))
  .slice(0, 4);

export function RelatedProductsSection() {
  return (
    <section className="ez-page ez-section mx-auto">
      <div className="mb-6 flex flex-col gap-2 sm:mb-9 sm:gap-2.5">
        <div className="ez-mono text-[10px] uppercase tracking-[0.16em] text-[#86868B] sm:text-[11px]">
          You might also like
        </div>
        <h2 className="ez-h2 m-0 font-bold">Related products</h2>
        <p className="m-0 max-w-[520px] text-[14px] leading-relaxed text-[#6E6E73]">
          More upcoming releases with the same minimum price guarantee.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
        {relatedProducts.map((p, i) => (
          <ProductCard key={getCatalogProductKey(p, i)} {...p} variant="preorder" />
        ))}
      </div>
    </section>
  );
}

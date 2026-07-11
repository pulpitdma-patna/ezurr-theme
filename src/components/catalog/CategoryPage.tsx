import Link from "next/link";
import type { NavKey } from "@/lib/theme";
import { MicroBar } from "@/components/layout/MicroBar";
import { Header } from "@/components/layout/Header";
import { FooterFull } from "@/components/layout/Footer";
import { ProductGrid } from "@/components/ui/ProductGrid";
import type { CatalogProduct } from "@/lib/types";

type CategoryPageProps = {
  active: NavKey;
  breadcrumb: string;
  title: string;
  count: number;
  description: string;
  products: CatalogProduct[];
};

export function CategoryPage({
  active,
  breadcrumb,
  title,
  count,
  description,
  products,
}: CategoryPageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MicroBar />
      <Header active={active} />
      <section className="ez-page w-full pt-10 sm:pt-14">
        <div className="flex flex-col gap-3">
          <div className="ez-mono flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.1em] text-[#86868B] sm:text-[10.5px]">
            <Link href="/" className="hover:text-[#1D1D1F]">
              Home
            </Link>
            <span>/</span>
            <span className="text-[#1D1D1F]">{breadcrumb}</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-4">
            <h1 className="ez-h1 m-0 font-bold">{title}</h1>
            <span className="ez-mono text-[11px] uppercase tracking-[0.1em] text-[#86868B] sm:text-xs">
              {count} TITLES
            </span>
          </div>
          <p className="ez-lead m-0 max-w-[520px] text-[#6E6E73]">{description}</p>
        </div>
      </section>
      <section className="ez-page w-full flex-1 pt-8 sm:pt-10">
        <ProductGrid products={products} />
      </section>
      <FooterFull />
    </div>
  );
}

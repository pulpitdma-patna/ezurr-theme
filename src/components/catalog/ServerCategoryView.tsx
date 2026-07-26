import { ApiCatalogCategoryPage } from "@/components/catalog/ApiCatalogCategoryPage";
import {
  SSR_CARD_COUNT,
  fetchCategory,
  fetchCategoryProducts,
} from "@/lib/catalog/categoryProducts";
import type { CatalogProduct } from "@/lib/types";

/**
 * One server-rendered category page, shared by /categories/[slug] and by the five
 * hand-written paths that keep their pre-CMS URLs.
 *
 * The point of sharing it is that /games stops being a different kind of page from
 * /categories/holiday-sale. Before this, the hand-written routes server-rendered a
 * checked-in JSON file — 22 products for a category holding 187 — and the heading
 * read "22 titles", a number the owner could see was wrong and could not change.
 * Google saw those 22 and nothing else.
 *
 * `fallbackProducts` is still accepted so a legacy route keeps its static file for
 * the case where the API is unreachable at build or request time.
 */
export async function ServerCategoryView({
  slug,
  title,
  description,
  breadcrumb,
  fallbackProducts = [],
}: {
  slug: string;
  /** Overrides the category's own name — the legacy routes have hand-written copy. */
  title?: string;
  description?: string;
  breadcrumb?: string;
  fallbackProducts?: CatalogProduct[];
}) {
  const [category, page] = await Promise.all([
    fetchCategory(slug),
    fetchCategoryProducts(slug, SSR_CARD_COUNT),
  ]);

  const label = title ?? category?.label ?? breadcrumb ?? slug;

  return (
    <ApiCatalogCategoryPage
      active={slug}
      breadcrumb={breadcrumb ?? label}
      title={label}
      description={
        description ??
        category?.description ??
        `Everything ${label} we stock, ready to ship across India.`
      }
      fallbackProducts={fallbackProducts}
      initialProducts={page.products}
      initialTotal={page.total}
      remainingPages={Math.max(0, page.lastPage - 1)}
      categorySlug={slug}
    />
  );
}

import { ApiCatalogCategoryPage } from "@/components/catalog/ApiCatalogCategoryPage";
import { PageRenderer } from "@/components/cms/PageRenderer";
import {
  SSR_CARD_COUNT,
  fetchCategory,
  fetchCategoryProducts,
  fetchCategoryTemplate,
} from "@/lib/catalog/categoryProducts";
import type { CatalogProduct } from "@/lib/types";

/**
 * One server-rendered category page, shared by /categories/[slug] and by the
 * hand-written paths that keep their pre-CMS URLs.
 *
 * Sharing it is the point: /games stops being a different kind of page from
 * /categories/holiday-sale. Before this, the hand-written routes server-rendered a
 * checked-in JSON file — 22 products for a category holding 187 — and the heading
 * read "22 titles", a number the owner could see was wrong and could not change.
 *
 * The layout comes from ONE CMS page (`category-template`), so an owner can put a
 * banner above every category grid or an assurance strip below it in the same
 * builder they use for the homepage, without a developer. Blocks above the
 * `category_grid` marker render above the grid; blocks below render below. What is
 * deliberately NOT in the template is anything per-category — a category's name,
 * blurb, image and search fields live on its own admin row, which is where someone
 * looking at "Holiday Sale" expects to edit them.
 *
 * A missing or unpublished template renders the grid alone, exactly as before it
 * existed, so the storefront cannot be taken down by a CMS mistake.
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
  const [category, page, template] = await Promise.all([
    fetchCategory(slug),
    fetchCategoryProducts(slug, SSR_CARD_COUNT),
    fetchCategoryTemplate(),
  ]);

  const label = title ?? category?.label ?? breadcrumb ?? slug;

  return (
    <>
      {template?.before.length ? (
        <PageRenderer sections={template.before} pageCss={template.customCss} />
      ) : null}

      <ApiCatalogCategoryPage
        active={slug}
        breadcrumb={breadcrumb ?? label}
        title={label}
        eyebrow={template?.eyebrow || undefined}
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

      {template?.after.length ? (
        <PageRenderer sections={template.after} />
      ) : null}
    </>
  );
}

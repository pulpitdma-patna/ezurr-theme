import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ApiCatalogCategoryPage } from "@/components/catalog/ApiCatalogCategoryPage";
import { categoryPath, isLegacyCategoryPath } from "@/lib/categoryRoutes";
import {
  SSR_CARD_COUNT,
  fetchCategory,
  fetchCategoryProducts,
} from "@/lib/catalog/categoryProducts";
import type { CatalogProduct } from "@/lib/types";

/**
 * A page for every category the owner says should have one.
 *
 * There were 33 categories and five storefront pages, all five hand-written. The
 * navigation controller's own comment described the consequence: "the storefront
 * has no catch-all category route, so linking an arbitrary slug would put a
 * guaranteed 404 in the menu. A genuinely new category needs a page before it can
 * appear in the menu — add its route here at the same time." A shop owner needed a
 * developer to edit PHP before customers could reach the category they had just
 * created. This is that catch-all route.
 *
 * Unlike the five it joins, the product grid is server-rendered. /brands/playstation
 * has 151 products and ships zero of them in its HTML; /games ships 22 from a
 * checked-in JSON file rather than the 187 it holds. A new category has no such
 * file, so without a server fetch it would ship an empty grid to Google forever.
 */

type Props = { params: Promise<{ slug: string }> };

/** Everything both the metadata and the body need, fetched once per request. */
async function load(slug: string) {
  const category = await fetchCategory(slug);
  // fetchCategory already refuses a deactivated category; `listable` is the
  // owner's own "this should have a page" switch, false for the whole Shopify
  // import so its ~25 junk collections never mint a URL.
  if (!category || !category.listable) return null;
  return category;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await load(slug);
  if (!category) return {};

  const canonical = categoryPath(slug);
  const title = category.metaTitle || category.label;
  const description =
    category.metaDescription ||
    category.description ||
    `Shop ${category.label} at Ezurr — genuine stock, lowest price guaranteed, fast delivery across India.`;

  return {
    title,
    description,
    // Mandatory: the root layout sets canonical "/" and every catalog route
    // overrides it, or the whole browsable catalogue claims to duplicate the
    // homepage.
    alternates: { canonical },
    // A category with nothing in it is a thin page. It still resolves — the owner
    // needs to see their own work — but it does not go to Google.
    ...(category.productCount === 0
      ? { robots: { index: false, follow: true } }
      : {}),
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
      ...(category.image ? { images: [{ url: category.image }] } : {}),
    },
  };
}

export default async function CategoryRoutePage({ params }: Props) {
  const { slug } = await params;

  // /games and the other four keep their pre-CMS URLs, so nothing ever serves 200
  // at two addresses. The middleware 308s these too; this is the belt to its
  // braces, and it also covers a direct RSC navigation.
  if (isLegacyCategoryPath(slug)) {
    permanentRedirect(categoryPath(slug));
  }

  const category = await load(slug);

  // An unknown, deactivated or page-less category is a genuine 404, not an empty
  // grid — otherwise every typo'd slug becomes a thin, indexable page. Same
  // reasoning as /brands/[slug].
  if (!category) notFound();

  const { products, total, lastPage } = await fetchCategoryProducts(
    slug,
    SSR_CARD_COUNT,
  );

  return (
    <ApiCatalogCategoryPage
      active={slug}
      breadcrumb={category.label}
      title={category.label}
      description={
        category.description ||
        `Everything ${category.label} we stock, ready to ship across India.`
      }
      fallbackProducts={[] as CatalogProduct[]}
      initialProducts={products}
      initialTotal={total}
      remainingPages={Math.max(0, lastPage - 1)}
      categorySlug={slug}
    />
  );
}

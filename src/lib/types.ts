/** A storefront ribbon (New, Pre-order, -24%, Best Price, Sold out). */
export type ProductBadge = { kind: string; label: string };

export type CatalogProduct = {
  /** Stable id when from API (product key/slug) */
  id?: string;
  img: string;
  brand: string;
  name: string;
  price: string;
  strike: string;
  badges?: ProductBadge[];
};

export type GameCardProduct = {
  /** Stable id when from API (product key/slug) */
  id?: string;
  title: string;
  tag: string;
  sub: string;
  bg: string;
  value: string;
  name: string;
  price: string;
};

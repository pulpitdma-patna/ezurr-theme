export type CatalogProduct = {
  /** Stable id when from API (product key/slug) */
  id?: string;
  img: string;
  brand: string;
  name: string;
  price: string;
  strike: string;
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

import { redirect } from "next/navigation";

/**
 * A whole page for adding one product, which the drawer on the products list
 * already did — with a third copy of the payload builder, its own defaults and
 * its own mirror of the digital/fulfilment toggle. Three copies of one form is
 * how the negative-price bug survived being fixed twice.
 *
 * `?new=1` opens the drawer on the list, so an existing bookmark still lands on
 * the thing it was for.
 */
export default function AdminNewProductRedirect() {
  redirect("/admin/products?new=1");
}

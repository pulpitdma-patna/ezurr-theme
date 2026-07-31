import { redirect } from "next/navigation";

/**
 * The code vault was its own destination, and its first control was a free-text
 * box labelled "Product key (e.g. psn-1000)". Loading a batch of codes meant
 * knowing and correctly typing a URL slug; a typo answered "Product not found"
 * only after fifty codes had been pasted. The screen also showed the codes for
 * every product at once, which is a list nobody has a question about.
 *
 * Game codes now live inside the product they belong to — open the product and
 * the panel is there, with the product already chosen. So that box cannot be
 * typed wrong, because it no longer exists.
 */
export default function AdminDigitalCodesRedirect() {
  redirect("/admin/products");
}

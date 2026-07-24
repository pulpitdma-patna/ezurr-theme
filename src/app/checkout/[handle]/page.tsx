import { CheckoutFlow } from "../CheckoutFlow";

// /checkout/<product-handle> → single-product buy-now (replaces the old ?key=).
export default async function CheckoutProductPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  return <CheckoutFlow productKey={decodeURIComponent(handle).trim()} />;
}

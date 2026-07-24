import { CheckoutFlow } from "./CheckoutFlow";

// Bare /checkout → checkout the whole cart (replaces the old ?cart=1).
export default function CheckoutPage() {
  return <CheckoutFlow />;
}

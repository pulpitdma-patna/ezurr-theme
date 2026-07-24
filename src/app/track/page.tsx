import type { Metadata } from "next";
import { Suspense } from "react";
import { TrackOrderForm } from "@/components/orders/TrackOrderForm";

export const metadata: Metadata = {
  title: "Track your order",
  robots: { index: false, follow: true },
};

export default function TrackPage() {
  return (
    <Suspense fallback={null}>
      <TrackOrderForm />
    </Suspense>
  );
}

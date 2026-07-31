"use client";

import { useRouter } from "next/navigation";
import { AdminPageTabs } from "@/components/admin/AdminPageTabs";

/**
 * Products, Categories, Brands and Photos, as four tabs of one screen.
 *
 * They were four nav entries. A destination earns a nav slot by being opened
 * without a reason, and nobody wakes up wanting to visit Brands — he goes there
 * because he is looking at a product. Putting them side by side also stops the
 * "which screen was that on" hunt that four sibling entries create.
 *
 * Same component the orders screen uses, so there is one tab pattern in the
 * admin rather than a second design system.
 */
const TABS = [
  { key: "products", label: "Products", href: "/admin/products" },
  { key: "categories", label: "Categories", href: "/admin/categories" },
  { key: "brands", label: "Brands", href: "/admin/brands" },
  { key: "media", label: "Photos", href: "/admin/media" },
];

export function CatalogTabs({ active }: { active: string }) {
  const router = useRouter();
  return (
    <AdminPageTabs
      ariaLabel="What you sell"
      tabs={TABS.map((t) => ({ key: t.key, label: t.label }))}
      active={active}
      onChange={(key) => {
        const tab = TABS.find((t) => t.key === key);
        if (tab && tab.key !== active) router.push(tab.href);
      }}
    />
  );
}

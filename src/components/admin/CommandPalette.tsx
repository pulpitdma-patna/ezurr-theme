"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminStore } from "@/hooks/useAdminStore";

type PaletteItem = {
  id: string;
  label: string;
  hint?: string;
  group: string;
  href: string;
};

const NAV_ITEMS: PaletteItem[] = [
  { id: "nav-dash", label: "Dashboard", group: "Pages", href: "/admin" },
  { id: "nav-analytics", label: "Analytics", group: "Pages", href: "/admin/analytics" },
  { id: "nav-reports", label: "Reports", group: "Pages", href: "/admin/reports" },
  { id: "nav-products", label: "Products", group: "Pages", href: "/admin/products" },
  { id: "nav-categories", label: "Categories", group: "Pages", href: "/admin/categories" },
  { id: "nav-brands", label: "Brands", group: "Pages", href: "/admin/brands" },
  { id: "nav-inventory", label: "Inventory", group: "Pages", href: "/admin/inventory" },
  { id: "nav-media", label: "Media library", group: "Pages", href: "/admin/media" },
  { id: "nav-orders", label: "Orders", group: "Pages", href: "/admin/orders" },
  { id: "nav-preorders", label: "Pre-orders", group: "Pages", href: "/admin/preorders" },
  { id: "nav-digital", label: "Digital codes", group: "Pages", href: "/admin/digital-codes" },
  { id: "nav-customers", label: "Customers", group: "Pages", href: "/admin/customers" },
  { id: "nav-coupons", label: "Coupons", group: "Pages", href: "/admin/coupons" },
  { id: "nav-platform", label: "Platform", group: "Pages", href: "/admin/platform" },
  { id: "nav-team", label: "Team", group: "Pages", href: "/admin/team" },
  { id: "nav-integrations", label: "Integrations", group: "Pages", href: "/admin/integrations" },
  { id: "nav-automations", label: "Automations", group: "Pages", href: "/admin/automations" },
  { id: "nav-activity", label: "Activity", group: "Pages", href: "/admin/activity" },
  { id: "nav-import", label: "Import tools", group: "Pages", href: "/admin/tools/import" },
  { id: "nav-settings", label: "Settings", group: "Pages", href: "/admin/settings" },
];

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const store = useAdminStore();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [wasOpen, setWasOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery("");
      setActive(0);
    }
  }

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const entityItems: PaletteItem[] = [
      ...store.orders.slice(0, 40).map((o) => ({
        id: `order-${o.id}`,
        label: o.id,
        hint: `${o.customerName} · ${o.status}`,
        group: "Orders",
        href: `/admin/orders/${o.id}`,
      })),
      ...store.products.slice(0, 40).map((p) => ({
        id: `product-${p.key}`,
        label: p.name,
        hint: p.sku,
        group: "Products",
        href: `/admin/products/${encodeURIComponent(p.key)}/edit`,
      })),
      ...store.customers.slice(0, 40).map((c) => ({
        id: `customer-${c.id}`,
        label: c.name,
        hint: c.mobile,
        group: "Customers",
        href: `/admin/customers/${c.id}`,
      })),
    ];
    const all = [...NAV_ITEMS, ...entityItems];
    if (!q) return all.slice(0, 24);
    return all
      .filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.hint?.toLowerCase().includes(q) ||
          item.group.toLowerCase().includes(q),
      )
      .slice(0, 24);
  }, [query, store.orders, store.products, store.customers]);

  const safeActive = Math.min(active, Math.max(items.length - 1, 0));

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      }
      if (event.key === "Enter" && items[safeActive]) {
        event.preventDefault();
        router.push(items[safeActive].href);
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, items, safeActive, onClose, router]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-label="Close command palette"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative mx-auto mt-[12vh] w-[min(560px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_24px_60px_rgba(17,17,19,0.22)]"
      >
        <div className="border-b border-black/[0.06] px-4 py-3">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Jump to pages, orders, products, customers…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-[#AEAEB2]"
            aria-controls={listId}
            aria-autocomplete="list"
          />
        </div>
        <ul id={listId} role="listbox" className="max-h-[360px] overflow-y-auto py-2">
          {items.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-[#86868B]">No matches</li>
          ) : (
            items.map((item, index) => (
              <li key={item.id} role="option" aria-selected={index === safeActive}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition ${
                    index === safeActive ? "bg-[#F5F5F7]" : "hover:bg-[#F7F7F8]"
                  }`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => {
                    router.push(item.href);
                    onClose();
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-[#1D1D1F]">{item.label}</span>
                    {item.hint ? (
                      <span className="block truncate text-xs text-[#86868B]">{item.hint}</span>
                    ) : null}
                  </span>
                  <span className="ez-mono shrink-0 text-[9px] uppercase tracking-[0.12em] text-[#AEAEB2]">
                    {item.group}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="border-t border-black/[0.06] px-4 py-2 ez-mono text-[9px] uppercase tracking-[0.12em] text-[#AEAEB2]">
          ↑↓ navigate · Enter open · Esc close
        </div>
      </div>
    </div>
  );
}

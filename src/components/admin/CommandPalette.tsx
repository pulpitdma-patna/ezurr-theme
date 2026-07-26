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
  // Inventory and pre-orders were folded into Products. Their old routes still
  // redirect for bookmarks' sake, but the palette links straight to the filtered
  // destination — searching "inventory" should land you there, not bounce.
  { id: "nav-inventory", label: "Inventory (in Products)", group: "Pages", href: "/admin/products?stock=low" },
  { id: "nav-media", label: "Media library", group: "Pages", href: "/admin/media" },
  { id: "nav-orders", label: "Orders", group: "Pages", href: "/admin/orders" },
  { id: "nav-preorders", label: "Pre-orders (in Products)", group: "Pages", href: "/admin/products?fulfillment=preorder" },
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
  { id: "nav-cms", label: "CMS Pages", group: "Online store", href: "/admin/cms" },
  { id: "nav-cms-home", label: "Homepage builder", group: "Online store", href: "/admin/cms/home" },
  { id: "nav-cms-code", label: "Custom code", group: "Online store", href: "/admin/cms/code" },
  { id: "nav-checkout-rules", label: "Checkout rules", group: "Online store", href: "/admin/checkout-rules" },
  { id: "nav-appearance", label: "Appearance", group: "Online store", href: "/admin/settings#appearance" },
];

export function CommandPalette({
  open,
  onClose,
  initialQuery = "",
}: {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
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
      setQuery(initialQuery);
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
    if (!q) return all.slice(0, 28);
    return all
      .filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.hint?.toLowerCase().includes(q) ||
          item.group.toLowerCase().includes(q),
      )
      .slice(0, 28);
  }, [query, store.orders, store.products, store.customers]);

  const grouped = useMemo(() => {
    const map = new Map<string, PaletteItem[]>();
    for (const item of items) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return Array.from(map.entries());
  }, [items]);

  const flatIndex = (groupIndex: number, itemIndex: number) => {
    let n = 0;
    for (let g = 0; g < groupIndex; g++) n += grouped[g][1].length;
    return n + itemIndex;
  };

  const safeActive = Math.min(active, Math.max(items.length - 1, 0));

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(t);
  }, [open]);

  // Keep the keyboard-highlighted option scrolled into view.
  useEffect(() => {
    if (!open) return;
    document
      .getElementById(`${listId}-opt-${safeActive}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, safeActive, listId]);

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
            role="combobox"
            aria-expanded={items.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={items.length > 0 ? `${listId}-opt-${safeActive}` : undefined}
          />
        </div>
        <div id={listId} role="listbox" className="max-h-[360px] overflow-y-auto py-1">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[#86868B]">No matches</p>
          ) : (
            grouped.map(([group, groupItems], gi) => (
              <div key={group}>
                <div className="sticky top-0 z-[1] bg-white/95 px-4 py-1.5 backdrop-blur-sm">
                  <span className="ez-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#AEAEB2]">
                    {group}
                  </span>
                </div>
                <ul>
                  {groupItems.map((item, ii) => {
                    const index = flatIndex(gi, ii);
                    return (
                      <li
                        key={item.id}
                        id={`${listId}-opt-${index}`}
                        role="option"
                        aria-selected={index === safeActive}
                      >
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
                            <span className="block truncate font-medium text-[#1D1D1F]">
                              {item.label}
                            </span>
                            {item.hint ? (
                              <span className="block truncate text-xs text-[#86868B]">
                                {item.hint}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-black/[0.06] px-4 py-2.5">
          <div className="flex flex-wrap gap-x-3 gap-y-1 ez-mono text-[9px] uppercase tracking-[0.12em] text-[#AEAEB2]">
            <span>
              <kbd className="rounded border border-black/[0.08] bg-[#F7F7F8] px-1 py-0.5 text-[#6E6E73]">
                ⌘K
              </kbd>{" "}
              open
            </span>
            <span>
              <kbd className="rounded border border-black/[0.08] bg-[#F7F7F8] px-1 py-0.5 text-[#6E6E73]">
                /
              </kbd>{" "}
              focus search
            </span>
            <span>
              <kbd className="rounded border border-black/[0.08] bg-[#F7F7F8] px-1 py-0.5 text-[#6E6E73]">
                g
              </kbd>{" "}
              then{" "}
              <kbd className="rounded border border-black/[0.08] bg-[#F7F7F8] px-1 py-0.5 text-[#6E6E73]">
                o
              </kbd>{" "}
              → orders
            </span>
            <span>↑↓ navigate · Enter open · Esc close</span>
          </div>
        </div>
      </div>
    </div>
  );
}

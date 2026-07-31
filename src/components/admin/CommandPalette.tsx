"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type PaletteItem = {
  id: string;
  label: string;
  hint?: string;
  group: string;
  href: string;
};

/**
 * Everything reachable, including what the sidebar no longer lists.
 *
 * The nav is now 14 entries; this is the safety net for the rest, and it is the
 * reason a screen can leave the sidebar without becoming typed-URL-only. It also
 * carries the OLD vocabulary as `hint` — the words are searched too, so a person
 * who learnt "Inventory", "Fulfillment" or "CMS" last month still finds the
 * screen after it was renamed to something a shopkeeper would say.
 */
const NAV_ITEMS: PaletteItem[] = [
  // The daily five, same as the sidebar.
  { id: "nav-dash", label: "Today", hint: "dashboard home", group: "Every day", href: "/admin" },
  { id: "nav-orders", label: "Orders", hint: "fulfilment shipping packing", group: "Every day", href: "/admin/orders" },
  { id: "nav-products", label: "Products", hint: "catalog inventory stock", group: "Every day", href: "/admin/products" },
  { id: "nav-customers", label: "Customers", hint: "buyers people", group: "Every day", href: "/admin/customers" },
  { id: "nav-reports", label: "Money", hint: "reports analytics revenue GST sales", group: "Every day", href: "/admin/reports" },

  { id: "nav-analytics", label: "Charts", hint: "analytics graphs trends", group: "Every day", href: "/admin/analytics" },

  // Reachable from a screen, not from the sidebar. Each is here so that nothing
  // is typed-URL-only.
  { id: "nav-orders-tosend", label: "Orders to pack", group: "Orders", href: "/admin/orders?tab=to-pack" },
  { id: "nav-orders-print", label: "Print labels and invoices", hint: "packing slip documents", group: "Orders", href: "/admin/orders/print" },
  { id: "nav-codes", label: "Game codes", hint: "digital codes vault keys", group: "Orders", href: "/admin/digital-codes" },

  { id: "nav-categories", label: "Categories", hint: "collections", group: "Products", href: "/admin/categories" },
  { id: "nav-brands", label: "Brands", hint: "makers publishers", group: "Products", href: "/admin/brands" },
  { id: "nav-lowstock", label: "Products running low", hint: "inventory stock", group: "Products", href: "/admin/products?stock=low" },
  { id: "nav-preorders", label: "Pre-orders", group: "Products", href: "/admin/preorders" },
  { id: "nav-import", label: "Import products from a file", hint: "csv bulk upload tools", group: "Products", href: "/admin/tools/import" },

  { id: "nav-coupons", label: "Discount codes", hint: "coupons offers promo", group: "Selling more", href: "/admin/coupons" },
  { id: "nav-automations", label: "Automatic messages", hint: "automations whatsapp sms flows", group: "Selling more", href: "/admin/automations" },
  { id: "nav-templates", label: "Message wording", hint: "templates msg91 dlt", group: "Selling more", href: "/admin/message-templates" },
  { id: "nav-recovery", label: "Baskets left behind", hint: "abandoned cart recovery", group: "Selling more", href: "/admin/recovery" },

  { id: "nav-cms", label: "Website", hint: "cms pages content builder", group: "Website", href: "/admin/cms" },
  { id: "nav-cms-home", label: "Home page", hint: "homepage builder landing", group: "Website", href: "/admin/cms/home" },
  { id: "nav-media", label: "Pictures", hint: "media library images uploads", group: "Website", href: "/admin/media" },
  { id: "nav-cms-code", label: "Custom code", hint: "css javascript head script", group: "Website", href: "/admin/cms/code" },

  { id: "nav-settings", label: "Shop settings", hint: "store address gst tax delivery", group: "Setup", href: "/admin/settings" },
  { id: "nav-checkout-rules", label: "Checkout rules", hint: "delivery charge free shipping cod", group: "Setup", href: "/admin/checkout-rules" },
  { id: "nav-integrations", label: "Other companies", hint: "integrations razorpay shiprocket msg91 shopify keys", group: "Setup", href: "/admin/integrations" },
  { id: "nav-team", label: "People", hint: "team staff users roles", group: "Setup", href: "/admin/team" },
  { id: "nav-system", label: "What's working", hint: "system health status queue", group: "Setup", href: "/admin/system" },
  { id: "nav-activity", label: "What changed", hint: "activity audit log history", group: "Setup", href: "/admin/activity" },
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

    // Pages only. This used to also list orders, products and customers — but
    // from the localStorage demo seed, never from the shop. Typing a real order
    // number found nothing, while a made-up one from the practice data appeared
    // looking entirely genuine, complete with an order number and a link. A
    // search that invents results is worse than one that admits it only jumps
    // between screens.
    //
    // Searching real records belongs here, and needs a server endpoint that can
    // answer across orders, products and customers at once. Until that exists,
    // this does the one thing it can do honestly.
    if (!q) return NAV_ITEMS.slice(0, 28);
    return NAV_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.hint?.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q),
    ).slice(0, 28);
  }, [query]);

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
            placeholder="Jump to a screen…"
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

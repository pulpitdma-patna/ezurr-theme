"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Navigation } from "@/lib/navigation";

/**
 * Mobile navigation as a real drawer with accordion categories — not the
 * desktop mega panel reflowed, which produces an unusable wall of links on a
 * phone. Reachable one-handed: the close control and the accordions sit within
 * thumb range rather than at the top of a long scroll.
 */
export function MobileNavDrawer({
  open,
  onClose,
  nav,
  onOpenSearch,
}: {
  open: boolean;
  onClose: () => void;
  nav: Navigation;
  onOpenSearch: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  // Portalled to <body>. The header carries backdrop-blur, and backdrop-filter
  // establishes a containing block for fixed-position descendants — so
  // `fixed inset-0` rendered inside the header resolved against the 56px bar
  // instead of the viewport, clipping the whole drawer out of view on every
  // screen below lg.
  //
  // No mounted-state dance is needed: `open` is false on the server and on the
  // first client render, so this subtree never participates in hydration.

  useEffect(() => {
    if (!open) {
      restoreTo.current?.focus?.();
      return;
    }
    restoreTo.current = document.activeElement as HTMLElement;
    // Lock the page behind the drawer so the body doesn't scroll under it.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => panelRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[65] bg-black/30 lg:hidden"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="ml-auto flex h-full w-[min(22rem,88vw)] flex-col bg-white shadow-[-8px_0_40px_rgba(17,17,19,0.18)] outline-none"
      >
        <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
          <span className="ez-mono text-[10px] uppercase tracking-[0.16em] text-[#86868B]">Menu</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid h-9 w-9 place-items-center rounded-full border border-black/[0.08] text-[#6E6E73]"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSearch();
            }}
            className="mb-3 flex w-full items-center gap-2.5 rounded-xl border border-black/[0.08] bg-[#FAFAFB] px-4 py-3 text-left text-[14px] text-[#6E6E73]"
          >
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden>
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
              <path d="m13.5 13.5 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Search products
          </button>

          <ul className="m-0 list-none p-0">
            {nav.categories.map((cat) => {
              const hasChildren = cat.brands.length > 0;
              const isOpen = expanded === cat.slug;
              return (
                <li key={cat.slug} className="border-b border-black/[0.05]">
                  <div className="flex items-center">
                    <Link
                      href={cat.href}
                      onClick={onClose}
                      className="flex-1 py-3.5 pl-2 text-[15px] font-semibold text-[#1D1D1F] no-underline"
                    >
                      {cat.label}
                      {cat.count ? (
                        <span className="ez-mono ml-2 text-[11px] font-normal text-[#86868B]">
                          {cat.count}
                        </span>
                      ) : null}
                    </Link>
                    {hasChildren ? (
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : cat.slug)}
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? "Collapse" : "Expand"} ${cat.label} brands`}
                        className="grid h-11 w-11 shrink-0 place-items-center text-[#86868B]"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          aria-hidden
                          className={`transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
                        >
                          <path d="M2 4.5 6 8.5 10 4.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                        </svg>
                      </button>
                    ) : null}
                  </div>

                  {isOpen ? (
                    <ul className="m-0 list-none pb-2 pl-4">
                      {cat.brands.map((b) => (
                        <li key={b.slug}>
                          <Link
                            href={b.href}
                            onClick={onClose}
                            className="flex items-center justify-between py-2.5 pr-2 text-[14px] text-[#424245] no-underline"
                          >
                            <span>{b.name}</span>
                            <span className="ez-mono text-[11px] text-[#86868B]">{b.count}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex flex-col gap-1">
            {[
              { label: "Pre-orders", href: "/preorders" },
              { label: "All brands", href: "/brands" },
              { label: "Track an order", href: "/track" },
              { label: "My account", href: "/account" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={onClose}
                className="rounded-lg px-2 py-2.5 text-[14px] font-medium text-[#424245] no-underline"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

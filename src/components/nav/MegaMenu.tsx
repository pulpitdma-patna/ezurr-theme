"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { NavCategory } from "@/lib/navigation";

/** Open after a short dwell so brushing past a trigger doesn't flash the panel. */
const OPEN_DELAY = 120;
/**
 * Close slowly. The user's mouse travels diagonally from the trigger to the
 * panel contents, briefly leaving both — closing instantly there is the single
 * most common mega-menu defect.
 */
const CLOSE_DELAY = 250;

type Props = {
  categories: NavCategory[];
  activeKey?: string;
};

export function MegaMenu({ categories, activeKey }: Props) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const navRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();

  const clearTimers = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }, []);

  // Never leave a timer running after unmount — it would setState on a dead tree.
  useEffect(() => clearTimers, [clearTimers]);

  const scheduleOpen = useCallback(
    (slug: string) => {
      clearTimers();
      openTimer.current = setTimeout(() => setOpenSlug(slug), OPEN_DELAY);
    },
    [clearTimers],
  );

  const scheduleClose = useCallback(() => {
    clearTimers();
    closeTimer.current = setTimeout(() => setOpenSlug(null), CLOSE_DELAY);
  }, [clearTimers]);

  const closeNow = useCallback(
    (returnFocusTo?: string) => {
      clearTimers();
      setOpenSlug(null);
      if (returnFocusTo) triggerRefs.current[returnFocusTo]?.focus();
    },
    [clearTimers],
  );

  // Escape closes from anywhere inside, returning focus to the trigger that
  // opened the panel — otherwise focus is stranded on a hidden element.
  useEffect(() => {
    if (!openSlug) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeNow(openSlug ?? undefined);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openSlug, closeNow]);

  // Tabbing out of the whole nav closes it. Checked on the next tick because
  // relatedTarget is unreliable mid-transition between children.
  const handleBlurCapture = useCallback(() => {
    window.setTimeout(() => {
      if (navRef.current && !navRef.current.contains(document.activeElement)) {
        setOpenSlug(null);
      }
    }, 0);
  }, []);

  // Left/Right move between top-level items, matching the menubar pattern.
  const handleTriggerKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number, slug: string, hasPanel: boolean) => {
      const last = categories.length - 1;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const next =
          e.key === "ArrowRight"
            ? index === last
              ? 0
              : index + 1
            : index === 0
              ? last
              : index - 1;
        triggerRefs.current[categories[next].slug]?.focus();
        return;
      }
      if (!hasPanel) return;
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        clearTimers();
        setOpenSlug((cur) => (cur === slug ? null : slug));
      }
    },
    [categories, clearTimers],
  );

  return (
    <div
      ref={navRef}
      className="hidden lg:flex lg:items-center lg:gap-1"
      onBlurCapture={handleBlurCapture}
      onMouseLeave={scheduleClose}
    >
      {categories.map((cat, index) => {
        // A category with no brands has nothing to put in a panel — render a
        // plain link rather than a dropdown that opens onto emptiness.
        const hasPanel = cat.brands.length > 0 || cat.highlights.length > 0;
        const isOpen = openSlug === cat.slug;
        const isActive = activeKey === cat.slug;

        if (!hasPanel) {
          return (
            <Link
              key={cat.slug}
              href={cat.href}
              className={`rounded-lg px-3 py-2 text-[14px] font-semibold no-underline transition ${
                isActive ? "text-[var(--ez-fg)]" : "text-[#6E6E73] hover:text-[var(--ez-fg)]"
              }`}
            >
              {cat.label}
            </Link>
          );
        }

        return (
          <div
            key={cat.slug}
            className="relative"
            onMouseEnter={() => scheduleOpen(cat.slug)}
          >
            <button
              type="button"
              ref={(el) => {
                triggerRefs.current[cat.slug] = el;
              }}
              // Focus opens too: a hover-only menu is unusable by keyboard.
              onFocus={() => scheduleOpen(cat.slug)}
              onKeyDown={(e) => handleTriggerKeyDown(e, index, cat.slug, hasPanel)}
              aria-expanded={isOpen}
              aria-controls={`${panelId}-${cat.slug}`}
              aria-haspopup="true"
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-[14px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] ${
                isActive || isOpen
                  ? "text-[var(--ez-fg)]"
                  : "text-[#6E6E73] hover:text-[var(--ez-fg)]"
              }`}
            >
              {cat.label}
              <svg
                width="10"
                height="10"
                viewBox="0 0 12 12"
                aria-hidden
                className={`transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
              >
                <path d="M2 4.5 6 8.5 10 4.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              </svg>
            </button>

            {isOpen ? (
              <div
                id={`${panelId}-${cat.slug}`}
                role="group"
                aria-label={`${cat.label} menu`}
                onMouseEnter={clearTimers}
                className="ez-mega absolute left-0 top-full z-50 mt-2 w-[min(46rem,calc(100vw-3rem))] rounded-[18px] border border-black/[0.07] bg-white p-6 shadow-[0_20px_60px_rgba(17,17,19,0.14)]"
              >
                <div className="grid grid-cols-[1.3fr_1fr] gap-8">
                  <div>
                    <p className="ez-mono m-0 mb-3 text-[10px] uppercase tracking-[0.16em] text-[#86868B]">
                      Shop by brand
                    </p>
                    <ul className="m-0 grid list-none grid-cols-2 gap-x-6 gap-y-1 p-0">
                      {cat.brands.map((brand) => (
                        <li key={brand.slug}>
                          <Link
                            href={brand.href}
                            onClick={() => closeNow()}
                            className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-[13.5px] font-medium text-[#1D1D1F] no-underline transition hover:bg-[#F5F5F7]"
                          >
                            <span>{brand.name}</span>
                            <span className="ez-mono text-[11px] text-[#86868B]">{brand.count}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="ez-mono m-0 mb-3 text-[10px] uppercase tracking-[0.16em] text-[#86868B]">
                      Quick links
                    </p>
                    <ul className="m-0 flex list-none flex-col gap-1 p-0">
                      {cat.highlights.map((h) => (
                        <li key={h.label}>
                          <Link
                            href={h.href}
                            onClick={() => closeNow()}
                            className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-[13.5px] font-medium text-[#1D1D1F] no-underline transition hover:bg-[#F5F5F7]"
                          >
                            <span>{h.label}</span>
                            {typeof h.count === "number" ? (
                              <span className="ez-mono text-[11px] text-[#86868B]">{h.count}</span>
                            ) : null}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-5 border-t border-black/[0.06] pt-4">
                  <Link
                    href={cat.href}
                    onClick={() => closeNow()}
                    className="text-[13.5px] font-semibold text-[var(--ez-fg)] no-underline hover:underline"
                  >
                    All {cat.count} {cat.label.toLowerCase()} →
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

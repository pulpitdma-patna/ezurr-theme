"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { api, isApiEnabled } from "@/lib/apiClient";
import type { Navigation } from "@/lib/navigation";

const RECENT_KEY = "ezurr-recent-searches";
const MAX_RECENT = 5;

type Row = { id: string; label: string; sub?: string; href: string; group: string };

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((r) => typeof r === "string").slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function pushRecent(term: string) {
  if (typeof window === "undefined" || !term.trim()) return;
  const next = [term, ...readRecent().filter((r) => r !== term)].slice(0, MAX_RECENT);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota — recents are a nicety, never a hard failure */
  }
}

/**
 * Mounted only while open (see Header) — so every launch starts from fresh
 * state without an effect resetting it, which would cause a cascading render.
 */
export function SearchPalette({ onClose, nav }: { onClose: () => void; nav: Navigation }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Row[]>([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  // Portalled for the same reason as the mobile drawer: the header's
  // backdrop-blur makes it a containing block, so `fixed inset-0` here was
  // sized to the header bar rather than the viewport. This component is only
  // mounted once the palette is opened, so it never runs on the server.
  // Focus is restored here on close so keyboard users land back where they were.
  const restoreTo = useRef<HTMLElement | null>(null);

  // Static destinations are always available, even with an empty query — a
  // palette that shows nothing until you type feels broken.
  const jumpTo = useMemo<Row[]>(() => {
    const rows: Row[] = nav.categories.map((c) => ({
      id: `cat-${c.slug}`,
      label: c.label,
      sub: c.count ? `${c.count} products` : undefined,
      href: c.href,
      group: "Browse",
    }));
    rows.push(
      ...nav.brands.slice(0, 6).map((b) => ({
        id: `brand-${b.slug}`,
        label: b.name,
        sub: `${b.count} products`,
        href: b.href,
        group: "Brands",
      })),
    );
    rows.push(
      { id: "go-preorders", label: "Pre-orders", href: "/preorders", group: "Pages" },
      { id: "go-track", label: "Track an order", href: "/track", group: "Pages" },
      { id: "go-cart", label: "Cart", href: "/cart", group: "Pages" },
      { id: "go-account", label: "My account", href: "/account", group: "Pages" },
    );
    return rows;
  }, [nav]);

  const recent = useMemo<Row[]>(
    () =>
      query
        ? []
        : readRecent().map((term, i) => ({
            id: `recent-${i}`,
            label: term,
            href: `/search?q=${encodeURIComponent(term)}`,
            group: "Recent",
          })),
    [query],
  );

  // Capture the launching element on mount and restore focus on unmount, so a
  // keyboard user lands back where they were instead of at the top of the page.
  useEffect(() => {
    restoreTo.current = document.activeElement as HTMLElement;
    // Focus after paint so the dialog exists before focus moves into it.
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(t);
      restoreTo.current?.focus?.();
    };
  }, []);

  // Debounced product search — one request per pause, not per keystroke.
  useEffect(() => {
    // No state write on the empty-query path: `rows` below simply ignores
    // stale results when the query is blank, so there is nothing to clear.
    if (!query.trim() || !isApiEnabled()) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      // Flagged inside the timer, not synchronously: the spinner should appear
      // when a request actually starts, not on every keystroke.
      setLoading(true);
      void api
        .products({ q: query.trim(), per_page: 6 })
        .then((res) => {
          if (cancelled) return;
          setResults(
            (res.data ?? []).map((p) => ({
              id: `p-${p.key}`,
              label: p.title,
              sub: p.price ? `₹${Number(p.price).toLocaleString("en-IN")}` : undefined,
              href: `/products/${p.key}`,
              group: "Products",
            })),
          );
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query]);

  const rows = useMemo(() => {
    if (query.trim()) {
      const q = query.toLowerCase();
      const matches = jumpTo.filter((r) => r.label.toLowerCase().includes(q)).slice(0, 5);
      return [...results, ...matches];
    }
    return [...recent, ...jumpTo];
  }, [query, results, jumpTo, recent]);

  // Keep the highlight inside the list as results change, adjusted during
  // render rather than in an effect (an effect here re-renders every keystroke).
  const [seenLen, setSeenLen] = useState(rows.length);
  if (seenLen !== rows.length) {
    setSeenLen(rows.length);
    if (cursor !== 0) setCursor(0);
  }

  const go = useCallback(
    (row: Row | undefined) => {
      if (!row) return;
      if (row.group === "Products" || row.group === "Recent") pushRecent(query.trim() || row.label);
      onClose();
      router.push(row.href);
    },
    [onClose, router, query],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => (rows.length ? (c + 1) % rows.length : 0));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => (rows.length ? (c - 1 + rows.length) % rows.length : 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (rows.length) go(rows[cursor]);
        else if (query.trim()) {
          pushRecent(query.trim());
          onClose();
          router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        }
      }
    },
    [rows, cursor, go, onClose, query, router],
  );

  let lastGroup = "";

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/25 px-4 pt-[12vh] backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search Ezurr"
        onKeyDown={onKeyDown}
        className="w-full max-w-[560px] overflow-hidden rounded-[18px] border border-black/[0.08] bg-white shadow-[0_24px_80px_rgba(17,17,19,0.24)]"
      >
        <div className="flex items-center gap-3 border-b border-black/[0.06] px-4">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
            <circle cx="9" cy="9" r="6" stroke="#86868B" strokeWidth="1.8" />
            <path d="m13.5 13.5 3 3" stroke="#86868B" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${nav.totalProducts || ""} products, brands, pages…`.replace("  ", " ")}
            aria-label="Search"
            className="h-14 w-full border-none bg-transparent text-[15px] outline-none placeholder:text-[#86868B]"
          />
          <kbd className="ez-mono hidden shrink-0 rounded border border-black/[0.08] px-1.5 py-0.5 text-[10px] text-[#86868B] sm:block">
            ESC
          </kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {loading && rows.length === 0 ? (
            <p className="m-0 px-3 py-6 text-center text-[13px] text-[#86868B]">Searching…</p>
          ) : rows.length === 0 ? (
            <p className="m-0 px-3 py-6 text-center text-[13px] text-[#86868B]">
              No matches. Press Enter to search all products.
            </p>
          ) : (
            <ul className="m-0 list-none p-0" role="listbox" aria-label="Results">
              {rows.map((row, i) => {
                const showGroup = row.group !== lastGroup;
                lastGroup = row.group;
                return (
                  <li key={row.id}>
                    {showGroup ? (
                      <p className="ez-mono m-0 px-3 pb-1 pt-3 text-[9px] uppercase tracking-[0.16em] text-[#86868B]">
                        {row.group}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === cursor}
                      onMouseEnter={() => setCursor(i)}
                      onClick={() => go(row)}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[14px] transition ${
                        i === cursor ? "bg-[#F0F0F2] text-[#1D1D1F]" : "text-[#424245]"
                      }`}
                    >
                      <span className="truncate font-medium">{row.label}</span>
                      {row.sub ? (
                        <span className="ez-mono shrink-0 text-[11px] text-[#86868B]">{row.sub}</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

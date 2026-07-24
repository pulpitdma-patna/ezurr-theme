"use client";

import type { ReactNode } from "react";

type ListToolbarProps = {
  resultLabel?: string;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  filters?: ReactNode;
  actions?: ReactNode;
  bulkBar?: ReactNode;
};

/** Compact search + filters + result count on one row (#FAFAFB bar). */
export function ListToolbar({
  resultLabel,
  search,
  filters,
  actions,
  bulkBar,
}: ListToolbarProps) {
  return (
    <div className="mb-4">
      <div className="flex flex-col gap-2.5 rounded-xl border border-black/[0.06] bg-[#FAFAFB] px-3 py-2.5 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {search ? (
            <div className="relative min-w-0 flex-1 lg:max-w-sm">
              <span
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#AEAEB2]"
                aria-hidden
              >
                <SearchGlyph />
              </span>
              <input
                type="search"
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                placeholder={search.placeholder ?? "Search…"}
                className="h-9 w-full rounded-lg border border-black/[0.07] bg-white pl-8 pr-3 text-sm shadow-[0_1px_2px_rgba(17,17,19,0.03)] outline-none placeholder:text-[#AEAEB2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
              />
            </div>
          ) : null}
          {resultLabel ? (
            <span className="hidden shrink-0 ez-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[#86868B] sm:inline">
              {resultLabel}
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {filters}
          {actions}
        </div>
      </div>
      {bulkBar ? <div className="mt-3">{bulkBar}</div> : null}
    </div>
  );
}

function SearchGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9.2 9.2L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

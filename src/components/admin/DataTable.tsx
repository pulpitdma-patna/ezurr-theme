"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  className?: string;
  hideOnMobile?: boolean;
  sortable?: boolean;
  render: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selectedKeys?: string[];
  onToggleRow?: (key: string) => void;
  onToggleAll?: () => void;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  bulkBar?: ReactNode;
  loading?: boolean;
  skeletonRows?: number;
  density?: "compact" | "comfortable";
};

const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = "No results.",
  emptyAction,
  onRowClick,
  selectable,
  selectedKeys = [],
  onToggleRow,
  onToggleAll,
  sortKey,
  sortDir,
  onSort,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  onPageChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onPageSizeChange,
  bulkBar,
  loading,
  skeletonRows = 6,
  density = "comfortable",
}: DataTableProps<T>) {
  const selectAllRef = useRef<HTMLInputElement>(null);
  const cellPad = density === "compact" ? "px-2.5 py-1.5 sm:px-3" : "px-3 py-2.5 sm:px-4";
  const headPad = density === "compact" ? "px-2.5 py-1.5 sm:px-3" : "px-3 py-2.5 sm:px-4";
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  const pageKeys = pageRows.map(rowKey);
  const selectedOnPage = pageKeys.filter((key) => selectedKeys.includes(key));
  const allSelected = pageKeys.length > 0 && selectedOnPage.length === pageKeys.length;
  const someSelected = selectedOnPage.length > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const showEmpty = !loading && total === 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_8px_30px_rgba(17,17,19,0.04)]">
      {bulkBar && selectedKeys.length > 0 ? (
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-black/[0.08] bg-[#1D1D1F] px-3 py-2 text-white">
          {bulkBar}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-black/[0.06] bg-[#FAFAFB]">
              {selectable ? (
                <th className={`w-10 ${headPad}`}>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => onToggleAll?.()}
                    aria-label="Select all on page"
                    className="accent-[#1D1D1F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
                  />
                </th>
              ) : null}
              {columns.map((column) => {
                const active = sortKey === column.key;
                return (
                  <th
                    key={column.key}
                    className={`ez-mono ${headPad} text-[9px] font-medium uppercase tracking-[0.12em] text-[#86868B] ${
                      column.hideOnMobile ? "hidden md:table-cell" : ""
                    } ${column.className ?? ""}`}
                  >
                    {column.sortable && onSort ? (
                      <button
                        type="button"
                        onClick={() => onSort(column.key)}
                        className="inline-flex items-center gap-1 hover:text-[#1D1D1F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
                      >
                        {column.header}
                        <span className="text-[8px] opacity-60" aria-hidden>
                          {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: skeletonRows }).map((_, index) => (
                  <tr key={`sk-${index}`} className="border-b border-black/[0.04]">
                    {selectable ? (
                      <td className={cellPad}>
                        <div className="h-3.5 w-3.5 animate-pulse rounded bg-[#E8E8ED]" />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`${cellPad} ${
                          column.hideOnMobile ? "hidden md:table-cell" : ""
                        }`}
                      >
                        <div className="h-3 max-w-[12rem] animate-pulse rounded bg-[#E8E8ED]" />
                      </td>
                    ))}
                  </tr>
                ))
              : null}

            {showEmpty ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-2 py-2"
                >
                  <AdminEmptyState
                    compact
                    title={emptyMessage}
                    action={emptyAction}
                  />
                </td>
              </tr>
            ) : null}

            {!loading &&
              pageRows.map((row) => {
                const key = rowKey(row);
                const selected = selectedKeys.includes(key);
                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`border-b border-black/[0.04] last:border-b-0 ${
                      onRowClick ? "cursor-pointer hover:bg-[#F5F5F7]" : ""
                    } ${selected ? "bg-[#F0F0F2]/80" : ""}`}
                  >
                    {selectable ? (
                      <td className={cellPad} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => onToggleRow?.(key)}
                          aria-label="Select row"
                          className="accent-[#1D1D1F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
                        />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`${cellPad} text-sm text-[#1D1D1F] ${
                          column.hideOnMobile ? "hidden md:table-cell" : ""
                        } ${column.className ?? ""}`}
                      >
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {!loading && total > 0 && onPageChange ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] bg-[#FAFAFB]/80 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="ez-mono text-[10px] uppercase tracking-[0.12em] text-[#86868B]">
              {start + 1}–{Math.min(start + pageSize, total)} of {total}
            </span>
            {onPageSizeChange ? (
              <label className="flex items-center gap-2 text-xs text-[#6E6E73]">
                <span className="ez-mono text-[9px] uppercase tracking-[0.12em] text-[#86868B]">
                  Per page
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  className="h-8 rounded-lg border border-black/[0.08] bg-white px-2 text-xs font-semibold text-[#1D1D1F] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => onPageChange(safePage - 1)}
              className="h-8 rounded-lg border border-black/10 bg-white px-3 text-[11px] font-semibold disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
            >
              Prev
            </button>
            <span className="ez-mono min-w-[3rem] text-center text-[10px] text-[#86868B]">
              {safePage}/{totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => onPageChange(safePage + 1)}
              className="h-8 rounded-lg border border-black/10 bg-white px-3 text-[11px] font-semibold disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

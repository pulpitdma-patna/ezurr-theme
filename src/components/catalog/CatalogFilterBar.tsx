"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CATALOG_SORT_OPTIONS,
  CONDITION_LABELS,
  countActiveFilters,
  deriveConditions,
  derivePriceRanges,
  type CatalogAvailability,
  type CatalogFilterState,
  type CatalogSortOption,
  type ProductCondition,
} from "@/lib/catalogFilters";
import type { CatalogProduct } from "@/lib/types";

type CatalogFilterBarProps = {
  products: CatalogProduct[];
  filters: CatalogFilterState;
  sort: CatalogSortOption;
  brands: string[];
  filteredCount: number;
  totalCount: number;
  onFiltersChange: (next: CatalogFilterState) => void;
  onSortChange: (next: CatalogSortOption) => void;
  onClearFilters: () => void;
  /** Compact header placement — no card wrapper or duplicate title count. */
  embedded?: boolean;
  className?: string;
  chipsClassName?: string;
};

const triggerBase =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border bg-white px-3 text-[13px] font-medium tracking-[-0.01em] text-[#1D1D1F] transition duration-150 hover:border-black/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/[0.08]";

const triggerIdle = "border-black/[0.08]";
const triggerActive = "border-[#1D1D1F] bg-[#FAFAFA]";

const menuPanel =
  "absolute z-50 mt-1.5 min-w-[196px] overflow-hidden rounded-xl border border-black/[0.08] bg-white py-1 shadow-[0_12px_40px_rgba(17,17,19,0.1)]";

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className={className ?? "h-3 w-3 text-[#86868B]"}
      fill="none"
    >
      <path
        d="M2.5 4.5 6 8l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function useDropdownMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return { open, setOpen, rootRef, close, toggle };
}

function FilterDropdown({
  label,
  active,
  buttonLabel,
  children,
  align = "left",
}: {
  label: string;
  active: boolean;
  buttonLabel: string;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
}) {
  const { open, rootRef, close, toggle } = useDropdownMenu();
  const menuId = useId();

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={menuId}
        onClick={toggle}
        className={`${triggerBase} ${active ? triggerActive : triggerIdle}`}
      >
        <span className="sr-only">{label}</span>
        <span aria-hidden>{buttonLabel}</span>
        <ChevronDown
          className={`h-3 w-3 text-[#86868B] transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div
          id={menuId}
          role="listbox"
          aria-label={label}
          className={`${menuPanel} ${align === "right" ? "right-0" : "left-0"}`}
        >
          {children(close)}
        </div>
      ) : null}
    </div>
  );
}

function MenuOption({
  selected,
  onSelect,
  children,
  multi = false,
}: {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] tracking-[-0.01em] transition hover:bg-black/[0.03] ${
        selected ? "font-medium text-[#1D1D1F]" : "text-[#424245]"
      }`}
    >
      {multi ? (
        <span
          aria-hidden
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
            selected
              ? "border-[#1D1D1F] bg-[#1D1D1F] text-white"
              : "border-black/[0.12] bg-white"
          }`}
        >
          {selected ? (
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
              <path
                d="M2.5 6.5 5 9l4.5-5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </span>
      ) : (
        <span
          aria-hidden
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            selected ? "bg-[#1D1D1F]" : "bg-transparent"
          }`}
        />
      )}
      {children}
    </button>
  );
}

function BrandFilterDropdown({
  brands,
  selected,
  onChange,
}: {
  brands: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const count = selected.length;
  const buttonLabel = count === 0 ? "Brand" : `Brand · ${count}`;

  return (
    <FilterDropdown label="Filter by brand" active={count > 0} buttonLabel={buttonLabel}>
      {() => (
        <>
          {brands.map((brand) => {
            const checked = selected.includes(brand);
            return (
              <MenuOption
                key={brand}
                multi
                selected={checked}
                onSelect={() => {
                  onChange(
                    checked
                      ? selected.filter((b) => b !== brand)
                      : [...selected, brand],
                  );
                }}
              >
                {brand}
              </MenuOption>
            );
          })}
          {count > 0 ? (
            <>
              <div className="my-1 border-t border-black/[0.06]" />
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full px-3 py-2 text-left text-[12px] font-medium text-[#86868B] transition hover:bg-black/[0.03] hover:text-[#1D1D1F]"
              >
                Clear brands
              </button>
            </>
          ) : null}
        </>
      )}
    </FilterDropdown>
  );
}

function ConditionFilterDropdown({
  conditions,
  selected,
  onChange,
}: {
  conditions: ProductCondition[];
  selected: ProductCondition[];
  onChange: (next: ProductCondition[]) => void;
}) {
  const active = selected.length > 0;
  const current = selected[0];
  const buttonLabel =
    active && current ? CONDITION_LABELS[current] : "Condition";

  return (
    <FilterDropdown label="Filter by condition" active={active} buttonLabel={buttonLabel}>
      {(close) => (
        <>
          <MenuOption
            selected={!active}
            onSelect={() => {
              onChange([]);
              close();
            }}
          >
            All conditions
          </MenuOption>
          {conditions.map((c) => (
            <MenuOption
              key={c}
              selected={current === c}
              onSelect={() => {
                onChange([c]);
                close();
              }}
            >
              {CONDITION_LABELS[c]}
            </MenuOption>
          ))}
        </>
      )}
    </FilterDropdown>
  );
}

function AvailabilityFilterDropdown({
  value,
  onChange,
}: {
  value: CatalogAvailability;
  onChange: (next: CatalogAvailability) => void;
}) {
  const labels: Record<CatalogAvailability, string> = {
    all: "Availability",
    "in-stock": "In stock",
    "out-of-stock": "Sold out",
  };
  const active = value !== "all";

  return (
    <FilterDropdown
      label="Filter by availability"
      active={active}
      buttonLabel={labels[value]}
    >
      {(close) =>
        (
          [
            ["all", "All"],
            ["in-stock", "In stock"],
            ["out-of-stock", "Sold out"],
          ] as const
        ).map(([v, label]) => (
          <MenuOption
            key={v}
            selected={value === v}
            onSelect={() => {
              onChange(v);
              close();
            }}
          >
            {label}
          </MenuOption>
        ))
      }
    </FilterDropdown>
  );
}

function PriceFilterDropdown({
  priceRanges,
  priceMin,
  priceMax,
  onChange,
}: {
  priceRanges: { label: string; min: number | null; max: number | null }[];
  priceMin: number | null;
  priceMax: number | null;
  onChange: (min: number | null, max: number | null) => void;
}) {
  const active = priceMin != null || priceMax != null;
  const currentLabel =
    priceRanges.find((r) => r.min === priceMin && r.max === priceMax)?.label ??
    (active ? "Custom" : "Price");

  return (
    <FilterDropdown label="Filter by price" active={active} buttonLabel={currentLabel}>
      {(close) => (
        <>
          <MenuOption
            selected={!active}
            onSelect={() => {
              onChange(null, null);
              close();
            }}
          >
            Any price
          </MenuOption>
          {priceRanges.map((range) => {
            const selected = priceMin === range.min && priceMax === range.max;
            return (
              <MenuOption
                key={range.label}
                selected={selected}
                onSelect={() => {
                  onChange(range.min, range.max);
                  close();
                }}
              >
                {range.label}
              </MenuOption>
            );
          })}
        </>
      )}
    </FilterDropdown>
  );
}

function SortDropdown({
  value,
  onChange,
  showNewest,
}: {
  value: CatalogSortOption;
  onChange: (v: CatalogSortOption) => void;
  showNewest: boolean;
}) {
  const { open, rootRef, close, toggle } = useDropdownMenu();
  const menuId = useId();
  const options = CATALOG_SORT_OPTIONS.filter(
    (o) => o.value !== "newest" || showNewest,
  );
  const current = options.find((o) => o.value === value)?.label ?? "Featured";

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={menuId}
        onClick={toggle}
        className={`${triggerBase} ${triggerIdle}`}
      >
        <span className="ez-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#86868B]">
          Sort
        </span>
        <span className="text-[#86868B]">·</span>
        <span>{current}</span>
        <ChevronDown
          className={`h-3 w-3 text-[#86868B] transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div
          id={menuId}
          role="listbox"
          aria-label="Sort products"
          className={`${menuPanel} right-0 min-w-[220px]`}
        >
          {options.map((o) => (
            <MenuOption
              key={o.value}
              selected={value === o.value}
              onSelect={() => {
                onChange(o.value);
                close();
              }}
            >
              {o.label}
            </MenuOption>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ActiveFilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-black/[0.08] bg-white pl-2.5 pr-1 text-[12px] text-[#424245]">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="flex h-5 w-5 items-center justify-center rounded text-[#86868B] transition hover:bg-black/[0.04] hover:text-[#1D1D1F]"
      >
        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
          <path
            d="M3 3l6 6M9 3l-6 6"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </span>
  );
}

function FilterDrawer({
  open,
  onClose,
  filters,
  onFiltersChange,
  brands,
  conditions,
  priceRanges,
  hasAvailabilityFilter,
}: {
  open: boolean;
  onClose: () => void;
  filters: CatalogFilterState;
  onFiltersChange: (next: CatalogFilterState) => void;
  brands: string[];
  conditions: ProductCondition[];
  priceRanges: { label: string; min: number | null; max: number | null }[];
  hasAvailabilityFilter: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-[90] ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Catalog filters"
        className={`absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-[22px] bg-white shadow-[0_-12px_50px_rgba(17,17,19,0.16)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:inset-y-0 sm:right-0 sm:left-auto sm:bottom-auto sm:h-full sm:max-h-none sm:w-[380px] sm:rounded-none ${
          open ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-y-0 sm:translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-black/[0.07] px-5 py-4">
          <h2 className="text-[15px] font-semibold tracking-[-0.02em]">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/[0.08] text-[#86868B] transition hover:border-black/[0.14] hover:text-[#1D1D1F]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {brands.length > 1 ? (
            <fieldset className="m-0 border-0 p-0">
              <legend className="ez-mono mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#86868B]">
                Brand
              </legend>
              <div className="space-y-0.5 rounded-xl border border-black/[0.08] p-1">
                {brands.map((brand) => {
                  const checked = filters.brands.includes(brand);
                  return (
                    <MenuOption
                      key={brand}
                      multi
                      selected={checked}
                      onSelect={() => {
                        const next = checked
                          ? filters.brands.filter((b) => b !== brand)
                          : [...filters.brands, brand];
                        onFiltersChange({ ...filters, brands: next });
                      }}
                    >
                      {brand}
                    </MenuOption>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          {conditions.length > 0 ? (
            <fieldset className="m-0 border-0 p-0">
              <legend className="ez-mono mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#86868B]">
                Condition
              </legend>
              <div className="space-y-0.5 rounded-xl border border-black/[0.08] p-1">
                <MenuOption
                  selected={filters.conditions.length === 0}
                  onSelect={() =>
                    onFiltersChange({ ...filters, conditions: [] })
                  }
                >
                  All conditions
                </MenuOption>
                {conditions.map((c) => (
                  <MenuOption
                    key={c}
                    selected={filters.conditions[0] === c}
                    onSelect={() =>
                      onFiltersChange({ ...filters, conditions: [c] })
                    }
                  >
                    {CONDITION_LABELS[c]}
                  </MenuOption>
                ))}
              </div>
            </fieldset>
          ) : null}

          {hasAvailabilityFilter ? (
            <fieldset className="m-0 border-0 p-0">
              <legend className="ez-mono mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#86868B]">
                Availability
              </legend>
              <div className="space-y-0.5 rounded-xl border border-black/[0.08] p-1">
                {(
                  [
                    ["all", "All"],
                    ["in-stock", "In stock"],
                    ["out-of-stock", "Sold out"],
                  ] as const
                ).map(([value, label]) => (
                  <MenuOption
                    key={value}
                    selected={filters.availability === value}
                    onSelect={() =>
                      onFiltersChange({ ...filters, availability: value })
                    }
                  >
                    {label}
                  </MenuOption>
                ))}
              </div>
            </fieldset>
          ) : null}

          {priceRanges.length > 0 ? (
            <fieldset className="m-0 border-0 p-0">
              <legend className="ez-mono mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#86868B]">
                Price
              </legend>
              <div className="space-y-0.5 rounded-xl border border-black/[0.08] p-1">
                <MenuOption
                  selected={
                    filters.priceMin == null && filters.priceMax == null
                  }
                  onSelect={() =>
                    onFiltersChange({
                      ...filters,
                      priceMin: null,
                      priceMax: null,
                    })
                  }
                >
                  Any price
                </MenuOption>
                {priceRanges.map((range) => {
                  const active =
                    filters.priceMin === range.min &&
                    filters.priceMax === range.max;
                  return (
                    <MenuOption
                      key={range.label}
                      selected={active}
                      onSelect={() =>
                        onFiltersChange({
                          ...filters,
                          priceMin: range.min,
                          priceMax: range.max,
                        })
                      }
                    >
                      {range.label}
                    </MenuOption>
                  );
                })}
              </div>
            </fieldset>
          ) : null}
        </div>

        <div className="border-t border-black/[0.07] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="ez-btn-primary flex min-h-[48px] w-full items-center justify-center rounded-full text-[14px] font-semibold"
          >
            Show results
          </button>
        </div>
      </aside>
    </div>
  );
}

export function CatalogFilterBar({
  products,
  filters,
  sort,
  brands,
  filteredCount,
  totalCount,
  onFiltersChange,
  onSortChange,
  onClearFilters,
  embedded = false,
  className,
  chipsClassName,
}: CatalogFilterBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const conditions = useMemo(() => deriveConditions(products), [products]);
  const priceRanges = useMemo(() => derivePriceRanges(products), [products]);
  const activeCount = countActiveFilters(filters);
  const showNewest = useMemo(
    () => products.some((p) => p.createdAt || p.badges?.some((b) => b.kind === "new")),
    [products],
  );

  const hasSoldOut = useMemo(
    () =>
      products.some(
        (p) => /sold\s*out/i.test(p.price) || p.badges?.some((b) => b.kind === "soldout"),
      ),
    [products],
  );
  const hasAvailabilityFilter = hasSoldOut || products.some((p) => p.stock != null);

  const showBrandFilter = brands.length > 1;
  const showSecondaryFilters =
    conditions.length > 0 || hasAvailabilityFilter || priceRanges.length > 0;

  const availabilityLabels: Record<CatalogAvailability, string> = {
    all: "All",
    "in-stock": "In stock",
    "out-of-stock": "Sold out",
  };

  const priceActiveLabel =
    priceRanges.find(
      (r) => r.min === filters.priceMin && r.max === filters.priceMax,
    )?.label ?? "Price";

  const filterControls = (
    <>
      {showBrandFilter ? (
        <BrandFilterDropdown
          brands={brands}
          selected={filters.brands}
          onChange={(brands) => onFiltersChange({ ...filters, brands })}
        />
      ) : null}
      {conditions.length > 0 ? (
        <ConditionFilterDropdown
          conditions={conditions}
          selected={filters.conditions}
          onChange={(conditions) => onFiltersChange({ ...filters, conditions })}
        />
      ) : null}
      {hasAvailabilityFilter ? (
        <AvailabilityFilterDropdown
          value={filters.availability}
          onChange={(availability) => onFiltersChange({ ...filters, availability })}
        />
      ) : null}
      {priceRanges.length > 0 ? (
        <PriceFilterDropdown
          priceRanges={priceRanges}
          priceMin={filters.priceMin}
          priceMax={filters.priceMax}
          onChange={(priceMin, priceMax) =>
            onFiltersChange({ ...filters, priceMin, priceMax })
          }
        />
      ) : null}
    </>
  );

  const titleCount = (
    <p className="ez-mono m-0 shrink-0 text-[11px] uppercase tracking-[0.1em] text-[#86868B]">
      {filteredCount === totalCount ? (
        <>{totalCount} titles</>
      ) : (
        <>
          {filteredCount} of {totalCount} titles
        </>
      )}
    </p>
  );

  const desktopToolbar = (
    <div
      className={`hidden items-center gap-2 lg:flex ${embedded ? "justify-end" : "min-h-[52px] justify-between gap-4 px-4 py-2.5"}`}
    >
      {!embedded ? titleCount : null}

      <div className={`flex min-w-0 items-center gap-2 ${embedded ? "" : "flex-1 justify-end"}`}>
        <div className="flex items-center gap-1.5">{filterControls}</div>

        {showSecondaryFilters || showBrandFilter ? (
          <span
            aria-hidden
            className="mx-1 h-5 w-px shrink-0 bg-black/[0.08]"
          />
        ) : null}

        <SortDropdown
          value={sort}
          onChange={onSortChange}
          showNewest={showNewest}
        />

        {activeCount > 0 ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="ez-mono ml-1 shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-[#86868B] transition hover:text-[#1D1D1F]"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );

  const mobileToolbar = (
    <div
      className={`flex flex-col gap-2.5 lg:hidden ${embedded ? "" : "px-3 py-2.5"}`}
    >
      <div className="flex items-center justify-between gap-3">
        {!embedded ? titleCount : null}
        <div
          className={`flex shrink-0 items-center gap-2 ${embedded ? "w-full justify-end" : ""}`}
        >
          {(showBrandFilter || showSecondaryFilters) && (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className={`${triggerBase} ${activeCount > 0 ? triggerActive : triggerIdle}`}
            >
              Filters
              {activeCount > 0 ? (
                <span className="ez-mono text-[10px] font-bold text-[#86868B]">
                  · {activeCount}
                </span>
              ) : null}
            </button>
          )}
          <SortDropdown
            value={sort}
            onChange={onSortChange}
            showNewest={showNewest}
          />
        </div>
      </div>

      {(showBrandFilter || showSecondaryFilters) && (
        <div
          className={`flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${embedded ? "" : "-mx-3 px-3"}`}
        >
          {filterControls}
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="ez-mono inline-flex h-9 shrink-0 items-center px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#86868B] transition hover:text-[#1D1D1F]"
            >
              Clear
            </button>
          ) : null}
        </div>
      )}
    </div>
  );

  const activeChips =
    activeCount > 0 ? (
      <div
        className={`flex flex-wrap gap-1.5 ${embedded ? "" : "border-t border-black/[0.05] px-3 py-2 sm:px-4"} ${chipsClassName ?? ""}`}
      >
        {filters.brands.map((brand) => (
          <ActiveFilterChip
            key={brand}
            label={brand}
            onRemove={() =>
              onFiltersChange({
                ...filters,
                brands: filters.brands.filter((b) => b !== brand),
              })
            }
          />
        ))}
        {filters.conditions.map((c) => (
          <ActiveFilterChip
            key={c}
            label={CONDITION_LABELS[c]}
            onRemove={() =>
              onFiltersChange({
                ...filters,
                conditions: filters.conditions.filter((x) => x !== c),
              })
            }
          />
        ))}
        {filters.availability !== "all" ? (
          <ActiveFilterChip
            label={availabilityLabels[filters.availability]}
            onRemove={() =>
              onFiltersChange({ ...filters, availability: "all" })
            }
          />
        ) : null}
        {filters.priceMin != null || filters.priceMax != null ? (
          <ActiveFilterChip
            label={priceActiveLabel}
            onRemove={() =>
              onFiltersChange({
                ...filters,
                priceMin: null,
                priceMax: null,
              })
            }
          />
        ) : null}
      </div>
    ) : null;

  const controls = (
    <>
      {desktopToolbar}
      {mobileToolbar}
    </>
  );

  return (
    <>
      {embedded ? (
        <>
          <div className="contents">
            <div className={className}>{controls}</div>
            {activeChips}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_0_rgba(17,17,19,0.04)]">
          {controls}
          {activeChips}
        </div>
      )}

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        onFiltersChange={onFiltersChange}
        brands={brands}
        conditions={conditions}
        priceRanges={priceRanges}
        hasAvailabilityFilter={hasAvailabilityFilter}
      />
    </>
  );
}

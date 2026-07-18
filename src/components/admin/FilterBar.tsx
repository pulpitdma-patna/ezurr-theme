"use client";

type FilterOption = { value: string; label: string; count?: number };

export function FilterBar({
  options,
  value,
  onChange,
  className = "",
}: {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Filters"
      className={`ez-scrollbar-none flex gap-1 overflow-x-auto ${className}`}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] ${
              active
                ? "bg-[#1D1D1F] text-white shadow-sm"
                : "bg-[#F5F5F7] text-[#6E6E73] hover:bg-[#EFEFF1] hover:text-[#1D1D1F]"
            }`}
          >
            {option.label}
            {typeof option.count === "number" ? (
              <span className={`ml-1.5 ez-mono text-[9px] ${active ? "text-white/60" : "text-[#AEAEB2]"}`}>
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

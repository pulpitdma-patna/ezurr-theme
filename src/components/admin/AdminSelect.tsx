"use client";

type AdminSelectOption = {
  value: string;
  label: string;
};

type AdminSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: AdminSelectOption[];
  className?: string;
};

export function AdminSelect({
  label,
  value,
  onChange,
  options,
  className = "",
}: AdminSelectProps) {
  return (
    <label className={`inline-flex h-9 items-center gap-2 rounded-lg border border-black/[0.07] bg-white pl-3 pr-2 shadow-none ${className}`}>
      <span className="ez-mono shrink-0 text-[9px] uppercase tracking-[0.12em] text-[#86868B]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="h-full min-w-[7.5rem] max-w-[11rem] cursor-pointer appearance-none border-0 bg-transparent py-0 pr-5 text-xs font-semibold text-[#1D1D1F] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%2386868B' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.15rem center",
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

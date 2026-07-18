"use client";

export function SettingsToggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-black/[0.06] bg-[#F7F7F8] px-4 py-3.5 text-left transition hover:bg-[#F3F3F5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] disabled:opacity-50"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold tracking-[-0.02em] text-[#1D1D1F]">
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block text-xs text-[#86868B]">{description}</span>
        ) : null}
      </span>
      <span
        className={`relative h-6 w-10 shrink-0 rounded-full transition ${
          checked ? "bg-[#1D1D1F]" : "bg-[#D2D2D7]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

"use client";

/** Shared Phase 2 preview chrome — UI only, no live backend. */
export function Phase2Badge({ label = "Phase 2 · UI preview" }: { label?: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-black/[0.08] bg-[#F0F0F2] px-2.5 py-0.5 ez-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[#6E6E73]">
      {label}
    </span>
  );
}

export function Phase2Banner({
  title = "Platform preview",
  description = "These controls are interactive mockups. No API, SSO, or provider calls leave this browser.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-2 rounded-2xl border border-dashed border-black/[0.12] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold tracking-[-0.02em] text-[#1D1D1F]">{title}</h2>
          <Phase2Badge />
        </div>
        <p className="mt-1 text-xs text-[#6E6E73]">{description}</p>
      </div>
    </div>
  );
}

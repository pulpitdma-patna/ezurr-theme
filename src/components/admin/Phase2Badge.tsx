"use client";

/** Shared Phase 2 preview chrome — UI only, no live backend. */
export function Phase2Badge({ label = "Phase 2 · UI preview" }: { label?: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-black/[0.08] bg-[#F0F0F2] px-2.5 py-0.5 ez-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[#6E6E73]">
      {label}
    </span>
  );
}

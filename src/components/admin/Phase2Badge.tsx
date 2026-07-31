"use client";

/**
 * Marks a screen that is not finished. "Phase 2 · UI preview" was our word for
 * our release plan — he does not have phases, he has a shop, and a badge he
 * cannot read is a badge that just looks like a warning.
 */
export function Phase2Badge({ label = "Still being built" }: { label?: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-black/[0.08] bg-[#F0F0F2] px-2.5 py-0.5 ez-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[#6E6E73]">
      {label}
    </span>
  );
}

"use client";

import type { ReactNode } from "react";
import type { AdminSettings } from "@/data/admin";

/**
 * The vocabulary every tab on this screen is built from.
 *
 * Nothing was missing from Settings — the complaint was thirty labelled boxes in
 * one column, each a bare noun, with no way to tell which three of them belonged
 * together or what any of them would do to the shop. So there are exactly three
 * shapes here and every tab is made of them:
 *
 *  - `Cluster` — a small titled group with ONE line saying what the group
 *    decides. If that line cannot be written, the controls in it do not belong
 *    together, and the fix is to split them rather than to write a vaguer line.
 *  - `Field` — the label, the control, and, where the value has a real
 *    consequence, that consequence printed under it. Never a tooltip: he is
 *    behind the counter on a phone with a customer waiting, and he will not
 *    hover anything.
 *  - `MoreOptions` — closed by default, for the two or three things that are set
 *    once and never opened again.
 */

export const fieldClass =
  "h-9 w-full rounded-lg border border-black/[0.07] bg-[#FAFAFB] px-3 text-sm outline-none transition hover:border-black/[0.10] focus:border-black/[0.14] focus:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] disabled:opacity-50";

// Sentence case, not the 9px uppercase mono this admin used everywhere: a label
// is a question or a noun, and shouting it does not make it clearer.
export const labelClass = "text-[11px] font-semibold text-[#424245]";

export const hintClass = "text-[11px] leading-relaxed text-[#86868B]";

export const insetPanelClass = "rounded-lg border border-black/[0.06] bg-[#FAFAFB] px-3 py-2.5";

export const calloutClass =
  "rounded-lg border border-black/[0.06] bg-[#FAFAFB] px-3 py-2.5 text-[11px] leading-relaxed text-[#6E6E73]";

export const linkClass = "font-semibold text-[#1D1D1F] underline-offset-2 hover:underline";

/** What every tab needs and nothing more, so a tab cannot reach the save queue itself. */
export type SettingsPanelProps = {
  settings: AdminSettings;
  /** Filtered to sendable keys and queued by the page. Tabs never call the API. */
  patch: (partial: Partial<AdminSettings>) => void;
  active: boolean;
  status?: ReactNode;
  disabled?: boolean;
};

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  /** The consequence of this value, in a sentence. Omitted when there isn't one. */
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  // The hint sits OUTSIDE the label on purpose. Inside it, a screen reader
  // reads the whole consequence back as the name of the box — and "Printed
  // under your GST number" under the PAN box made two controls on this tab
  // answer to "GST number", which is exactly the confusion this tab is here to
  // end.
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="flex flex-col gap-1">
        <span className={labelClass}>{label}</span>
        {children}
      </label>
      {hint ? <p className={`mt-0.5 ${hintClass}`}>{hint}</p> : null}
    </div>
  );
}

export function Cluster({
  title,
  lead,
  children,
  className = "",
}: {
  title: string;
  /** One line: what a shopkeeper decides by filling this group in. */
  lead: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-black/[0.06] p-3 sm:p-3.5 ${className}`}>
      <h3 className="text-xs font-semibold tracking-[-0.01em] text-[#1D1D1F]">{title}</h3>
      <p className="mt-0.5 max-w-xl text-[11px] leading-relaxed text-[#6E6E73]">{lead}</p>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

/**
 * Set-once things, folded away.
 *
 * A plain `details` rather than our own toggle so the closed state is still
 * findable by the browser's own find-on-page, and so it opens with one tap on a
 * phone.
 */
export function MoreOptions({
  summary,
  lead,
  children,
}: {
  summary: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-xl border border-black/[0.06]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1D1D1F] sm:px-3.5">
        <span className="min-w-0">
          <span className="block text-xs font-semibold tracking-[-0.01em] text-[#1D1D1F]">
            {summary}
          </span>
          {lead ? (
            <span className="mt-0.5 block text-[11px] leading-relaxed text-[#6E6E73]">{lead}</span>
          ) : null}
        </span>
        <span
          className="shrink-0 text-[11px] font-semibold text-[#6E6E73] group-open:hidden"
          aria-hidden
        >
          Show
        </span>
        <span
          className="hidden shrink-0 text-[11px] font-semibold text-[#6E6E73] group-open:inline"
          aria-hidden
        >
          Hide
        </span>
      </summary>
      <div className="space-y-3 border-t border-black/[0.05] p-3 sm:p-3.5">{children}</div>
    </details>
  );
}

/** A rupee box. The ₹ sits inside so the number is never read as a bare count. */
export function RupeeInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <span className="relative block">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#86868B]">
        ₹
      </span>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className={`${fieldClass} pl-7`}
      />
    </span>
  );
}

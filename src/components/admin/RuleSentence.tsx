"use client";

import type { SentenceSlot } from "@/lib/automationGrammar";

/**
 * A rule, rendered as one sentence with its choices inline.
 *
 * The admin has three places that describe a conditional rule to the owner:
 * automatic messages, checkout exceptions, and the "reads as" line on a
 * discount code. Before this they had three different shapes — a three-box
 * TRIGGER → IF → THEN grid, a stack of labelled selects, and a paragraph — so
 * the same idea looked like three unrelated features. One grammar across all
 * three is the opposite of a second design system.
 *
 * Two modes, one component:
 *
 *  - editable (a slot carries `onChange`): the choice is a `<select>` styled to
 *    sit in the line of text, underlined the way a filled-in blank on a form is.
 *    He is reading a sentence and changing a word in it, not filling a field.
 *  - read-only (no `onChange`): the same word, in bold. The sentence in the
 *    list and the sentence in the editor are then character-for-character the
 *    same, which is what makes the list trustworthy.
 *
 * Sentences wrap. That is deliberate and is why this survives 375px, where the
 * three-box grid could not.
 */
export function RuleSentence({
  slots,
  muted = false,
  className = "",
}: {
  slots: SentenceSlot[];
  /** Grey, for a rule that is not switched on. */
  muted?: boolean;
  className?: string;
}) {
  return (
    <p
      className={`flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-[13px] leading-relaxed ${
        muted ? "text-[#86868B]" : "text-[#1D1D1F]"
      } ${className}`}
    >
      {slots.map((slot, index) => {
        if (slot.kind === "text") {
          return <span key={`t-${index}`}>{slot.text}</span>;
        }

        const selected = slot.options.find((o) => o.value === slot.value);
        const label = selected?.label ?? slot.emptyLabel ?? "—";

        if (!slot.onChange) {
          return (
            <strong
              key={slot.id}
              className={`font-semibold ${
                selected ? "" : muted ? "" : "text-[#9A3412]"
              }`}
            >
              {label}
            </strong>
          );
        }

        return (
          <span key={slot.id} className="relative inline-flex items-center">
            <select
              value={slot.value}
              onChange={(event) => slot.onChange?.(event.target.value)}
              aria-label={slot.ariaLabel}
              className={`cursor-pointer appearance-none rounded-md border-b-2 bg-[#F0F0F2] py-0.5 pl-2 pr-6 text-[13px] font-semibold outline-none transition hover:bg-[#E8E8EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] ${
                selected
                  ? "border-[#1D1D1F] text-[#1D1D1F]"
                  : "border-[#D97706] text-[#9A3412]"
              }`}
            >
              {/* The empty option is the thing still to fill in, so it shows
                  while nothing is chosen — and stops being offered once
                  something is, because going BACK to it is never a move he
                  wants.

                  The comment here used to claim it appeared "only where 'no
                  filter' is a real answer", and the code below rendered it
                  unconditionally. On the action menu, picking it produced a rule
                  with no action at all: Save stayed enabled, the dropdown then
                  vanished from the drawer, and the rule saved reading "On every
                  order —" with no way to correct it short of deleting it. */}
              {selected ? null : <option value="">{slot.emptyLabel ?? "—"}</option>}
              {slot.options
                .filter((option) => option.value !== "")
                .map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </select>
            <span
              aria-hidden
              className="pointer-events-none absolute right-1.5 text-[9px] text-[#86868B]"
            >
              ▾
            </span>
          </span>
        );
      })}
    </p>
  );
}

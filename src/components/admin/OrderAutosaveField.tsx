"use client";

import { useState } from "react";
import { formatAdminTime } from "@/lib/adminFormat";

/**
 * One field that saves itself when he leaves it, and says so where he can see it.
 *
 * The courier tracking number and the note to self used to be welded together in
 * one form behind a single `Save tracking / notes` button, whose result was a
 * banner that faded after a few seconds. Two unrelated facts, one button, and no
 * lasting answer to "did that save?" — so the number he typed while the courier
 * waited at the counter either saved or did not, and the screen stopped saying
 * which.
 *
 * Saving on commit (blur or Enter), never per keystroke, and the state is shown
 * beside the field it belongs to:
 *
 *  - saving → `Saving…`
 *  - saved  → `Saved · 4:12 pm`, and it stays there until he edits again
 *  - failed → red, the reason, a `Try again`, and **the typed value is left
 *    exactly as typed** — a failure never leaves the screen looking successful.
 *
 * This is the save contract applied to two fields. When `useSaveState` lands as
 * shared infrastructure, this component becomes a thin wrapper over it.
 */

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: Date }
  | { kind: "failed"; message: string };

export function OrderAutosaveField({
  label,
  value,
  placeholder,
  multiline,
  helper,
  disabled,
  onSave,
}: {
  label: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  helper?: string;
  disabled?: boolean;
  /** Resolves when the server has confirmed it. Rejects with the reason. */
  onSave: (next: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value);
  const [committed, setCommitted] = useState(value);
  const [state, setState] = useState<SaveState>({ kind: "idle" });

  // A reload that brings a different value adopts it, but never over an edit in
  // progress or one that failed — that is how a rejected value silently
  // disappears and he never learns it did not save.
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (state.kind !== "failed" && draft === committed) {
      setDraft(value);
      setCommitted(value);
    }
  }

  async function commit(next: string) {
    if (next === committed) return;
    setState({ kind: "saving" });
    try {
      await onSave(next);
      setCommitted(next);
      setState({ kind: "saved", at: new Date() });
    } catch (err) {
      setState({
        kind: "failed",
        message: err instanceof Error ? err.message : "It didn't save.",
      });
    }
  }

  const failed = state.kind === "failed";
  const inputClass = `w-full rounded-xl border bg-[#F7F7F8] px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] ${
    failed ? "border-[#F5C2C0]" : "border-black/[0.08]"
  }`;

  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold text-[#6E6E73]">{label}</span>
        {state.kind === "saving" ? (
          <span className="text-[10px] text-[#86868B]">Saving…</span>
        ) : state.kind === "saved" ? (
          <span className="text-[10px] text-[#2D6B3C]">
            Saved ·{" "}
            {formatAdminTime(state.at).toLowerCase()}
          </span>
        ) : null}
      </span>

      {multiline ? (
        <textarea
          value={draft}
          rows={3}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => void commit(e.target.value)}
          className={inputClass}
        />
      ) : (
        <input
          value={draft}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => void commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void commit(draft);
            }
          }}
          className={inputClass}
        />
      )}

      {failed ? (
        <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-medium text-[#B42318]">
          Not saved — {state.message}
          <button
            type="button"
            onClick={() => void commit(draft)}
            className="rounded-md border border-[#F5C2C0] px-2 py-0.5 text-[11px] font-semibold"
          >
            Try again
          </button>
        </p>
      ) : helper ? (
        <p className="mt-1 text-[11px] text-[#86868B]">{helper}</p>
      ) : null}
    </label>
  );
}

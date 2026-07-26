"use client";

import { useMemo, useState } from "react";
import { useAdminStore } from "@/hooks/useAdminStore";
import {
  fillPlaceholder,
  findPlaceholders,
  type Placeholder,
} from "@/lib/cms/placeholders";

/**
 * Fills the `[TO CONFIRM: …]` blanks in a policy page without showing anyone HTML.
 *
 * The six seeded policy pages are the first thing a new owner must finish and
 * the highest-stakes content in the store — an unfinished refund or privacy
 * policy is a compliance problem, not a cosmetic one. They are also stored as
 * `legal_doc` HTML in a raw textarea, on purpose: a rich editor re-sanitises the
 * whole 8,000-character body on every keystroke.
 *
 * So the markup stays where it is and this sits in front of it: each blank as a
 * labelled input, pre-filled from store settings when the store already knows
 * the answer, with the raw HTML behind a disclosure for anyone who wants it.
 */
export function PlaceholderAssistant({
  html,
  onChange,
}: {
  html: string;
  onChange: (next: string) => void;
}) {
  const { settings } = useAdminStore();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [showRaw, setShowRaw] = useState(false);

  const placeholders = useMemo(
    () => findPlaceholders(html, settings),
    [html, settings],
  );

  const apply = (ph: Placeholder, raw: string) => {
    const value = raw.trim();
    if (!value) return;
    onChange(fillPlaceholder(html, ph.token, value));
    setDrafts((d) => {
      const next = { ...d };
      delete next[ph.token];
      return next;
    });
  };

  const fillAllFromSettings = () => {
    let next = html;
    for (const ph of placeholders) {
      if (ph.suggestion) next = fillPlaceholder(next, ph.token, ph.suggestion);
    }
    onChange(next);
  };

  const suggestable = placeholders.filter((p) => p.suggestion).length;

  return (
    <div className="space-y-3">
      {placeholders.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="m-0 text-[12px] font-semibold text-amber-900">
              {placeholders.length} detail
              {placeholders.length === 1 ? "" : "s"} still to confirm
            </p>
            {suggestable > 0 ? (
              <button
                type="button"
                onClick={fillAllFromSettings}
                className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
              >
                Fill {suggestable} from store settings
              </button>
            ) : null}
          </div>

          <div className="mt-2.5 space-y-2">
            {placeholders.map((ph) => (
              <div key={ph.token}>
                <label className="flex items-center justify-between text-[11px] font-medium text-amber-900">
                  {/* Not capitalised: the seeded labels already read as prose
                      ("free-shipping threshold, e.g. ₹999"), and title-casing
                      turned that into "E.G." */}
                  <span className="first-letter:uppercase">{ph.label}</span>
                  {ph.count > 1 ? (
                    <span className="text-[10px] text-amber-700">
                      appears {ph.count}×
                    </span>
                  ) : null}
                </label>
                <div className="mt-1 flex gap-1.5">
                  <input
                    value={drafts[ph.token] ?? ph.suggestion ?? ""}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [ph.token]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        apply(ph, drafts[ph.token] ?? ph.suggestion ?? "");
                      }
                    }}
                    placeholder={ph.label}
                    className="h-8 min-w-0 flex-1 rounded-lg border border-amber-200 bg-white px-2 text-[12px] outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => apply(ph, drafts[ph.token] ?? ph.suggestion ?? "")}
                    className="h-8 shrink-0 rounded-lg bg-amber-900 px-2.5 text-[11px] font-semibold text-white hover:bg-amber-950"
                  >
                    Apply
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="m-0 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-800">
          Nothing left to confirm on this section.
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowRaw((v) => !v)}
        className="text-[11px] font-semibold text-[#6E6E73] underline"
      >
        {showRaw ? "Hide" : "Edit"} HTML
      </button>

      {showRaw ? (
        <textarea
          className="w-full min-h-[220px] rounded-lg border border-black/[0.1] px-2.5 py-2 font-mono text-[11px] outline-none focus:border-[#1D1D1F]"
          value={html}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : null}
    </div>
  );
}

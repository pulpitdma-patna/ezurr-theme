"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

/**
 * Pick a go-live time.
 *
 * Two things the owner has to be told, because both would otherwise look like
 * bugs:
 *
 * 1. The snapshot is taken NOW, not at the scheduled moment. "Publish at 9am"
 *    means "what I approved just now goes live at 9am" — otherwise an unrelated
 *    Tuesday edit would ship at Wednesday 9am to an author who thought they had
 *    approved something else.
 * 2. The storefront caches published pages for five minutes, so a 9:00 schedule
 *    can appear at 9:05. Better said plainly than discovered while refreshing.
 *
 * All times are IST and labelled as such — the server stores UTC, the owner
 * thinks in the clock on their wall.
 */

/** `datetime-local` wants the *local* wall clock, not an ISO-Z string. */
function localInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SchedulePublishDialog({
  open,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (publishAtIso: string) => void;
}) {
  const [when, setWhen] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 60, 0, 0);
    return localInputValue(d);
  });

  if (!open || typeof document === "undefined") return null;

  const parsed = when ? new Date(when) : null;
  const valid = parsed !== null && !Number.isNaN(parsed.getTime()) && parsed > new Date();

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-[420px] rounded-2xl bg-white p-5 shadow-2xl">
        <h2 className="m-0 text-base font-semibold text-[#1D1D1F]">
          Schedule this page
        </h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-[#6E6E73]">
          The version you have right now is what goes live — later edits won&apos;t
          be included unless you schedule again.
        </p>

        <label className="mt-4 block">
          <span className="text-[11px] font-semibold text-[#6E6E73]">
            Go live at (IST)
          </span>
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/[0.1] px-2.5 py-2 text-sm outline-none focus:border-[#1D1D1F]"
          />
        </label>

        {parsed && !valid ? (
          <p className="mt-1.5 text-[11px] font-semibold text-red-700">
            Pick a time in the future — to publish now, use Publish.
          </p>
        ) : null}

        <p className="mt-3 rounded-lg bg-[#F5F5F7] px-3 py-2 text-[11px] leading-snug text-[#6E6E73]">
          The store checks every five minutes, and pages are cached for five
          more, so it can appear up to ten minutes late.
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-[#6E6E73] hover:bg-[#F5F5F7]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!valid || busy}
            onClick={() => parsed && onConfirm(parsed.toISOString())}
            className="rounded-lg bg-[#1D1D1F] px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-40"
          >
            {busy ? "Scheduling…" : "Schedule"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

"use client";

import { formatAdminTime } from "@/lib/adminFormat";
import type { SaveState } from "@/hooks/useSaveState";

/**
 * The one place the admin says whether something saved.
 *
 * It stays on the screen. `Saved · 4:12 pm` does not time out and is not a
 * toast — the owner's complaint was that he could not tell what was real, and a
 * message that removes itself after 2.8 seconds is indistinguishable from one
 * that was never shown. A failure never auto-dismisses either, and always
 * carries the way to try it again.
 */
export function SaveStatus({ state, className = "" }: { state: SaveState; className?: string }) {
  if (state.kind === "idle") {
    return (
      <span className={`text-[11px] font-medium text-[#86868B] ${className}`}>All saved</span>
    );
  }

  // Saving and dirty are the same sentence on purpose: "queued" versus "in
  // flight" is our distinction, not his, and showing both taught him nothing.
  if (state.kind === "dirty" || state.kind === "saving") {
    return (
      <span
        role="status"
        aria-live="polite"
        className={`text-[11px] font-medium text-[#8A5A00] ${className}`}
      >
        Saving your change…
      </span>
    );
  }

  if (state.kind === "saved") {
    return (
      <span
        role="status"
        aria-live="polite"
        className={`text-[11px] font-medium text-[#2D6B3C] ${className}`}
      >
        Saved · {formatAdminTime(state.at)}
      </span>
    );
  }

  if (state.kind === "offline") {
    return (
      <span role="alert" className={`text-[11px] font-medium text-[#8A5A00] ${className}`}>
        No internet. Your {state.queued === 1 ? "change is" : `${state.queued} changes are`} only on
        this screen — they&rsquo;ll save when you&rsquo;re back.{" "}
        <RetryButton onClick={state.retry} tone="warn" />
      </span>
    );
  }

  return (
    <span role="alert" className={`text-[11px] font-medium text-[#B42318] ${className}`}>
      Not saved — {state.message} <RetryButton onClick={state.retry} tone="bad" />
    </span>
  );
}

function RetryButton({ onClick, tone }: { onClick: () => void; tone: "warn" | "bad" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-semibold underline underline-offset-2 ${
        tone === "bad" ? "text-[#B42318]" : "text-[#8A5A00]"
      }`}
    >
      Try again
    </button>
  );
}

/** The amber / red edge on a field whose value is not on the server yet. */
export function saveFieldTone(state: SaveState): string {
  if (state.kind === "dirty" || state.kind === "saving" || state.kind === "offline") {
    return "border-l-2 border-l-[#B45309] pl-2";
  }
  if (state.kind === "failed") return "border-l-2 border-l-[#B42318] pl-2";
  return "";
}

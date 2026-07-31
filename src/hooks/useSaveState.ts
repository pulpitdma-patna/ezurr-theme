"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/apiClient";
import { adminErrorMessage } from "@/lib/adminError";

/**
 * One save state for the whole admin, so "did that save?" has one answer.
 *
 * The model is lifted from `useCmsAutosave`, which got this right for exactly
 * one screen and was never generalised. Its docblock names the bug this exists
 * to prevent: a success message shown before the request resolved — "Published
 * ✓", and a page that was never saved.
 *
 * Three rules, and every one of them is a defect that shipped:
 *
 *  1. `saved` is only ever set from the resolved promise, after checking the
 *     server echoed back what was sent. Settings used to write the value
 *     locally, queue a PUT and toast "Saved just now" 600 ms later regardless.
 *  2. The queued payload is NOT cleared before the await. It used to be, so a
 *     rejected save lost the change entirely — the owner's shop name was gone
 *     from the server and still on the screen, and the only clue was a red
 *     toast that removed itself after 2.8 seconds.
 *  3. A failure never leaves the screen looking successful, and never
 *     auto-dismisses. `Try again` resends the same payload.
 *
 * Deliberately not a toast anywhere: a fact about whether the shop's settings
 * persisted has to stay on the screen, next to the thing it is about.
 */

export type SaveState =
  | { kind: "idle" }
  /** "saving" and "dirty" look identical to the owner — the difference is ours. */
  | { kind: "dirty" }
  | { kind: "saving" }
  | { kind: "saved"; at: Date }
  | { kind: "failed"; message: string; retry: () => void }
  | { kind: "offline"; queued: number; retry: () => void };

type Payload = Record<string, unknown>;

/**
 * Is what came back the same as what went up?
 *
 * Tolerant in exactly two places, both of which would otherwise report a
 * successful save as a failure:
 *   - blank: the API turns "" into null before storing, so clearing a field
 *     always echoes back the other one of those two;
 *   - numeric: a number sent as 255 can come back as "255" from a JSON column.
 */
function echoMatches(sent: unknown, got: unknown): boolean {
  const blank = (v: unknown) => v === null || v === undefined || v === "";
  if (blank(sent) && blank(got)) return true;
  if (typeof sent === "number" && (typeof got === "number" || typeof got === "string")) {
    return Number(got) === sent;
  }
  if (typeof sent === "object" && sent !== null) {
    return JSON.stringify(sent) === JSON.stringify(got);
  }
  return sent === got;
}

export function useSaveState({
  save,
  debounceMs = 600,
  onPendingKeysChange,
}: {
  /**
   * Sends the payload and resolves with what the server now holds. Returning
   * the server's own object is what makes rule 1 checkable — a save function
   * that resolves with nothing can only ever report "the request did not
   * throw", which is not the same claim.
   */
  save: (payload: Payload) => Promise<Payload>;
  debounceMs?: number;
  /** Keys with an unsaved or failed edit, so a background sync can leave them alone. */
  onPendingKeysChange?: (keys: string[]) => void;
}) {
  const [state, setState] = useState<SaveState>({ kind: "idle" });

  const pendingRef = useRef<Payload>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const saveRef = useRef(save);
  const notifyRef = useRef(onPendingKeysChange);

  useEffect(() => {
    saveRef.current = save;
    notifyRef.current = onPendingKeysChange;
  });

  const announce = useCallback(() => {
    notifyRef.current?.(Object.keys(pendingRef.current));
  }, []);

  const flush = useCallback(async (): Promise<void> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const payload = { ...pendingRef.current };
    const keys = Object.keys(payload);
    if (!keys.length || inFlightRef.current) return;

    inFlightRef.current = true;
    setState({ kind: "saving" });

    try {
      const echo = await saveRef.current(payload);

      // Only drop a key if it still holds the value we just sent. Anything the
      // owner re-typed while the request was in the air stays queued instead of
      // being silently discarded by its own save.
      for (const key of keys) {
        if (echoMatches(payload[key], pendingRef.current[key])) {
          delete pendingRef.current[key];
        }
      }
      announce();

      const rejected = keys.filter((key) => !echoMatches(payload[key], echo[key]));
      if (rejected.length) {
        setState({
          kind: "failed",
          message:
            "The server kept something different from what you typed. Reload this page to see what it has.",
          retry: () => void flush(),
        });
        return;
      }

      if (Object.keys(pendingRef.current).length) {
        // Something was re-typed while this request was in the air. It is still
        // unsaved, so it gets the same debounce rather than sitting queued until
        // the owner happens to touch another field.
        setState({ kind: "dirty" });
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => void flush(), debounceMs);
      } else {
        setState({ kind: "saved", at: new Date() });
      }
    } catch (error) {
      // The payload stays queued: Try again resends it, and closing the tab is
      // the only thing that can lose it.
      if (!(error instanceof ApiError)) {
        setState({
          kind: "offline",
          queued: Object.keys(pendingRef.current).length,
          retry: () => void flush(),
        });
      } else {
        setState({
          kind: "failed",
          message: adminErrorMessage(error, "That didn't save."),
          retry: () => void flush(),
        });
      }
    } finally {
      // No automatic retry after a failure, deliberately: a silent loop against
      // an expired session hides the one thing the owner has to be told.
      inFlightRef.current = false;
    }
  }, [announce, debounceMs]);

  /** Queue a change. Nothing is claimed saved until the server says so. */
  const queue = useCallback(
    (partial: Payload) => {
      if (!Object.keys(partial).length) return;
      pendingRef.current = { ...pendingRef.current, ...partial };
      announce();
      setState({ kind: "dirty" });
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void flush(), debounceMs);
    },
    [announce, debounceMs, flush],
  );

  // A debounce that only fires while the page is open loses the last edit of
  // every session — the owner types a phone number and closes the tab.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (Object.keys(pendingRef.current).length) void flush();
    },
    [flush],
  );

  return { state, queue, flush, setState };
}

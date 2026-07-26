"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isApiEnabled } from "@/lib/apiClient";
import { saveDraft, type CmsError } from "@/lib/cms/cmsApi";
import type { CmsPageDocument } from "@/lib/cms/types";

export type SaveState = "idle" | "saving" | "saved" | "error";

/** What the server has to agree with for the page to count as saved. */
function signature(doc: CmsPageDocument): string {
  return JSON.stringify({ draft: doc.draft, title: doc.title, path: doc.path });
}

/**
 * Keeps the builder's draft on the server.
 *
 * Every edit used to go only to localStorage, and returning to the Pages list
 * replaced the local document with the server's — so the sequence "edit, press
 * Publish, go back" silently discarded the work. The builder never called the
 * API at all.
 *
 * Autosave rather than a Save button, deliberately: the failure being fixed is
 * "I lost my work", and an explicit button reintroduces it as "I forgot to
 * press save". Saving a *draft* is safe because nothing customer-facing moves —
 * publishing stays one deliberate action.
 */
export function useCmsAutosave(page: CmsPageDocument | null | undefined) {
  const [state, setState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<CmsError | null>(null);
  // State, not a ref: the status chip is rendered from it, and a ref read during
  // render would be stale on the very paint that matters.
  const [savedSignature, setSavedSignature] = useState<string | null>(null);

  const pageRef = useRef<CmsPageDocument | null | undefined>(page);
  const savedRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const lastFlushRef = useRef(0);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const flush = useCallback(async (opts: { keepalive?: boolean } = {}) => {
    const doc = pageRef.current;
    if (!doc || !isApiEnabled()) return;

    const body = signature(doc);
    if (body === savedRef.current || inFlightRef.current) return;

    inFlightRef.current = true;
    lastFlushRef.current = Date.now();
    setState("saving");

    const res = await saveDraft(doc, opts);
    inFlightRef.current = false;

    if (res.ok) {
      savedRef.current = body;
      setSavedSignature(body);
      setSavedAt(new Date());
      setError(null);
      setState("saved");
    } else {
      // Deliberately left in an error state — no silent retry loop that could
      // mask an expired session. The chip keeps offering Retry.
      setError(res.error);
      setState("error");
    }
  }, []);

  const current = page ? signature(page) : null;
  const dirty = Boolean(isApiEnabled() && current && current !== savedSignature);

  // Debounced on idle, with a ceiling: someone typing a policy page without
  // pausing would otherwise never hit the idle gap and never save.
  useEffect(() => {
    if (!dirty) return;
    const delay = Date.now() - lastFlushRef.current > 15000 ? 0 : 1200;
    timerRef.current = window.setTimeout(() => void flush(), delay);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [dirty, current, flush]);

  // A hidden or closing tab is when work is most likely to be lost; keepalive
  // lets the request outlive the page.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush({ keepalive: true });
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [flush]);

  /** Called once the page is loaded from the server, so it starts clean. */
  const markSynced = useCallback((doc: CmsPageDocument) => {
    const body = signature(doc);
    savedRef.current = body;
    setSavedSignature(body);
    setState("idle");
    setError(null);
  }, []);

  return { state, savedAt, error, dirty, flush, markSynced };
}

"use client";

import { useEffect, useId, useRef } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Same defect as AdminDrawer had: all 16 call sites pass inline arrows, so
  // depending on the callbacks re-ran the focus effect on every parent render
  // and stole focus back to the first button. Harmless while this dialog holds
  // no text input — it stops being harmless the moment one is added.
  const handlersRef = useRef({ onCancel, onConfirm });
  useEffect(() => {
    handlersRef.current = { onCancel, onConfirm };
  });

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = panel?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    // Prefer Cancel as first focus (safe default) — already first in DOM
    focusables?.[0]?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        handlersRef.current.onCancel();
        return;
      }
      if (event.key === "Enter" && !danger) {
        const tag = (event.target as HTMLElement)?.tagName;
        if (tag === "BUTTON" || tag === "A" || tag === "TEXTAREA") return;
        event.preventDefault();
        handlersRef.current.onConfirm();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const nodes = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, danger]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-label="Dismiss"
        onClick={onCancel}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="relative w-full max-w-sm rounded-2xl border border-black/[0.08] bg-white p-5 shadow-[0_24px_60px_rgba(17,17,19,0.18)]"
      >
        <div className="flex items-start gap-3">
          {danger ? (
            <span
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FEF3F2] text-[#B42318]"
              aria-hidden
            >
              !
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-sm font-semibold tracking-[-0.02em] text-[#1D1D1F]">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-2 text-sm text-[#6E6E73]">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-xl border border-black/10 px-3.5 text-xs font-semibold text-[#1D1D1F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`h-9 rounded-xl px-3.5 text-xs font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] ${
              danger ? "bg-[#B42318] hover:bg-[#912018]" : "bg-[#1D1D1F] hover:bg-[#2C2C2E]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

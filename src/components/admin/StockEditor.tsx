"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { adjustStock } from "@/lib/adminStore";
import { apiUpdateProduct, isApiEnabled } from "@/lib/apiClient";

type SaveState = "idle" | "saving" | "saved" | "error";

const PANEL_W = 248;
const PANEL_H = 208;

/**
 * Per-row stock editing straight from the products list — the button/popover
 * that replaced the standalone Inventory page. Sets the absolute on-hand count
 * (with ± steppers for the old relative adjustment habit) and never discards a
 * typed value when the save fails.
 */
export function StockEditor({
  productKey,
  name,
  stock,
  onSaved,
  children,
}: {
  productKey: string;
  name: string;
  stock: number;
  /** Called with the persisted quantity so the list can refresh the row. */
  onSaved: (productKey: string, stock: number) => void;
  /**
   * Custom trigger content — pass the stock badge itself, so the number the
   * operator is looking at is the thing they click. The default "± Stock"
   * button sat NEXT TO that badge, which meant two controls per row for one
   * job and a label that has to be decoded before it can be used.
   */
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(stock));
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Re-seed from the row only while the popover is shut, so a reload triggered
  // by a neighbouring row can't overwrite what the operator is typing here.
  const [seenStock, setSeenStock] = useState(stock);
  if (stock !== seenStock) {
    setSeenStock(stock);
    if (!open) setDraft(String(stock));
  }

  const syncPos = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.max(8, Math.min(rect.right - PANEL_W, window.innerWidth - PANEL_W - 8));
    const below = rect.bottom + 6;
    const top = below + PANEL_H > window.innerHeight ? Math.max(8, rect.top - PANEL_H - 6) : below;
    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    syncPos();
    panelRef.current?.querySelector<HTMLInputElement>("input")?.select();

    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    }
    window.addEventListener("resize", syncPos);
    window.addEventListener("scroll", syncPos, true);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("resize", syncPos);
      window.removeEventListener("scroll", syncPos, true);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, syncPos]);

  useEffect(() => {
    if (state !== "saved") return;
    const timer = window.setTimeout(() => setState("idle"), 2400);
    return () => window.clearTimeout(timer);
  }, [state]);

  function step(delta: number) {
    const base = Number(draft);
    const next = Math.max(0, (Number.isFinite(base) ? Math.round(base) : stock) + delta);
    setDraft(String(next));
  }

  async function save() {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setState("error");
      setError("Enter a quantity of 0 or more");
      return;
    }
    const next = Math.round(parsed);
    setState("saving");
    setError(null);
    try {
      if (isApiEnabled()) {
        await apiUpdateProduct(productKey, { stock: next });
      } else {
        adjustStock(productKey, next - stock, "Inline stock edit");
      }
      setState("saved");
      setOpen(false);
      onSaved(productKey, next);
    } catch (err) {
      // Leave the popover open with the typed value intact — a failed save must
      // never read as a successful one.
      setState("error");
      setError(err instanceof Error ? err.message : "Could not save stock");
    }
  }

  const saving = state === "saving";

  return (
    <span className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Edit stock for ${name}`}
        onClick={() => {
          setOpen((prev) => {
            if (prev) return false;
            setDraft(String(stock));
            setError(null);
            setState("idle");
            return true;
          });
        }}
        title={`Stock: ${stock} — click to change`}
        className={
          children
            ? "rounded-full transition hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
            : "rounded-md border border-black/10 px-2 py-1 text-[11px] font-semibold text-[#1D1D1F] transition hover:bg-[#F5F5F7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
        }
      >
        {children ?? "± Stock"}
      </button>

      <span aria-live="polite" className="inline-flex">
        {state === "saving" ? <Pill tone="muted">Saving…</Pill> : null}
        {state === "saved" ? <Pill tone="ok">Saved</Pill> : null}
        {state === "error" ? (
          <Pill tone="bad" title={error ?? undefined}>
            Not saved
          </Pill>
        ) : null}
      </span>

      {open && pos ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={`Adjust stock — ${name}`}
          style={{ top: pos.top, left: pos.left, width: PANEL_W }}
          className="fixed z-50 rounded-xl border border-black/[0.08] bg-white p-3 text-left shadow-[0_12px_32px_rgba(17,17,19,0.18)]"
        >
          <p className="truncate text-xs font-semibold tracking-[-0.02em]" title={name}>
            {name}
          </p>
          <p className="mt-0.5 text-[11px] text-[#86868B]">
            On hand now: <span className="ez-mono">{stock}</span>
          </p>

          <div className="mt-2.5 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Decrease by one"
              className="h-8 w-8 shrink-0 rounded-md border border-black/10 text-sm font-semibold hover:bg-[#F5F5F7]"
            >
              −
            </button>
            <input
              type="number"
              min={0}
              step={1}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void save();
                }
              }}
              aria-label="How many you have"
              className="h-8 w-full rounded-md border border-black/[0.08] bg-[#F7F7F8] px-2 text-center text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
            />
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Increase by one"
              className="h-8 w-8 shrink-0 rounded-md border border-black/10 text-sm font-semibold hover:bg-[#F5F5F7]"
            >
              +
            </button>
          </div>

          <p className="mt-1.5 text-[10px] text-[#86868B]">This becomes how many you have.</p>

          {error ? (
            <p role="alert" className="mt-2 rounded-md bg-[#FDECEC] px-2 py-1.5 text-[11px] text-[#B42318]">
              {error}
            </p>
          ) : null}

          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="h-8 flex-1 rounded-md bg-[#1D1D1F] text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-8 rounded-md border border-black/10 px-3 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </span>
  );
}

function Pill({
  tone,
  title,
  children,
}: {
  tone: "muted" | "ok" | "bad";
  title?: string;
  children: React.ReactNode;
}) {
  const tones = {
    muted: "bg-[#F0F0F2] text-[#6E6E73]",
    ok: "bg-[#EAF6ED] text-[#2D6B3C]",
    bad: "bg-[#FEE4E2] text-[#B42318]",
  } as const;
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

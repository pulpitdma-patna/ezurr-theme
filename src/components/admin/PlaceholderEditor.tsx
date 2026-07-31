"use client";

import { useMemo, useState } from "react";

/**
 * Write the wording of a message without ever meeting a curly brace.
 *
 * What this replaces: a plain textarea holding `Hi {{1}}, your order {{2}} is
 * confirmed.` and, beside it, a second textarea holding raw JSON —
 * `[{"key":"name","source":"customer.name"}]` — which the owner had to keep in
 * the same order as the numbers in the first one. Nothing checked that they
 * agreed. A wrong dot-path in the JSON is refused nowhere: the binder resolves
 * it to nothing, the send is written down as "blocked", and from behind the
 * counter that looks like a rule that is switched on and a customer who was
 * never told anything.
 *
 * Here the two cannot disagree, because there is only one of them. The details
 * are chips inside the sentence; the list of variables the server stores is
 * derived from which chips are in the text, in the order they appear. A
 * placeholder that does not bind is unreachable rather than validated after the
 * fact — the menu only offers what the event actually carries.
 *
 * Single-consumer by design. This is the wording editor, not a rich text field.
 */

export type MessagePlaceholder = {
  key: string;
  label: string;
  source: string;
  required: boolean;
};

type Part =
  | { kind: "text"; text: string }
  | { kind: "chip"; key: string };

const MARKER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** What a sample customer sees, per detail. Never presented as real data. */
const SAMPLE: Record<string, string> = {
  name: "Asha",
  order_id: "EZ-4T9K2M",
  total: "₹4,499",
  mobile: "98765 43210",
  carrier: "Bluedart",
  tracking: "ezurr.in/track",
  tracking_number: "4419551200",
  retry_url: "ezurr.in/pay",
  resume_url: "ezurr.in/cart",
  coupon_code: "SUMMER20",
  product: "DualSense controller",
  stock: "2",
  url: "ezurr.in/dualsense",
  code: "XXXX-XXXX-XXXX",
};

export function parseBody(body: string): Part[] {
  const parts: Part[] = [];
  let last = 0;
  MARKER.lastIndex = 0;
  let match = MARKER.exec(body);
  while (match) {
    if (match.index > last) parts.push({ kind: "text", text: body.slice(last, match.index) });
    parts.push({ kind: "chip", key: match[1] });
    last = match.index + match[0].length;
    match = MARKER.exec(body);
  }
  parts.push({ kind: "text", text: body.slice(last) });
  return parts;
}

export function serialiseBody(parts: Part[]): string {
  return parts
    .map((part) => (part.kind === "text" ? part.text : `{{${part.key}}}`))
    .join("");
}

/** The details actually used, in the order they appear — this is what gets saved. */
export function usedPlaceholders(body: string, available: MessagePlaceholder[]): MessagePlaceholder[] {
  const seen = new Set<string>();
  const out: MessagePlaceholder[] = [];
  for (const part of parseBody(body)) {
    if (part.kind !== "chip" || seen.has(part.key)) continue;
    seen.add(part.key);
    const known = available.find((p) => p.key === part.key);
    // An unknown key is kept, not silently dropped: it is somebody's older
    // wording and losing it on save would be worse than showing it as wrong.
    out.push(known ?? { key: part.key, label: part.key, source: "", required: false });
  }
  return out;
}

/** `Hi Asha, your order EZ-4T9K2M is confirmed.` */
export function previewBody(body: string, available: MessagePlaceholder[]): string {
  return parseBody(body)
    .map((part) => {
      if (part.kind === "text") return part.text;
      const known = available.find((p) => p.key === part.key);
      return SAMPLE[part.key] ?? (known ? known.label.toLowerCase() : part.key);
    })
    .join("");
}

export function PlaceholderEditor({
  body,
  placeholders,
  onChange,
  disabled = false,
}: {
  body: string;
  placeholders: MessagePlaceholder[];
  onChange: (body: string) => void;
  disabled?: boolean;
}) {
  const parts = useMemo(() => parseBody(body), [body]);
  const [menuOpen, setMenuOpen] = useState(false);

  const used = useMemo(() => new Set(parts.filter((p) => p.kind === "chip").map((p) => (p as { key: string }).key)), [parts]);
  const missingRequired = placeholders.filter((p) => p.required && !used.has(p.key));

  function replace(next: Part[]) {
    onChange(serialiseBody(next));
  }

  function setText(index: number, text: string) {
    replace(parts.map((part, i) => (i === index && part.kind === "text" ? { kind: "text", text } : part)));
  }

  function removeChip(index: number) {
    // Drop the chip and stitch the text either side back together, so removing
    // a detail never leaves a double space where the word used to be.
    const next: Part[] = [];
    parts.forEach((part, i) => {
      if (i === index) return;
      const previous = next[next.length - 1];
      if (part.kind === "text" && previous?.kind === "text") {
        next[next.length - 1] = { kind: "text", text: previous.text + part.text };
        return;
      }
      next.push(part);
    });
    replace(next);
  }

  function addChip(key: string) {
    setMenuOpen(false);
    replace([...parts, { kind: "chip", key }, { kind: "text", text: "" }]);
  }

  return (
    <div className="space-y-2">
      <div
        className={`flex flex-wrap items-center gap-y-1 rounded-xl border border-black/[0.08] bg-white px-2.5 py-2 text-sm leading-relaxed ${
          disabled ? "opacity-60" : ""
        }`}
      >
        {parts.map((part, index) =>
          part.kind === "text" ? (
            <input
              key={`t-${index}`}
              value={part.text}
              disabled={disabled}
              onChange={(e) => setText(index, e.target.value)}
              aria-label={index === 0 ? "Message wording" : "More wording"}
              // Sized to its content so the sentence flows around the chips
              // instead of each piece sitting on its own line.
              style={{ width: `${Math.max(part.text.length + 1, 2)}ch` }}
              className="min-w-[2ch] max-w-full bg-transparent py-0.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1D1D1F]"
            />
          ) : (
            <ChipToken
              key={`c-${index}`}
              label={placeholders.find((p) => p.key === part.key)?.label ?? part.key}
              known={placeholders.some((p) => p.key === part.key)}
              disabled={disabled}
              onRemove={() => removeChip(index)}
            />
          ),
        )}
      </div>

      <div className="relative flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || placeholders.length === 0}
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          className="h-8 rounded-lg border border-dashed border-black/[0.16] bg-white px-3 text-[11px] font-semibold text-[#1D1D1F] transition hover:bg-[#F7F7F8] disabled:cursor-not-allowed disabled:text-[#AEAEB2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
        >
          + Add a detail
        </button>
        {placeholders.length === 0 ? (
          <span className="text-[11px] text-[#86868B]">
            This message carries no details you can drop in.
          </span>
        ) : null}

        {menuOpen ? (
          <ul className="absolute left-0 top-9 z-20 w-64 overflow-hidden rounded-xl border border-black/[0.08] bg-white py-1 shadow-[0_8px_24px_rgba(17,17,19,0.12)]">
            {placeholders.map((placeholder) => (
              <li key={placeholder.key}>
                <button
                  type="button"
                  onClick={() => addChip(placeholder.key)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[12px] text-[#1D1D1F] transition hover:bg-[#F5F5F7]"
                >
                  <span>{placeholder.label}</span>
                  {used.has(placeholder.key) ? (
                    <span className="text-[10px] text-[#86868B]">already in</span>
                  ) : placeholder.required ? (
                    <span className="text-[10px] text-[#9A3412]">needed</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {missingRequired.length > 0 ? (
        <p className="text-[11px] text-[#9A3412]">
          {missingRequired.map((p) => p.label).join(", ")}{" "}
          {missingRequired.length === 1 ? "has" : "have"} to be in the message, or it will be held
          back instead of sent.
        </p>
      ) : null}

      <div className="rounded-xl border border-black/[0.06] bg-[#FAFAFB] px-3 py-2">
        <div className="text-[11px] font-semibold text-[#1D1D1F]">Asha will see:</div>
        <p className="mt-0.5 text-[12px] leading-relaxed text-[#424245]">
          {previewBody(body, placeholders) || "Nothing yet — type the message above."}
        </p>
        <p className="mt-1 text-[10px] text-[#86868B]">
          Asha is an example. The real name and order number go in when it sends.
        </p>
      </div>
    </div>
  );
}

function ChipToken({
  label,
  known,
  disabled,
  onRemove,
}: {
  label: string;
  known: boolean;
  disabled: boolean;
  onRemove: () => void;
}) {
  return (
    <span
      className={`mx-0.5 inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-semibold ${
        known ? "bg-[#EDF1FD] text-[#2B4ACB]" : "bg-[#FDECEC] text-[#B42318]"
      }`}
      title={known ? undefined : "This message does not carry that detail — remove it."}
    >
      {label}
      {disabled ? null : (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="text-[10px] leading-none opacity-60 transition hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1D1D1F]"
        >
          ✕
        </button>
      )}
    </span>
  );
}

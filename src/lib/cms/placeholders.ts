import type { AdminSettings } from "@/data/admin";
import type { CmsBlock } from "@/lib/cms/types";

/**
 * The `[TO CONFIRM: …]` blanks in the seeded policy pages.
 *
 * Those six pages are the first thing a new store owner has to finish, and they
 * are the least approachable thing in the CMS: `legal_doc` bodies are a raw HTML
 * textarea (deliberately — a rich editor re-sanitises on every keystroke over an
 * 8,000-character document). Asking a shop owner to find "[TO CONFIRM: GSTIN]"
 * between an <h2> and a <table> is how those pages stay unfinished, and an
 * unfinished refund policy is a real compliance problem.
 *
 * So: find the blanks, show them as labelled inputs, and substitute by exact
 * token replacement. No HTML parsing, no perf cost, and the author never sees a
 * tag.
 */

export const PLACEHOLDER_RE = /\[TO CONFIRM:[^\]]*\]/g;

export type Placeholder = {
  /** The literal token, e.g. "[TO CONFIRM: GSTIN]". */
  token: string;
  /** What to show as the field label, e.g. "GSTIN". */
  label: string;
  /** How many times it appears on this page. */
  count: number;
  /** Pre-filled from store settings when we already know the answer. */
  suggestion?: string;
};

/** Blanks whose answer the store has already been told once. */
function suggestionFor(label: string, settings: AdminSettings): string | undefined {
  const l = label.toLowerCase();
  const nonEmpty = (v?: string) => (v && v.trim() !== "" ? v.trim() : undefined);

  if (l.includes("gstin")) return nonEmpty(settings.docGstin);
  if (l.includes("registered legal name")) return nonEmpty(settings.docBusinessName);
  if (l.includes("registered address")) {
    const parts = [settings.docAddressLine1, settings.docAddressLine2, settings.docCity, settings.docPincode]
      .map((p) => p?.trim())
      .filter(Boolean);
    return parts.length ? parts.join(", ") : undefined;
  }
  if (l === "city" || l.includes("city and warehouse")) return nonEmpty(settings.docCity ?? settings.city);
  if (l.includes("support number") || l === "phone") return nonEmpty(settings.supportPhone);
  if (l.includes("grievance email")) return nonEmpty(settings.supportEmail);
  if (l === "name" || l.includes("officer name")) return nonEmpty(settings.docBusinessName);
  return undefined;
}

/** Every distinct blank in a block's HTML, in the order they appear. */
export function findPlaceholders(html: string, settings: AdminSettings): Placeholder[] {
  const counts = new Map<string, number>();
  for (const match of html.matchAll(PLACEHOLDER_RE)) {
    counts.set(match[0], (counts.get(match[0]) ?? 0) + 1);
  }

  return [...counts.entries()].map(([token, count]) => {
    const label = token.replace(/^\[TO CONFIRM:\s*/, "").replace(/\]$/, "").trim();
    return { token, label, count, suggestion: suggestionFor(label, settings) };
  });
}

/** Count the blanks left across a whole page, for the "3 still to confirm" badge. */
export function countPlaceholders(sections: CmsBlock[]): number {
  let n = 0;
  const walk = (blocks: CmsBlock[]) => {
    for (const b of blocks) {
      const html = typeof b.props?.html === "string" ? b.props.html : "";
      n += (html.match(PLACEHOLDER_RE) ?? []).length;
      if (b.children) walk(b.children);
    }
  };
  walk(sections);
  return n;
}

/**
 * Replace one blank everywhere it appears.
 *
 * Exact string replacement on the token, so a value containing regex-special
 * characters (an address with brackets, a phone with a +) is inserted literally.
 */
export function fillPlaceholder(html: string, token: string, value: string): string {
  return html.split(token).join(value);
}

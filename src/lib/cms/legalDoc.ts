import { sanitizeHtml } from "./sanitizeHtml";

export type LegalHeading = {
  id: string;
  text: string;
};

export type LegalDocument = {
  /** Sanitized body with a stable `id` on every h2 so the TOC can link to it. */
  html: string;
  headings: LegalHeading[];
};

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

/** Plain text of a heading's inner HTML — tags dropped, common entities decoded. */
function headingText(inner: string): string {
  return inner
    .replace(/<[^>]*>/g, "")
    .replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(text: string, fallback: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

/**
 * Prepare a long-form policy body for rendering: sanitize it through the shared
 * CMS sanitizer, then anchor every top-level (`h2`) section so the auto table of
 * contents can jump to it.
 *
 * Anchor ids are derived only from `[a-z0-9-]`, so nothing author-controlled can
 * escape the attribute — this runs after sanitization and must not widen it.
 */
export function buildLegalDocument(rawHtml: string): LegalDocument {
  const sanitized = sanitizeHtml(rawHtml);
  if (!sanitized) return { html: "", headings: [] };

  const headings: LegalHeading[] = [];
  const used = new Map<string, number>();

  const html = sanitized.replace(
    /<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi,
    (_match, attrs: string, inner: string) => {
      const text = headingText(inner);
      const base = slugify(text, `section-${headings.length + 1}`);
      const seen = used.get(base) ?? 0;
      used.set(base, seen + 1);
      const id = seen === 0 ? base : `${base}-${seen + 1}`;

      headings.push({ id, text });
      // Replace any author-supplied id so the anchor always matches the TOC.
      const rest = String(attrs).replace(/\sid\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
      return `<h2${rest} id="${id}">${inner}</h2>`;
    },
  );

  return { html, headings };
}

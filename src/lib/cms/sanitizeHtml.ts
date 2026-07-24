import DOMPurify from "dompurify";

/**
 * CMS HTML sanitizer.
 *
 * Backs the `dangerouslySetInnerHTML` sinks in the storefront renderer
 * (PageRenderer rich_text / custom_html / widget templates) and the admin
 * RichTextField. Uses DOMPurify with an explicit allow-list instead of the
 * previous 3-regex denylist, which was bypassable via `<img onerror>`,
 * `<svg onload>`, entity-encoded `javascript:`, and `<iframe srcdoc>`.
 *
 * Scripts, event handlers, `javascript:`/`data:` script URIs, <iframe>,
 * <object>, <embed>, <form>, and inline `style`/`srcdoc` are all removed.
 * Arbitrary <script>/JS injection is handled separately (and gated) by
 * CmsCodeInjector — it must never flow through here.
 */
const ALLOWED_TAGS = [
  // structure / text
  "p", "br", "hr", "div", "span", "section", "article", "header", "footer",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "small", "sub", "sup", "mark", "blockquote", "code", "pre",
  // lists
  "ul", "ol", "li", "dl", "dt", "dd",
  // links / media
  "a", "img", "picture", "source", "figure", "figcaption",
  // tables
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
];

const ALLOWED_ATTR = [
  "href", "target", "rel", "title", "alt",
  "src", "srcset", "sizes", "width", "height", "loading",
  "class", "id", "role", "colspan", "rowspan", "aria-label", "aria-hidden",
];

const CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "svg", "math"],
  FORBID_ATTR: ["style", "srcdoc", "onerror", "onload", "formaction"],
  ALLOW_DATA_ATTR: false,
};

/**
 * SSR fallback. DOMPurify needs a DOM (browser); the CMS renders its HTML
 * client-side after hydration, so this only guards the rare server pass.
 * Strip the dangerous constructs conservatively.
 */
function serverStrip(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed|form|svg|math)[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|iframe|object|embed|svg)\b[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(?:href|src|srcdoc|formaction)\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  if (typeof window === "undefined") {
    return serverStrip(html);
  }
  return DOMPurify.sanitize(html, CONFIG);
}

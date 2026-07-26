import DOMPurify, { type WindowLike } from "dompurify";

/**
 * CMS HTML sanitizer.
 *
 * Backs the `dangerouslySetInnerHTML` sinks in the storefront renderer
 * (PageRenderer rich_text / custom_html / widget templates), the legal-doc
 * builder, the product description, and the admin RichTextField. Uses DOMPurify
 * with an explicit allow-list instead of the previous 3-regex denylist, which
 * was bypassable via `<img onerror>`, `<svg onload>`, entity-encoded
 * `javascript:`, and `<iframe srcdoc>`.
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
 * DOMPurify needs a DOM, which the server does not have. It used to fall back
 * to a hand-rolled regex strip there; that was bypassable in both directions —
 * `<img/onerror=…>` never matched (the handler pattern demanded a leading
 * space) and a single non-recursive pass turned `jajavascript:vascript:` back
 * into a live `javascript:` URL. Worse, the two implementations disagreed about
 * what to keep (data-* attributes, tag normalisation), so an SSR'd page and its
 * hydrated copy rendered different markup and React bailed out.
 *
 * Lending DOMPurify a jsdom window makes the allow-list above the single source
 * of truth for both passes. The window is built once — jsdom start-up costs far
 * too much to pay per render.
 *
 * jsdom is held at 25.x on purpose. Next lists it in its default
 * `serverExternalPackages`, so it is never bundled — Node's own CJS loader
 * resolves it, and every jsdom from 27.4 on pulls ESM-only dependencies that
 * `require()` cannot read before Node 22.12. 25.x still declares `node >=18`
 * and loads on everything this project runs on.
 */
let serverPurifier: typeof DOMPurify | null = null;

export function sanitizeHtml(html: string): string {
  if (!html) return "";

  // The bundler folds `typeof window` to a literal per build target, so the
  // whole block — jsdom require included — is dead code in the browser bundle
  // and never reaches a client chunk. Keep the require inside this `if`: behind
  // a function boundary Turbopack resolves it before eliminating the branch,
  // and the browser build then fails on jsdom's `require("fs")`.
  if (typeof window === "undefined") {
    if (!serverPurifier) {
      // jsdom ships no types and @types/jsdom trails it by several majors —
      // the one constructor we use is easier to state than to mis-declare.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { JSDOM } = require("jsdom") as {
        JSDOM: new (html: string) => { window: WindowLike };
      };
      serverPurifier = DOMPurify(new JSDOM("").window);
    }
    return serverPurifier.sanitize(html, CONFIG);
  }

  return DOMPurify.sanitize(html, CONFIG);
}

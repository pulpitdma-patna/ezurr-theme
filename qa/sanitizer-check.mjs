#!/usr/bin/env node
/**
 * BUG-24 / BUG-14 regression check for src/lib/cms/sanitizeHtml.ts.
 *
 * Runs the REAL source file (transpiled on the fly with the repo's own
 * TypeScript) down both of its branches and asserts they agree:
 *
 *   - the server branch, with no `window` global, so it builds the jsdom window;
 *   - the browser branch, with a jsdom window installed as `globalThis.window`
 *     before the module loads, exactly as a real browser presents it.
 *
 * BUG-24 was that the server branch was not DOMPurify at all but a regex chain,
 * which let `<img/onerror=…>` and `jajavascript:vascript:` straight through.
 * BUG-14 was the same defect seen from the other side: the two branches
 * disagreed about `data-*`, so React's hydration bailed on every CMS page.
 *
 * Usage: node qa/sanitizer-check.mjs
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const themeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(themeRoot, "src/lib/cms/sanitizeHtml.ts");

/* ------------------------------------------------------------------ *
 * Build two independently-cached CommonJS copies of the real module.
 * They live under node_modules/ so bare imports ("dompurify", "jsdom")
 * resolve against the theme's own dependency tree.
 * ------------------------------------------------------------------ */
const ts = require("typescript");
const source = fs.readFileSync(sourcePath, "utf8");
const outDir = path.join(themeRoot, "node_modules/.cache/ezurr-sanitizer-check");
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;

const serverCopy = path.join(outDir, "server.cjs");
const browserCopy = path.join(outDir, "browser.cjs");
fs.writeFileSync(serverCopy, js);
fs.writeFileSync(browserCopy, js);

/** Forget dompurify so the next load re-reads whatever `window` is in scope. */
function forgetDomPurify() {
  for (const key of Object.keys(require.cache)) {
    if (key.includes(`${path.sep}dompurify${path.sep}`)) delete require.cache[key];
  }
}

const { JSDOM } = require("jsdom");
const dom = new JSDOM("");

/** Present a real window the way a browser does — as a global. */
function installWindow() {
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
}
function removeWindow() {
  delete globalThis.window;
  delete globalThis.document;
}

// The browser copy is loaded with a window in scope, so its module-level
// DOMPurify binds to that window exactly as it does in a real browser.
installWindow();
forgetDomPurify();
const browserModule = require(browserCopy);

// The server copy is loaded with no window at all.
removeWindow();
forgetDomPurify();
const serverModule = require(serverCopy);

fs.rmSync(outDir, { recursive: true, force: true });

// The `typeof window` guard is read per call, not per load, so the global has
// to be back in place while the browser copy runs or it takes the server path
// and the comparison below proves nothing.
function browserSanitize(html) {
  installWindow();
  try {
    return browserModule.sanitizeHtml(html);
  } finally {
    removeWindow();
  }
}
const serverSanitize = (html) => serverModule.sanitizeHtml(html);

/* ------------------------------------------------------------------ */

let failures = 0;
let checks = 0;

function check(name, ok, detail) {
  checks += 1;
  if (ok) {
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${name}`);
    if (detail) console.log(`        ${detail}`);
  }
}

/** Both branches must produce the same bytes — that is the whole point. */
function sanitize(input, label) {
  const server = serverSanitize(input);
  const browser = browserSanitize(input);
  check(
    `${label} — server and browser agree (hydration parity)`,
    server === browser,
    `server: ${JSON.stringify(server)}\n        browser: ${JSON.stringify(browser)}`,
  );
  return server;
}

console.log("\nBUG-24 — the two reported bypasses");
{
  // The old handler regex demanded a leading whitespace character, so a `/`
  // separator walked straight past it.
  const out = sanitize('<img/onerror="alert(1)" src=x>', "img/onerror");
  check("  no event handler survives", !/onerror/i.test(out), `got: ${out}`);

  // The old `javascript:` strip ran once and non-recursively, so removing the
  // inner occurrence spliced the outer halves into a working scheme.
  const out2 = sanitize('<a href="jajavascript:vascript:alert(1)">click me</a>', "nested javascript:");
  check("  no javascript: URL is reassembled", !/javascript:/i.test(out2), `got: ${out2}`);
}

console.log("\nBUG-14 — server/browser disagreement that broke hydration");
{
  const out = sanitize('<div data-sheets-root="1">pasted</div>', "data-sheets-root");
  check("  data-* attributes dropped (ALLOW_DATA_ATTR: false)", !/data-sheets-root/.test(out), `got: ${out}`);
}

console.log("\nOther payloads the regex chain also let through");
for (const [label, payload, forbidden] of [
  ["svg onload", "<svg onload=alert(1)></svg>", /onload|<svg/i],
  ["iframe srcdoc", '<iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;"></iframe>', /srcdoc|<iframe/i],
  ["unquoted handler", "<img src=x onerror=alert(1)>", /onerror/i],
  ["newline before handler", "<img src=x\nonerror=alert(1)>", /onerror/i],
  ["entity-encoded scheme", '<a href="java&#115;cript:alert(1)">x</a>', /javascript:/i],
  ["tab inside scheme", '<a href="java\tscript:alert(1)">x</a>', /javascript:/i],
  ["case + whitespace", '<A HREF=" JaVaScRiPt:alert(1)">x</A>', /javascript:/i],
  ["script element", "<script>alert(1)</script>", /<script/i],
  ["form + formaction", '<form><button formaction="javascript:alert(1)">go</button></form>', /formaction|<form/i],
  ["inline style", '<p style="background:url(javascript:alert(1))">x</p>', /style=/i],
]) {
  const out = sanitize(payload, label);
  check(`  ${label} neutralised`, !forbidden.test(out), `got: ${out}`);
}

console.log("\nLegitimate CMS markup still renders");
{
  const legit = [
    "<h2>Heading</h2>",
    '<p class="lead" id="intro">Text with <strong>bold</strong>, <em>italic</em> and',
    ' <a href="https://example.com" target="_blank" rel="noopener">a link</a>.</p>',
    "<ul><li>one</li><li>two</li></ul>",
    "<table><thead><tr><th>Head</th></tr></thead><tbody><tr><td colspan=\"2\">cell</td></tr></tbody></table>",
    '<img src="/logo.png" alt="Logo" width="80" height="80" loading="lazy">',
    "<blockquote>quoted</blockquote><pre><code>code()</code></pre>",
    '<a href="/pages/terms" title="Terms">relative link</a>',
    '<a href="mailto:hi@ezurr.test">mail</a>',
  ].join("\n");

  const out = sanitize(legit, "legit markup");
  for (const [what, probe] of [
    ["h2", "<h2>Heading</h2>"],
    ["class + id", 'class="lead" id="intro"'],
    ["strong/em", "<strong>bold</strong>"],
    ["external link with target/rel", 'href="https://example.com" target="_blank" rel="noopener"'],
    ["list", "<ul><li>one</li><li>two</li></ul>"],
    ["table cell with colspan", 'colspan="2"'],
    ["image attributes", 'src="/logo.png" alt="Logo" width="80" height="80" loading="lazy"'],
    ["blockquote + pre/code", "<blockquote>quoted</blockquote><pre><code>code()</code></pre>"],
    ["relative href", 'href="/pages/terms"'],
    ["mailto href", 'href="mailto:hi@ezurr.test"'],
  ]) {
    check(`  ${what} preserved`, out.includes(probe), `not found in: ${out}`);
  }
}

console.log("\nHousekeeping");
{
  check("  empty input round-trips", sanitize("", "empty") === "");
  const once = sanitize("<p>hi <b>there</b></p><img/onerror=alert(1) src=x>", "idempotence input");
  check("  sanitizing twice is a no-op", serverSanitize(once) === once, `${once} -> ${serverSanitize(once)}`);
  check(
    "  the regex fallback is gone from the source",
    !/serverStrip/.test(source),
    "sanitizeHtml.ts still mentions serverStrip",
  );
  check(
    "  exactly one sanitizer config in the source",
    (source.match(/ALLOWED_TAGS,/g) ?? []).length === 1,
    "more than one allow-list found",
  );
}

console.log(`\n${checks - failures}/${checks} checks passed.`);
process.exit(failures === 0 ? 0 : 1);

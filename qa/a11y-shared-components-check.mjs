// Regression check for A11Y-02/04/05 on the shared shell (layout, Header,
// Footer, HeroSlider). Runs against the dev server rather than a test runner —
// this repo has no jest/vitest and the assertions are about server-rendered
// markup and the emitted stylesheet.
//
//   node qa/a11y-shared-components-check.mjs [baseUrl]
//
// Pixel-level target sizes (A11Y-05) need real layout and are verified in a
// browser; what is guarded here is that the controls exist at all and that the
// skip link keeps its off-canvas-until-focused CSS.

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const failures = [];
const passes = [];

function check(name, condition, detail = "") {
  if (condition) passes.push(name);
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

async function text(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return res.text();
}

const home = await text(`${base}/`);

// A11Y-02 — the skip link is server-rendered and is the first focusable node in
// the body, ahead of the logo.
const skipIndex = home.indexOf('class="ez-skip-link"');
check("skip link is server-rendered", skipIndex !== -1);
check(
  "skip link targets the content anchor",
  /href="#ez-main"[^>]*class="ez-skip-link"|class="ez-skip-link"[^>]*href="#ez-main"/.test(home) ||
    (skipIndex !== -1 && home.slice(skipIndex - 200, skipIndex + 200).includes("#ez-main")),
);
const firstAnchor = home.search(/<a\s/);
check(
  "skip link precedes every other link",
  skipIndex !== -1 && firstAnchor !== -1 && firstAnchor < skipIndex + 200 && skipIndex - firstAnchor < 200,
  `first <a> at ${firstAnchor}, skip link at ${skipIndex}`,
);

// The off-canvas styling lives in globals.css; if it is dropped the link would
// sit visibly over the header on every page, so it is worth pinning.
const cssHref = home.match(/\/_next\/static\/chunks\/[^"']+\.css/)?.[0];
check("stylesheet reference found", Boolean(cssHref));
if (cssHref) {
  const css = await text(`${base}${cssHref}`);
  check("skip link rule is emitted", css.includes("ez-skip-link"));
  check("skip link is pinned above the sticky header", /ez-skip-link[^}]*z-index:\s*200/.test(css));
  check("skip link clears the 24px target minimum", /ez-skip-link[^}]*min-height:\s*44px/.test(css));
  check("skip link reveals itself on focus", /ez-skip-link:focus[^}]*opacity:\s*1/.test(css));
}

// A11Y-04 — the carousel ships a pause/play control.
check(
  "hero exposes a pause control",
  home.includes('aria-label="Pause slideshow"') || home.includes('aria-label="Play slideshow"'),
);
check("pause control reports its state", /aria-label="(Pause|Play) slideshow"[^>]*aria-pressed=/.test(home));

// A11Y-05 — the enlarged targets are padding-based, so the classes are the
// only server-visible evidence. Sizes themselves are measured in a browser.
check("carousel dots carry horizontal padding", home.includes("px-1.5"));
check("cart button has an enlarged hit box", /aria-label="Cart[^"]*"/.test(home) && home.includes("-mx-[5px]"));

console.log(`${passes.length} passed, ${failures.length} failed  (${base})`);
for (const f of failures) console.error(`  FAIL  ${f}`);
process.exit(failures.length === 0 ? 0 : 1);

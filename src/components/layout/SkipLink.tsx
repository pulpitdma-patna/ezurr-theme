"use client";

/**
 * First focusable element on every page, so keyboard users can jump past the
 * header instead of tabbing the logo, mega-menu, search, account and cart on
 * every navigation.
 *
 * The target is resolved on activation rather than being a fixed anchor: each
 * route mounts its own <Header> inside `children`, so the root layout has no
 * wrapper it could put an id on that sits *after* the header. A few routes
 * (product, brands) render no <main> at all, hence the sibling fallback.
 */
export function SkipLink() {
  return (
    <a
      href="#ez-main"
      className="ez-skip-link"
      onClick={(event) => {
        const target =
          document.getElementById("ez-main") ??
          document.querySelector("main") ??
          document.querySelector("header")?.nextElementSibling;
        if (!(target instanceof HTMLElement)) return;
        event.preventDefault();
        // Landmarks are not focusable by default; -1 lets us move focus there
        // without adding it to the tab order.
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus();
        target.scrollIntoView({ block: "start" });
      }}
    >
      Skip to main content
    </a>
  );
}

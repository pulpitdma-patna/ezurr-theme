"use client";

/**
 * Print rules for the order-document sheets.
 *
 * Lives inline rather than in globals.css because it is only ever mounted by
 * /admin/orders/[id]/documents — the admin shell already has its own print
 * rules there (.admin-chrome / .admin-shell-*), and these only cover the sheets.
 */
const CSS = `
@page { size: A4; margin: 12mm; }

.ez-doc-sheets { display: flex; flex-direction: column; gap: 1.25rem; }

@media print {
  /* Print exactly one document when the user asked for one. */
  .ez-doc-sheets[data-print="invoice"] .ez-doc--packing,
  .ez-doc-sheets[data-print="packing"] .ez-doc--invoice { display: none !important; }

  /* Only when both are printed does the second start a fresh sheet — an
     unconditional break-after would emit a trailing blank page. */
  .ez-doc-sheets[data-print="both"] .ez-doc + .ez-doc { break-before: page; }

  .ez-doc-sheets { gap: 0; }

  .ez-doc {
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    padding: 0 !important;
    background: #fff !important;
    color: #000 !important;
    font-size: 10.5pt;
  }

  /* A row split across a page boundary is unreadable on a warehouse floor. */
  .ez-doc tr,
  .ez-doc .ez-doc-keep { break-inside: avoid; }

  /* Repeat column headings on every sheet of a long order. */
  .ez-doc thead { display: table-header-group; }
  .ez-doc tfoot { display: table-footer-group; }

  .ez-doc a { color: inherit !important; text-decoration: none !important; }
}
`;

export function DocumentPrintStyles() {
  return <style>{CSS}</style>;
}

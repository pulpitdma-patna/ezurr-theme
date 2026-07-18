"use client";

import { Phase2Badge } from "@/components/admin/Phase2Badge";
import { formatInr, parsePrice, type AdminOrder } from "@/data/admin";
import { useAdminToast } from "@/components/admin/AdminToast";

/** Tax / invoice snapshot panel — UI preview until orders carry real tax fields. */
export function OrderTaxInvoicePanel({ order }: { order: AdminOrder }) {
  const toast = useAdminToast();
  const taxable = parsePrice(order.total);
  const cgst = Math.round(taxable * 0.09);
  const sgst = Math.round(taxable * 0.09);
  const invoiceId = `INV-${order.id.replace(/^EZX/, "")}`;

  return (
    <section className="rounded-lg border border-black/[0.08] bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-[-0.02em]">Tax & invoice</h2>
        <Phase2Badge label="Phase 2 · estimated" />
      </div>
      <p className="mb-3 text-xs text-[#86868B]">
        Split is illustrative (9% + 9%). Live CGST/SGST/IGST needs HSN, place of supply, and tax-inclusive lines on the order.
      </p>
      <dl className="space-y-1.5 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-[#86868B]">Invoice</dt>
          <dd className="ez-mono font-semibold">{invoiceId}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[#86868B]">Taxable value</dt>
          <dd className="ez-mono">{formatInr(taxable)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[#86868B]">CGST (est.)</dt>
          <dd className="ez-mono">{formatInr(cgst)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[#86868B]">SGST (est.)</dt>
          <dd className="ez-mono">{formatInr(sgst)}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-black/[0.06] pt-1.5">
          <dt className="font-semibold text-[#1D1D1F]">Invoice total</dt>
          <dd className="ez-mono font-semibold">{formatInr(taxable)}</dd>
        </div>
      </dl>
      <div className="mt-3 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => toast.push("Invoice PDF is UI-only — no file generated", "warning")}
          className="h-8 rounded-md bg-[#1D1D1F] text-xs font-semibold text-white"
        >
          Preview invoice PDF
        </button>
        <button
          type="button"
          onClick={() => toast.push("e-Invoice IRN reserved for Phase 2", "warning")}
          className="h-8 rounded-md border border-black/10 text-xs font-semibold"
        >
          Push e-Invoice
        </button>
      </div>
    </section>
  );
}

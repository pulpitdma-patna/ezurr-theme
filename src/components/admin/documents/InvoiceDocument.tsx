"use client";

import { formatInr } from "@/data/admin";
import type { ApiInvoiceDocument } from "@/lib/apiClient";
import {
  DocumentHeader,
  PartyBlock,
  SignatureLine,
  formatDocDate,
  metaLabelClass,
  sheetClass,
} from "@/components/admin/documents/DocumentParts";

/**
 * GST tax invoice. Every figure comes from the server payload as-is — the only
 * client-side arithmetic would be a rounding bug waiting to happen.
 */
export function InvoiceDocument({ doc }: { doc: ApiInvoiceDocument }) {
  const { totals, tax, payment } = doc;

  return (
    <article className={`${sheetClass} ez-doc--invoice`}>
      <DocumentHeader
        title={doc.title}
        logoUrl={doc.template.logoUrl}
        meta={[
          { label: "Invoice no.", value: doc.invoiceNumber },
          { label: "Invoice date", value: formatDocDate(doc.invoiceDate) },
          { label: "Order", value: doc.order.publicId },
        ]}
      />

      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <PartyBlock label="Sold by" party={doc.seller} showTaxIds />
        <PartyBlock label="Billed & shipped to" party={doc.buyer} />
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-left text-[11px]">
          <thead>
            <tr className="border-y border-black/[0.08] text-[#6E6E73]">
              <th className="py-2 pr-2 font-medium">#</th>
              <th className="py-2 pr-2 font-medium">Description</th>
              <th className="py-2 pr-2 font-medium">HSN</th>
              <th className="py-2 pr-2 text-right font-medium">Qty</th>
              <th className="py-2 pr-2 text-right font-medium">Rate</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((item, index) => (
              <tr key={`${item.sku ?? "line"}-${index}`} className="border-b border-black/[0.05]">
                <td className="py-2 pr-2 align-top text-[#86868B]">{index + 1}</td>
                <td className="py-2 pr-2 align-top">
                  <div className="font-medium">{item.title ?? "—"}</div>
                  {item.sku ? (
                    <div className="ez-mono text-[9px] text-[#86868B]">{item.sku}</div>
                  ) : null}
                </td>
                <td className="ez-mono py-2 pr-2 align-top text-[10px]">{item.hsn || "—"}</td>
                <td className="py-2 pr-2 text-right align-top">{item.qty}</td>
                <td className="ez-mono py-2 pr-2 text-right align-top">
                  {formatInr(item.unitPrice ?? 0)}
                </td>
                <td className="ez-mono py-2 text-right align-top font-medium">
                  {formatInr(item.lineTotal ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:justify-between">
        <div className="ez-doc-keep min-w-0 flex-1 space-y-2 text-[11px] text-[#424245]">
          <div>
            <span className={metaLabelClass}>Place of supply</span>
            <div className="mt-0.5 font-medium text-[#1D1D1F]">
              {tax.placeOfSupply ?? "Not determined"}
            </div>
          </div>
          {tax.note ? (
            <p className="rounded-md border border-black/[0.08] bg-[#FAFAFB] px-2.5 py-2 leading-relaxed">
              {tax.note}
            </p>
          ) : null}
          <div className="ez-mono text-[9px] uppercase tracking-[0.12em] text-[#86868B]">
            {payment.method === "cod" ? "Cash on delivery" : "Prepaid"} · GST {tax.ratePct}%
          </div>
        </div>

        <dl className="ez-doc-keep w-full text-[11px] sm:max-w-[17rem]">
          <Row label="Items total" value={formatInr(totals.linesTotal)} />
          {totals.discount > 0 ? (
            <Row label="Discount" value={`− ${formatInr(totals.discount)}`} />
          ) : null}
          <Row label="Shipping" value={formatInr(totals.shipping)} />
          <Row label="Taxable value" value={formatInr(totals.taxableValue)} />
          {tax.components.map((component) => (
            <Row
              key={component.code}
              label={`${component.label} @ ${component.ratePct}%`}
              value={formatInr(component.amount)}
            />
          ))}
          <Row label="Invoice total" value={formatInr(totals.total)} emphasis />
          <Row label="Paid" value={formatInr(payment.amountPaid)} />
          <Row
            label={payment.balanceLabel}
            value={formatInr(payment.balanceDue)}
            emphasis={payment.balanceDue > 0}
          />
        </dl>
      </div>

      {doc.template.declaration ? (
        <p className="ez-doc-keep mt-6 max-w-2xl text-[10px] leading-relaxed text-[#6E6E73]">
          {doc.template.declaration}
        </p>
      ) : null}

      {doc.template.signatureLine ? (
        <SignatureLine left="Customer signature" right={`For ${doc.seller.name ?? "the seller"}`} />
      ) : null}

      {doc.template.footerNote ? (
        <p className="ez-doc-keep mt-6 border-t border-black/[0.08] pt-3 text-center text-[10px] text-[#86868B]">
          {doc.template.footerNote}
        </p>
      ) : null}
    </article>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 border-b border-black/[0.05] py-1.5 ${
        emphasis ? "font-semibold text-[#1D1D1F]" : "text-[#424245]"
      }`}
    >
      <dt>{label}</dt>
      <dd className="ez-mono">{value}</dd>
    </div>
  );
}

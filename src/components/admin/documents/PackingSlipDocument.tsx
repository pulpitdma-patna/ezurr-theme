"use client";

import type { ApiPackingSlipDocument } from "@/lib/apiClient";
import {
  DocumentHeader,
  PartyBlock,
  SignatureLine,
  formatDocDate,
  metaLabelClass,
  sheetClass,
} from "@/components/admin/documents/DocumentParts";

/**
 * Warehouse pick/pack sheet. There is deliberately no money on this page — the
 * server payload does not even carry it, so nothing can leak into the parcel.
 */
export function PackingSlipDocument({ doc }: { doc: ApiPackingSlipDocument }) {
  const { order } = doc;

  return (
    <article className={`${sheetClass} ez-doc--packing`}>
      <DocumentHeader
        title={doc.title}
        logoUrl={doc.template.logoUrl}
        meta={[
          { label: "Order", value: order.publicId },
          { label: "Placed", value: formatDocDate(order.placedAt) },
          { label: "Units", value: String(order.unitCount ?? 0) },
        ]}
      />

      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <PartyBlock label="Ship to" party={doc.shipTo} />
        <div className="ez-doc-keep grid grid-cols-2 gap-4 sm:justify-items-end">
          <Detail label="Dispatch" value={doc.seller.name || "—"} />
          <Detail label="Carrier" value={order.carrierName || "Not assigned"} />
          <Detail label="AWB" value={order.awb || order.tracking || "—"} />
          <Detail label="Lines" value={String(order.lineCount ?? doc.items.length)} />
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[28rem] border-collapse text-left text-[11px]">
          <thead>
            <tr className="border-y border-black/[0.08] text-[#6E6E73]">
              <th className="py-2 pr-2 font-medium">#</th>
              <th className="py-2 pr-2 font-medium">Item</th>
              <th className="py-2 pr-2 font-medium">SKU</th>
              <th className="py-2 pr-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Picked</th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((item, index) => (
              <tr key={`${item.sku ?? "line"}-${index}`} className="border-b border-black/[0.05]">
                <td className="py-2.5 pr-2 align-top text-[#86868B]">{index + 1}</td>
                <td className="py-2.5 pr-2 align-top font-medium">{item.title ?? "—"}</td>
                <td className="ez-mono py-2.5 pr-2 align-top text-[10px]">{item.sku ?? "—"}</td>
                <td className="py-2.5 pr-2 text-right align-top text-[13px] font-semibold">
                  {item.qty}
                </td>
                <td className="py-2.5 text-right align-top">
                  <span
                    className="inline-block h-4 w-4 border border-black/30 align-middle"
                    aria-hidden
                  />
                  <span className="sr-only">Tick when picked</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {doc.template.signatureLine ? (
        <SignatureLine left="Packed by" right="Checked by" />
      ) : null}

      {doc.template.footerNote ? (
        <p className="ez-doc-keep mt-6 border-t border-black/[0.08] pt-3 text-center text-[10px] text-[#86868B]">
          {doc.template.footerNote}
        </p>
      ) : null}
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className={metaLabelClass}>{label}</div>
      <div className="mt-0.5 truncate text-[11px] font-medium">{value}</div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DocumentPrintStyles } from "@/components/admin/documents/DocumentPrintStyles";
import { InvoiceDocument } from "@/components/admin/documents/InvoiceDocument";
import { PackingSlipDocument } from "@/components/admin/documents/PackingSlipDocument";
import {
  api,
  isApiEnabled,
  type ApiInvoiceDocument,
  type ApiPackingSlipDocument,
} from "@/lib/apiClient";

type PrintTarget = "both" | "invoice" | "packing";

const btnClass =
  "inline-flex h-9 items-center rounded-lg border border-black/[0.08] bg-white px-3.5 text-xs font-semibold text-[#1D1D1F] shadow-[0_1px_2px_rgba(17,17,19,0.03)] transition hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

const primaryBtnClass =
  "inline-flex h-9 items-center rounded-lg bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white transition hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

export default function AdminOrderDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const apiOn = isApiEnabled();
  const [invoice, setInvoice] = useState<ApiInvoiceDocument | null>(null);
  const [slip, setSlip] = useState<ApiPackingSlipDocument | null>(null);
  const [loading, setLoading] = useState(apiOn);
  const [error, setError] = useState<string | null>(null);
  const [printTarget, setPrintTarget] = useState<PrintTarget>("both");

  useEffect(() => {
    if (!apiOn) return;
    let live = true;
    setLoading(true);
    Promise.all([api.adminOrderInvoice(id), api.adminOrderPackingSlip(id)])
      .then(([inv, pack]) => {
        if (!live) return;
        setInvoice(inv);
        setSlip(pack);
        setError(null);
      })
      .catch((err) => {
        if (!live) return;
        setInvoice(null);
        setSlip(null);
        setError(err instanceof Error ? err.message : "Could not fetch these two sheets.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [apiOn, id]);

  // The browser prints the whole page, so "print one document" is expressed by
  // hiding the other for the duration of the dialog.
  useEffect(() => {
    const reset = () => setPrintTarget("both");
    window.addEventListener("afterprint", reset);
    return () => window.removeEventListener("afterprint", reset);
  }, []);

  const print = useCallback((target: PrintTarget) => {
    // window.print() blocks synchronously — the attribute has to be in the DOM
    // before it runs, so the state update cannot wait for the next render pass.
    flushSync(() => setPrintTarget(target));
    window.print();
  }, []);

  return (
    <div>
      <DocumentPrintStyles />

      <div className="admin-print-hide">
        <AdminPageHeader
          title="Bill and packing list"
          description="Print these, or save them as a PDF from the printer box that opens."
          breadcrumbs={[
            { label: "Orders", href: "/admin/orders" },
            { label: id, href: `/admin/orders/${id}` },
            { label: "Bill and packing list" },
          ]}
          actions={
            <>
              <Link href={`/admin/orders/${id}`} className={btnClass}>
                Back to order
              </Link>
              <button
                type="button"
                onClick={() => print("packing")}
                disabled={!slip}
                className={`${btnClass} disabled:opacity-50`}
              >
                Print the packing list
              </button>
              <button
                type="button"
                onClick={() => print("invoice")}
                disabled={!invoice}
                className={`${primaryBtnClass} disabled:opacity-50`}
              >
                Print the bill
              </button>
            </>
          }
        />

        {!apiOn ? (
          <AdminNotice tone="demo">
            Practice shop. There is no real order behind this, so nothing here is worth printing.
          </AdminNotice>
        ) : null}
        {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}
        {invoice && !invoice.tax.stateResolved ? (
          <AdminNotice tone="demo">{invoice.tax.note}</AdminNotice>
        ) : null}
        {invoice && !invoice.seller.gstin ? (
          <AdminNotice tone="demo">
            Your GST number is not on this bill.{" "}
            <Link href="/admin/settings?tab=tax" className="underline">
              Add it in Shop settings
            </Link>
            .
          </AdminNotice>
        ) : null}
        {loading ? (
          <p className="ez-mono py-10 text-center text-[10px] uppercase tracking-[0.16em] text-[#86868B]">
            Getting them ready…
          </p>
        ) : null}
      </div>

      <div className="ez-doc-sheets" data-print={printTarget}>
        {invoice ? <InvoiceDocument doc={invoice} /> : null}
        {slip ? <PackingSlipDocument doc={slip} /> : null}
      </div>
    </div>
  );
}

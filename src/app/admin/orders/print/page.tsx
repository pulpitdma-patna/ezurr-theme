"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { DocumentPrintStyles } from "@/components/admin/documents/DocumentPrintStyles";
import { PackingSlipDocument } from "@/components/admin/documents/PackingSlipDocument";
import { adminErrorMessage } from "@/lib/adminError";
import { api, type ApiPackingSlipDocument } from "@/lib/apiClient";

/**
 * Print a stack of packing lists in one go.
 *
 * Getting twenty orders into boxes used to mean twenty round trips: open the
 * order, press print, dismiss the printer dialog, press back, repeat — roughly
 * eighty clicks and forty screen changes for one morning's post.
 *
 * Worse, the button he could find printed the ORDER SCREEN, which carries the
 * payment card, so the slip going into the parcel showed the customer what the
 * shop charged. The real PackingSlipDocument has always refused to print prices.
 * It simply had nothing linking to it.
 *
 * One failed fetch never blocks the run: the slips that loaded are printed and
 * the ones that did not are named at the top, because nineteen parcels going out
 * beats none going out.
 */
function PrintRun() {
  const router = useRouter();
  const params = useSearchParams();
  const ids = (params.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  const [docs, setDocs] = useState<ApiPackingSlipDocument[]>([]);
  const [failed, setFailed] = useState<{ id: string; reason: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    void (async () => {
      const results = await Promise.allSettled(ids.map((id) => api.adminOrderPackingSlip(id)));
      if (cancelled) return;

      const ok: ApiPackingSlipDocument[] = [];
      const bad: { id: string; reason: string }[] = [];
      results.forEach((r, i) => {
        if (r.status === "fulfilled") ok.push(r.value);
        else bad.push({ id: ids[i], reason: adminErrorMessage(r.reason, "Could not load it.") });
      });

      setDocs(ok);
      setFailed(bad);
      setLoading(false);

      // One print dialog, once everything that is coming has arrived.
      if (ok.length > 0) {
        window.setTimeout(() => window.print(), 100);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get("ids")]);

  // Back to the list when the printer dialog closes, so he is where the next
  // action is rather than on a page of paper he has already used.
  useEffect(() => {
    function done() {
      router.back();
    }
    window.addEventListener("afterprint", done);
    return () => window.removeEventListener("afterprint", done);
  }, [router]);

  if (ids.length === 0) {
    return (
      <div className="p-6">
        <AdminNotice tone="error">
          No orders were chosen to print. Go back, tick the orders you are packing, then press
          Print.
        </AdminNotice>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <DocumentPrintStyles />

      {/* Screen-only chrome — never on the paper. */}
      <div className="print:hidden">
        {loading ? (
          <div className="ez-mono p-6 text-center text-[11px] uppercase tracking-[0.16em] text-[#86868B]">
            Getting {ids.length} packing list{ids.length === 1 ? "" : "s"} ready…
          </div>
        ) : null}

        {failed.length > 0 ? (
          <div className="p-4">
            <AdminNotice tone="error">
              {failed.length} of {ids.length} could not be loaded and are not in this print run:{" "}
              {failed.map((f) => f.id).join(", ")}. {failed[0].reason}
            </AdminNotice>
          </div>
        ) : null}

        {!loading && docs.length > 0 ? (
          <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-3">
            <div className="text-sm font-semibold">
              {docs.length} packing list{docs.length === 1 ? "" : "s"} ready
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex h-8 items-center rounded-lg bg-[#1D1D1F] px-3 text-xs font-semibold text-white"
              >
                Print again
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex h-8 items-center rounded-lg border border-black/[0.08] bg-white px-3 text-xs font-semibold"
              >
                Back to orders
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {docs.map((doc, i) => (
        <div
          key={doc.order?.publicId ?? i}
          // Each slip starts a new sheet; the last one must not add a blank page.
          style={{ breakAfter: i === docs.length - 1 ? "auto" : "page" }}
        >
          <PackingSlipDocument doc={doc} />
        </div>
      ))}
    </div>
  );
}

export default function AdminOrdersPrintPage() {
  return (
    <Suspense fallback={null}>
      <PrintRun />
    </Suspense>
  );
}

"use client";

import type { ApiDocumentParty } from "@/lib/apiClient";

export const sheetClass =
  "ez-doc rounded-xl border border-black/[0.08] bg-white p-6 text-[#1D1D1F] shadow-[0_1px_2px_rgba(17,17,19,0.03)] sm:p-8";

export const metaLabelClass =
  "ez-mono text-[8px] uppercase tracking-[0.14em] text-[#86868B]";

export function formatDocDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** A seller/buyer address panel. `party.state` is blank when we could not resolve it. */
export function PartyBlock({
  label,
  party,
  showTaxIds = false,
}: {
  label: string;
  party: ApiDocumentParty;
  showTaxIds?: boolean;
}) {
  const locality = [party.city, party.state, party.pincode]
    .filter((v) => Boolean(v && String(v).trim()))
    .join(", ");

  return (
    <div className="ez-doc-keep min-w-0">
      <div className={metaLabelClass}>{label}</div>
      <div className="mt-1 text-[13px] font-semibold tracking-[-0.01em]">
        {party.name || "—"}
      </div>
      <div className="mt-0.5 space-y-0.5 text-[11px] leading-relaxed text-[#424245]">
        {party.addressLines.map((line) => (
          <div key={line}>{line}</div>
        ))}
        {locality ? <div>{locality}</div> : null}
        {party.mobile ? <div>Phone {party.mobile}</div> : null}
        {party.phone ? <div>Phone {party.phone}</div> : null}
        {party.email ? <div>{party.email}</div> : null}
        {showTaxIds && party.gstin ? (
          <div className="ez-mono pt-0.5">GSTIN {party.gstin}</div>
        ) : null}
        {showTaxIds && party.pan ? <div className="ez-mono">PAN {party.pan}</div> : null}
      </div>
    </div>
  );
}

/** Label / value pair used in the document header strip. */
export function MetaPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="ez-doc-keep">
      <div className={metaLabelClass}>{label}</div>
      <div className="mt-0.5 text-[12px] font-semibold tracking-[-0.01em]">{value}</div>
    </div>
  );
}

export function DocumentHeader({
  title,
  logoUrl,
  meta,
}: {
  title: string;
  logoUrl: string;
  meta: { label: string; value: string }[];
}) {
  return (
    <header className="ez-doc-keep flex flex-wrap items-start justify-between gap-4 border-b border-black/[0.08] pb-4">
      <div className="flex min-w-0 items-center gap-3">
        {logoUrl ? (
          // Not next/image: the URL is admin-supplied and may be any host, and a
          // print sheet gains nothing from the optimiser.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-10 w-auto max-w-[9rem] object-contain" />
        ) : null}
        <h2 className="text-lg font-semibold tracking-[-0.02em]">{title}</h2>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {meta.map((m) => (
          <MetaPair key={m.label} label={m.label} value={m.value} />
        ))}
      </div>
    </header>
  );
}

export function SignatureLine({ left, right }: { left: string; right: string }) {
  return (
    <div className="ez-doc-keep mt-8 flex flex-wrap items-end justify-between gap-6">
      <div className="min-w-[9rem] flex-1">
        <div className="h-8 border-b border-black/25" />
        <div className={`${metaLabelClass} mt-1`}>{left}</div>
      </div>
      <div className="min-w-[9rem] flex-1">
        <div className="h-8 border-b border-black/25" />
        <div className={`${metaLabelClass} mt-1 sm:text-right`}>{right}</div>
      </div>
    </div>
  );
}

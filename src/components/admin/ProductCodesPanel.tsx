"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { api, isApiEnabled, type ApiDigitalCode } from "@/lib/apiClient";

/**
 * Game codes, inside the product they belong to.
 *
 * They used to live on their own screen, /admin/digital-codes, whose first
 * control was a free-text box labelled "Product key (e.g. psn-1000)". Loading a
 * batch meant knowing and correctly typing a slug — and a typo did not fail
 * loudly, it 404'd with "Product not found" after he had already pasted fifty
 * codes. Here the product is already chosen, so that box cannot exist.
 *
 * Three words also went: the vault reports `available` / `assigned` /
 * `redeemed`. He is told **Unsold**, **Sent to a customer** and **Used**.
 *
 * There is no reveal-the-code button and there is not going to be one. Codes on
 * a shop laptop that a customer can see over the counter is a worse problem
 * than the one it solves; what he actually wants when a code is bad is to send
 * a different one, which is the order screen's job.
 */

const STATUS_LABELS: Record<string, string> = {
  available: "Unsold",
  reserved: "Held for an order",
  assigned: "Sent to a customer",
  redeemed: "Used",
};

const STATUS_TONES: Record<string, string> = {
  available: "bg-[#EAF6ED] text-[#2D6B3C]",
  reserved: "bg-[#FEF6E7] text-[#8A5A00]",
  assigned: "bg-[#DBEAFE] text-[#1D4ED8]",
  redeemed: "bg-[#F0F0F2] text-[#6E6E73]",
};

export function ProductCodesPanel({
  productKey,
  onCountChange,
}: {
  /** The product these codes belong to. Never typed by hand. */
  productKey: string;
  /** Unsold count, so the list cell can stop lying about stock. */
  onCountChange?: (productKey: string, unsold: number) => void;
}) {
  const apiOn = isApiEnabled();
  const [codes, setCodes] = useState<ApiDigitalCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiDigitalCode | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    if (!apiOn || !productKey) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.adminDigitalCodes({ productKey, per_page: 100 });
      const rows = Array.isArray(res.data) ? res.data : [];
      setCodes(rows);
      onCountChange?.(productKey, rows.filter((c) => c.status === "available").length);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the codes for this product.");
    } finally {
      setLoading(false);
    }
  }, [apiOn, productKey, onCountChange]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function addCodes(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.importDigitalCodes(productKey, trimmed);
      // Say what really happened, in one sentence, including the part he did not
      // ask for: duplicates are silently skipped, and a batch that was entirely
      // duplicates would otherwise read as a success.
      setMessage(
        res.imported === 0
          ? `Nothing added — all ${res.skipped} of those codes are already loaded.`
          : res.skipped > 0
            ? `${res.imported} code${res.imported === 1 ? "" : "s"} added. ${res.skipped} were already here.`
            : `${res.imported} code${res.imported === 1 ? "" : "s"} added.`,
      );
      setPaste("");
      await reload();
    } catch (err) {
      setMessage(null);
      setError(err instanceof Error ? err.message : "Could not add those codes.");
    } finally {
      setBusy(false);
    }
  }

  /** A supplier's file is one code per line — CSV or txt, first column. */
  async function readFile(file: File) {
    const text = await file.text();
    const lines = text
      .split(/\r\n|\r|\n/)
      .map((line) => (line.includes(",") ? line.split(",")[0] : line).trim())
      .filter((line) => line && !/^(code|codes|key|keys)$/i.test(line));
    if (lines.length === 0) {
      setError(`${file.name} had no codes in it.`);
      return;
    }
    await addCodes(lines.join("\n"));
  }

  async function doDelete() {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    try {
      await api.deleteDigitalCode(target.id);
      setMessage("That code is off the list. Nothing was sent to anyone.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove that code.");
    }
  }

  const unsold = codes.filter((c) => c.status === "available").length;

  if (!apiOn) {
    return (
      <AdminNotice tone="demo">
        Game codes need the live shop. Nothing here is real yet.
      </AdminNotice>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border border-black/[0.07] bg-white p-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[13px] font-semibold text-[#1D1D1F]">Game codes</h3>
        <span className="text-[12px] text-[#6E6E73]">
          {loading ? "Counting…" : `${unsold} unsold`}
        </span>
      </div>

      {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}
      {message ? <AdminNotice tone="info">{message}</AdminNotice> : null}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void readFile(file);
        }}
        className={`rounded-lg border border-dashed p-3 ${
          dragging ? "border-[#1D1D1F] bg-[#F5F5F7]" : "border-black/[0.14] bg-[#FAFAFB]"
        }`}
      >
        <label className="block">
          <span className="text-[12px] font-medium text-[#424245]">
            Paste the codes your supplier sent — one per line
          </span>
          <textarea
            rows={3}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 font-mono text-[12px] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
          />
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy || !paste.trim()}
            onClick={() => void addCodes(paste)}
            className="inline-flex h-9 items-center rounded-lg bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            {busy ? "Adding…" : "Add codes"}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex h-9 items-center rounded-lg border border-black/10 px-3 text-xs font-semibold text-[#424245]"
          >
            Load a file from your supplier
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void readFile(file);
              e.target.value = "";
            }}
          />
          <span className="text-[11px] text-[#86868B]">or drop the file here</span>
        </div>
      </div>

      {loading ? null : codes.length === 0 ? (
        <p className="text-[12px] leading-snug text-[#6E6E73]">
          No codes loaded yet, so nobody can buy this. Paste them above and it
          goes on sale immediately.
        </p>
      ) : (
        <ul className="divide-y divide-black/[0.06] rounded-lg border border-black/[0.06]">
          {codes.slice(0, 50).map((code) => (
            <li key={code.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="ez-mono truncate text-[11px] text-[#1D1D1F]">
                {code.masked_code}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${
                    STATUS_TONES[code.status] ?? "bg-[#F0F0F2] text-[#6E6E73]"
                  }`}
                >
                  {STATUS_LABELS[code.status] ?? code.status}
                </span>
                {code.status === "available" ? (
                  <button
                    type="button"
                    onClick={() => setPendingDelete(code)}
                    className="text-[11px] font-semibold text-[#B42318]"
                  >
                    Remove
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
      {codes.length > 50 ? (
        <p className="text-[11px] text-[#86868B]">
          Showing the 50 most recent of {codes.length}.
        </p>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove this code?"
        description={
          "It comes off the list and can never be sold. Nothing is sent to any customer, and no other code is touched. You paid your supplier for it — only do this if you know it is dead."
        }
        confirmLabel="Remove the code"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void doDelete()}
      />
    </section>
  );
}

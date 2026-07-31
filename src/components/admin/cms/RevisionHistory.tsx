"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { formatAdminDateTime } from "@/lib/adminFormat";
import {
  listRevisions,
  restoreRevision,
  type CmsRevisionSummary,
} from "@/lib/cms/cmsApi";

/**
 * Version history, backed by the server's revisions table.
 *
 * What this replaces listed local "Checkpoint" entries and restored one the
 * instant you clicked it — no confirmation, no record of what you were on, and
 * nothing to come back to if you picked the wrong row.
 *
 * Two things make it usable rather than merely present: consecutive autosaves
 * collapse into one line (a page edited for ten minutes produces dozens, and a
 * wall of "Autosave 3:42 pm" hides the publish you were looking for), and
 * Restore writes the current draft as a version first, server-side, so the
 * action is reversible.
 */

const KIND_LABEL: Record<CmsRevisionSummary["kind"], string> = {
  save: "Autosave",
  publish: "Published",
  rollback: "Restored",
  import: "Original",
  delete: "Deleted",
};

function formatWhen(iso: string | null): string {
  return formatAdminDateTime(iso, "");
}

type Group =
  | { type: "one"; rev: CmsRevisionSummary }
  | { type: "autosaves"; revs: CmsRevisionSummary[] };

/** Collapse consecutive autosaves; keep every publish, rollback and import. */
function group(revs: CmsRevisionSummary[]): Group[] {
  const out: Group[] = [];
  for (const rev of revs) {
    const last = out[out.length - 1];
    if (rev.kind === "save" && last?.type === "autosaves") {
      last.revs.push(rev);
    } else if (rev.kind === "save") {
      out.push({ type: "autosaves", revs: [rev] });
    } else {
      out.push({ type: "one", rev });
    }
  }
  return out;
}

export function RevisionHistory({
  pageId,
  onClose,
  onRestored,
}: {
  pageId: string;
  onClose: () => void;
  /** Reload the page from the server — the draft it holds is now stale. */
  onRestored: () => void;
}) {
  const [revs, setRevs] = useState<CmsRevisionSummary[] | null>(null);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [confirming, setConfirming] = useState<CmsRevisionSummary | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = useCallback(
    (res: Awaited<ReturnType<typeof listRevisions>>) => {
      if (!res.ok) {
        setError(
          res.error.kind === "offline"
            ? "Practice shop. Earlier versions of a page are kept on your server, and there isn't one yet."
            : res.error.message,
        );
        setRevs([]);
        return;
      }
      setError(null);
      setRevs(res.data.data);
      setPublishedId(res.data.publishedRevisionId);
    },
    [],
  );

  const reload = useCallback(
    () => listRevisions(pageId).then(apply),
    [pageId, apply],
  );

  useEffect(() => {
    let cancelled = false;
    void listRevisions(pageId).then((res) => {
      if (!cancelled) apply(res);
    });
    return () => {
      cancelled = true;
    };
  }, [pageId, apply]);

  const groups = revs ? group(revs) : [];

  const row = (rev: CmsRevisionSummary, nested = false) => (
    <li key={rev.id}>
      <div
        className={`flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-[#F5F5F7] ${
          nested ? "pl-6" : ""
        }`}
      >
        <div className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-xs font-semibold text-[#1D1D1F]">
              {rev.label || KIND_LABEL[rev.kind]}
            </span>
            {rev.id === publishedId ? (
              <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800">
                LIVE
              </span>
            ) : null}
          </span>
          <span className="ez-mono block truncate text-[10px] text-[#A1A1A6]">
            {formatWhen(rev.createdAt)} · {rev.author ?? "System"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setConfirming(rev)}
          className="shrink-0 rounded-lg border border-black/[0.1] px-2 py-1 text-[10px] font-semibold hover:bg-white"
        >
          Restore
        </button>
      </div>
    </li>
  );

  return (
    <div className="absolute inset-y-0 left-[260px] z-20 flex w-[340px] flex-col border-r border-black/[0.08] bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-black/[0.06] px-3 py-2.5">
        <p className="m-0 text-sm font-semibold">Earlier versions</p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold text-[#6E6E73]"
        >
          Close
        </button>
      </div>

      <ul className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {error ? (
          <li className="px-3 py-6 text-center text-xs text-[#6E6E73]">{error}</li>
        ) : revs === null ? (
          <li className="px-3 py-6 text-center text-xs text-[#A1A1A6]">Loading…</li>
        ) : revs.length === 0 ? (
          <li className="px-3 py-6 text-center text-xs text-[#A1A1A6]">
            No versions yet. One is kept every time this page saves.
          </li>
        ) : (
          groups.map((g, i) =>
            g.type === "one" ? (
              row(g.rev)
            ) : g.revs.length === 1 ? (
              row(g.revs[0])
            ) : (
              <li key={`auto-${i}`}>
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      if (next.has(i)) next.delete(i);
                      else next.add(i);
                      return next;
                    })
                  }
                  className="w-full rounded-xl px-3 py-2 text-left text-[11px] text-[#86868B] hover:bg-[#F5F5F7]"
                >
                  {expanded.has(i) ? "▾" : "▸"} {g.revs.length} autosaves ·{" "}
                  {formatWhen(g.revs[g.revs.length - 1].createdAt)} –{" "}
                  {formatWhen(g.revs[0].createdAt)}
                </button>
                {expanded.has(i) ? (
                  <ul className="space-y-0.5">{g.revs.map((r) => row(r, true))}</ul>
                ) : null}
              </li>
            ),
          )
        )}
      </ul>

      <ConfirmDialog
        open={confirming !== null}
        title="Go back to this version?"
        description={
          confirming
            ? `The page will go back to how it was on ${formatWhen(confirming.createdAt)}.\n\nYour current draft is saved as a version first, so you can always come back to it. Nothing goes live until you press Publish.`
            : ""
        }
        confirmLabel={busy ? "Restoring…" : "Go back to it"}
        onCancel={() => setConfirming(null)}
        onConfirm={async () => {
          const target = confirming;
          setConfirming(null);
          if (!target) return;
          setBusy(true);
          const res = await restoreRevision(pageId, target.id);
          setBusy(false);
          if (res.ok) {
            onRestored();
            void reload();
          } else {
            setError(res.error.message);
          }
        }}
      />
    </div>
  );
}

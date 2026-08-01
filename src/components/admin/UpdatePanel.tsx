"use client";

import { useCallback, useEffect, useState } from "react";
import { adminErrorMessage } from "@/lib/adminError";
import { formatAdminDateTime } from "@/lib/adminFormat";
import { api, ApiError, getApiUpstreamUrl, type ApiSystemUpdate } from "@/lib/apiClient";

/**
 * Applying a release, for someone who has never used a terminal.
 *
 * This replaces a panel that dead-ended: it told him an update had not
 * finished, then asked him to get somebody to run `php artisan ezurr:update`.
 * He has nobody, so his shop stayed on the old release — including the releases
 * that fix whatever he was complaining about.
 *
 * Every sentence here is written for him. No "migrations", no "cache", no
 * "queue worker", no command he cannot run. What he needs to know is only ever:
 * is something waiting, is it safe, what is happening now, and did it work.
 */

const panelClass =
  "overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(17,17,19,0.03)]";

/** One sentence per way the copy can fail. He never sees a reason code. */
const BACKUP_TROUBLE: Record<string, string> = {
  unsupported_driver:
    "A copy of your records cannot be made on this server automatically.",
  no_tool: "This server does not allow the shop to make its own copy of your records.",
  failed: "The copy of your records did not finish, so nothing was changed.",
  not_writable: "There is nowhere on this server for the shop to save a copy of your records.",
};

/**
 * The server signs a RELATIVE link, so the admin puts the API's own origin in
 * front. An absolute one would have been built from the host the request came
 * in on — and this admin reaches the API through the storefront's proxy, so the
 * link pointed at the storefront, which does not serve it.
 */
function downloadHref(href: string): string {
  return `${getApiUpstreamUrl() ?? ""}${href}`;
}

function bytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function UpdatePanel() {
  const [state, setState] = useState<ApiSystemUpdate | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setState(await api.systemUpdate());
    } catch {
      // The panel simply does not appear. This screen has its own error line
      // for the health call, and two error banners about the same server would
      // say the same thing twice.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function apply(ownBackup: boolean) {
    setBusy(true);
    setError("");
    setConfirming(false);
    try {
      const result = await api.applySystemUpdate(ownBackup ? { backupTakenMyself: true } : {});
      setState(result.status);
    } catch (e) {
      if (e instanceof ApiError) {
        const body = e.body as { reason?: string; backup?: { reason?: string } } | null;
        const reason = body?.reason;
        if (reason === "already_running") {
          setError("An update is already being put in place. Give it a minute, then look again.");
        } else if (reason === "backup_failed") {
          setError(
            (BACKUP_TROUBLE[body?.backup?.reason ?? ""] ??
              "A copy of your records could not be made, so nothing was changed.") +
              " Nothing has changed. If you have taken your own copy, you can go ahead below.",
          );
        } else if (reason === "database_unreachable") {
          setError("This server cannot reach where your records are kept, so nothing was changed.");
        } else {
          setError(adminErrorMessage(e, "The update did not finish. Nothing else was changed."));
        }
      } else {
        setError(adminErrorMessage(e, "The update did not finish. Nothing else was changed."));
      }
      void load();
    } finally {
      setBusy(false);
    }
  }

  if (!state) return null;

  const run = state.lastRun;
  const waiting = state.updateNeeded || state.pendingMigrations > 0;
  const newestBackup = state.backups[0];

  // A run whose request was killed comes back as `stopped` rather than
  // `running`, so this can never sit spinning at him for ever.
  if (run?.status === "stopped") {
    return (
      <section className={`${panelClass} border-[#F4D8A8] bg-[#FEF6E7]`}>
        <div className="p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold tracking-[-0.03em] text-[#8A5A00]">
            An update stopped without saying how it went
          </h2>
          <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-[#8A5A00]">
            Your shop is on version {state.installedVersion ?? "an unknown version"} and the files
            here are version {state.codeVersion}.{" "}
            {waiting
              ? "Press Apply the update to try again — it will pick up from where it stopped."
              : "It looks like it finished anyway."}
          </p>
          <ApplyButton
            disabled={busy}
            busy={busy}
            onClick={() => (state.backupAvailable ? setConfirming(true) : apply(true))}
          />
        </div>
      </section>
    );
  }

  if (!waiting) {
    return (
      <section className={panelClass}>
        <div className="p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold tracking-[-0.03em] text-[#1D1D1F]">
            Your shop is up to date
          </h2>
          <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-[#6E6E73]">
            Version {state.codeVersion}. There is nothing waiting to be put in place.
            {run?.status === "done" && run.finishedAt
              ? ` Last updated ${formatAdminDateTime(run.finishedAt)}.`
              : ""}
          </p>
          {newestBackup ? (
            <p className="mt-3 text-[12px] text-[#6E6E73]">
              A copy of your records from {formatAdminDateTime(newestBackup.at)} is saved on the
              server.{" "}
              <a
                href={downloadHref(newestBackup.href)}
                className="font-semibold underline underline-offset-2"
                download
              >
                Download it
              </a>{" "}
              ({bytes(newestBackup.bytes)})
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className={`${panelClass} border-[#F4D8A8] bg-[#FEF6E7]`}>
      <div className="p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold tracking-[-0.03em] text-[#8A5A00]">
          There is an update waiting
        </h2>
        <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-[#8A5A00]">
          Your shop is running version {state.installedVersion ?? "a version nobody wrote down"} and
          the files on this server are version {state.codeVersion}. Until it is put in place, parts
          of this admin can behave oddly, or look like they saved and quietly save nothing.
        </p>

        {run?.status === "failed" ? (
          <p className="mt-3 max-w-2xl text-[12px] leading-relaxed text-[#B42318]">
            <strong>The last try did not finish.</strong>{" "}
            {run.ownBackup
              ? "You told us you had taken your own copy, so there is nothing here to download."
              : run.backup?.name
                ? `Your copy from just before it is still on the server. Pressing Apply again will try that step again.`
                : "Nothing was changed. Pressing Apply again will try again."}
          </p>
        ) : null}

        {error ? (
          <p className="mt-3 max-w-2xl text-[12px] leading-relaxed text-[#B42318]">{error}</p>
        ) : null}

        {confirming ? (
          <div className="mt-4 rounded-xl border border-[#F4D8A8] bg-white/70 p-4">
            <p className="text-[12px] leading-relaxed text-[#8A5A00]">
              A copy of everything — your orders, your customers, your products — is saved first, so
              nothing can be lost. Your shop stays open while this happens. It usually takes under a
              minute.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void apply(false)}
                className="inline-flex h-9 items-center rounded-lg bg-[#1D1D1F] px-4 text-[12px] font-semibold text-white transition hover:bg-[#2C2C2E]"
              >
                Yes, apply it now
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="inline-flex h-9 items-center rounded-lg border border-black/[0.08] bg-white px-4 text-[12px] font-semibold text-[#1D1D1F]"
              >
                Not now
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-3 text-[12px] leading-relaxed text-[#8A5A00]">
              {/* Said BEFORE he presses. On hosting that forbids it this can
                  never work, and finding that out from a refusal every single
                  time would be the wrong moment. */}
              {state.backupAvailable
                ? "A copy of your shop's records is saved first, so nothing can be lost."
                : "This server will not let the shop make its own copy of your records. Take your own copy first, or ask whoever set your shop up to do it."}
            </p>
            <ApplyButton
              disabled={busy}
              busy={busy}
              label={state.backupAvailable ? "Apply the update" : "I have taken my own copy — apply it"}
              onClick={() => (state.backupAvailable ? setConfirming(true) : apply(true))}
            />
          </>
        )}
      </div>
    </section>
  );
}

function ApplyButton({
  disabled,
  busy,
  label = "Apply the update",
  onClick,
}: {
  disabled: boolean;
  busy: boolean;
  label?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="mt-4 inline-flex h-10 items-center rounded-lg bg-[#1D1D1F] px-4 text-[12.5px] font-semibold text-white transition hover:bg-[#2C2C2E] disabled:opacity-60"
    >
      {/* Disabled while it runs, so a second tap cannot start a second one —
          the server refuses one anyway, but he should not have to find out
          from an error message. */}
      {busy ? "Putting the update in place…" : label}
    </button>
  );
}

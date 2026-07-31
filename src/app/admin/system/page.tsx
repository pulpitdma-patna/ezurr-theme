"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { formatAdminDateTime } from "@/lib/adminFormat";
import { adminErrorMessage } from "@/lib/adminError";
import {
  api,
  ApiError,
  getApiUpstreamUrl,
  isApiEnabled,
  type ApiSystemHealth,
} from "@/lib/apiClient";

/**
 * What this install is, and what is quietly not working.
 *
 * This replaces a mock "Platform" screen whose tiles read "Store version: local
 * v6 / Browser persistence" and whose buttons announced "Connection test
 * simulated — no network call". Every number here comes from the server.
 *
 * The organising idea is that almost nothing in this application fails loudly.
 * Two conditions stop it booting; everything else — a queue with no worker, a
 * payment gateway still in practice mode, a missing storage link, a storefront
 * address CORS will not answer — boots cleanly, reports `ok`, and is broken.
 * Those are the failures a shop owner hears about from a customer. So they are
 * the ones this page is for.
 */

const panelClass =
  "overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(17,17,19,0.03)]";

const labelClass =
  "ez-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#86868B]";

type Tone = "good" | "warn" | "bad" | "unknown";

const TONE_DOT: Record<Tone, string> = {
  good: "bg-[#1D7A4C]",
  warn: "bg-[#B45309]",
  bad: "bg-[#B42318]",
  unknown: "bg-[#AEAEB2]",
};

function StatusLine({
  tone,
  title,
  detail,
  action,
}: {
  tone: Tone;
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3 border-b border-black/[0.05] px-5 py-3.5 last:border-b-0 sm:px-6">
      <span
        aria-hidden="true"
        className={`mt-[6px] h-2 w-2 shrink-0 rounded-full ${TONE_DOT[tone]}`}
      />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">{title}</div>
        <p className="mt-0.5 text-[12px] leading-relaxed text-[#6E6E73]">{detail}</p>
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </li>
  );
}

function Command({ children }: { children: string }) {
  return (
    <code className="ez-mono inline-block rounded-md border border-black/[0.06] bg-[#FAFAFB] px-2 py-1 text-[11px] text-[#1D1D1F]">
      {children}
    </code>
  );
}

function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-[#FAFAFB] px-3.5 py-3">
      <div className={labelClass}>{label}</div>
      <div className="mt-1.5 text-sm font-semibold tracking-[-0.02em] text-[#1D1D1F]">{value}</div>
      {detail ? <div className="mt-0.5 text-[11px] text-[#86868B]">{detail}</div> : null}
    </div>
  );
}

export default function AdminSystemPage() {
  const [health, setHealth] = useState<ApiSystemHealth | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isApiEnabled()) {
      setError("The store server is not configured, so there is nothing to report.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .systemHealth()
      .then((h) => {
        if (!cancelled) setHealth(h);
      })
      .catch((e) => {
        if (cancelled) return;
        // Nav is not permission-gated anywhere in this admin, so a manager can
        // land here. The generic 403 copy ("You don't have permission to change
        // this") would be wrong — there is nothing to change on this page.
        if (e instanceof ApiError && e.status === 403) {
          setError(
            "Only the store owner can see this page — it names server settings and connection keys.",
          );
          return;
        }
        setError(adminErrorMessage(e, "Couldn't read your server's status."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const simulating = health?.integrations.filter((i) => !i.live) ?? [];
  const live = health?.integrations.filter((i) => i.live) ?? [];

  return (
    <div>
      <AdminPageHeader
        title="System"
        description="Your store's version, and anything that is not working but does not say so."
        breadcrumbs={[{ label: "System", href: "/admin/settings" }, { label: "System health" }]}
      />

      {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}

      {loading ? (
        <div className="ez-mono py-10 text-center text-[10px] uppercase tracking-[0.16em] text-[#86868B]">
          Checking your server…
        </div>
      ) : null}

      {health ? (
        <div className="space-y-4">
          <section className={panelClass}>
            <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
              <StatTile
                label="Store version"
                value={health.version.installed ?? "not recorded"}
                detail={
                  health.version.installed === health.version.code
                    ? "up to date"
                    : `code is ${health.version.code}`
                }
              />
              <StatTile
                label="Database"
                value={health.database.connected ? "Connected" : "Not reachable"}
                detail={health.database.driver}
              />
              <StatTile
                label="Set up on"
                value={
                  health.version.installedAt
                    ? formatAdminDateTime(health.version.installedAt)
                    : "—"
                }
              />
            </div>
          </section>

          {health.version.updateNeeded || health.pendingMigrations > 0 ? (
            <section className={`${panelClass} border-[#F4D8A8] bg-[#FEF6E7]`}>
              <div className="p-5 sm:p-6">
                <h2 className="text-[15px] font-semibold tracking-[-0.03em] text-[#8A5A00]">
                  An update has not finished
                </h2>
                <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-[#8A5A00]">
                  {health.pendingMigrations > 0
                    ? `${health.pendingMigrations} database change${
                        health.pendingMigrations === 1 ? "" : "s"
                      } from this release have not been applied. Until they are, parts of the admin can error or silently save nothing.`
                    : `This code is version ${health.version.code} but the store was last updated to ${
                        health.version.installed ?? "an unknown version"
                      }.`}
                </p>
                <p className="mt-3 text-[12px] text-[#8A5A00]">
                  Ask whoever runs your server for <Command>php artisan ezurr:update</Command>
                  {getApiUpstreamUrl() ? (
                    <>
                      {" "}
                      or open the API{" "}
                      <a
                        href={`${getApiUpstreamUrl()}/update`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold underline underline-offset-2"
                      >
                        /update
                      </a>{" "}
                      console (status only — it does not migrate from the browser).
                    </>
                  ) : null}
                </p>
              </div>
            </section>
          ) : null}

          {health.configWarnings.length > 0 ? (
            <section className={panelClass}>
              <header className="border-b border-black/[0.06] bg-[#FAFAFB] px-5 py-4 sm:px-6">
                <h2 className="text-[15px] font-semibold tracking-[-0.03em] text-[#1D1D1F]">
                  Needs fixing on the server
                </h2>
                <p className="mt-1 max-w-2xl text-xs text-[#6E6E73]">
                  None of these stop the store loading. Each one breaks something without
                  reporting it.
                </p>
              </header>
              <ul>
                {health.configWarnings.map((w) => (
                  <StatusLine
                    key={w.id}
                    tone="bad"
                    title={w.title}
                    detail={w.detail}
                    action={w.variable ? <Command>{w.variable}</Command> : undefined}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          <section className={panelClass}>
            <header className="border-b border-black/[0.06] bg-[#FAFAFB] px-5 py-4 sm:px-6">
              <h2 className="text-[15px] font-semibold tracking-[-0.03em] text-[#1D1D1F]">
                Background work
              </h2>
              <p className="mt-1 max-w-2xl text-xs text-[#6E6E73]">
                Order messages, cart recovery and scheduled pages all run here rather than while
                a customer waits.
              </p>
            </header>
            <ul>
              <StatusLine
                tone={health.queue.needsWorker ? "warn" : "good"}
                title={
                  health.queue.needsWorker
                    ? "A worker must be running"
                    : "Messages are sent immediately"
                }
                detail={
                  health.queue.needsWorker
                    ? `Queued jobs waiting: ${health.queue.pendingJobs}. If that number keeps climbing, nothing is processing them — order messages and webhooks are being stored and never sent.`
                    : `Queue is "${health.queue.connection}", so work happens during the request. Nothing extra to run, but checkout is slower.`
                }
                action={health.queue.needsWorker ? <Command>php artisan queue:work</Command> : undefined}
              />
              <StatusLine
                tone={
                  health.scheduler.healthy === null
                    ? "unknown"
                    : health.scheduler.healthy
                      ? "good"
                      : "bad"
                }
                title={
                  health.scheduler.healthy === null
                    ? "Scheduled tasks have never run"
                    : health.scheduler.healthy
                      ? "Scheduled tasks are running"
                      : "Scheduled tasks have stopped"
                }
                detail={
                  health.scheduler.lastRunAt
                    ? `Last run ${formatAdminDateTime(health.scheduler.lastRunAt)}.${
                        health.scheduler.healthy
                          ? ""
                          : " Abandoned-cart recovery, scheduled publishing and payment timeouts are not happening."
                      }`
                    : "No run has ever been recorded. Either cron was never set up, or this store was updated moments ago — check again in five minutes."
                }
                action={
                  health.scheduler.healthy ? undefined : <Command>php artisan schedule:run</Command>
                }
              />
            </ul>
          </section>

          <section className={panelClass}>
            <header className="border-b border-black/[0.06] bg-[#FAFAFB] px-5 py-4 sm:px-6">
              <h2 className="text-[15px] font-semibold tracking-[-0.03em] text-[#1D1D1F]">
                Connections
              </h2>
              <p className="mt-1 max-w-2xl text-xs text-[#6E6E73]">
                Anything in practice mode writes down what it would have done and contacts
                nobody. Saving credentials on the Integrations screen does not change this — each
                one needs the setting below changed on the server.
              </p>
            </header>
            <ul>
              {simulating.map((item) => (
                <StatusLine
                  key={item.variable}
                  tone="warn"
                  title={`${item.name} — practice mode`}
                  detail={
                    item.name.startsWith("payments")
                      ? "A payment will appear to succeed and no money will move."
                      : item.name.startsWith("messaging")
                        ? "OTP codes and order updates are written to a log file instead of being sent."
                        : "Requests are logged instead of sent."
                  }
                  action={<Command>{`${item.variable}=live`}</Command>}
                />
              ))}
              {live.map((item) => (
                <StatusLine key={item.variable} tone="good" title={`${item.name} — live`} detail="Sending for real." />
              ))}
            </ul>
          </section>

          <section className={panelClass}>
            <header className="border-b border-black/[0.06] bg-[#FAFAFB] px-5 py-4 sm:px-6">
              <h2 className="text-[15px] font-semibold tracking-[-0.03em] text-[#1D1D1F]">
                Server
              </h2>
            </header>
            <ul>
              <StatusLine
                tone={health.writable.storage ? "good" : "bad"}
                title={health.writable.storage ? "Uploads folder is writable" : "Uploads will fail"}
                detail={
                  health.writable.storage
                    ? "Product images and invoices can be written."
                    : "The storage folder is read-only, so image uploads and generated invoices will error."
                }
              />
              <StatusLine
                tone={health.writable.env ? "good" : "unknown"}
                title={
                  health.writable.env
                    ? "Settings file can be edited on this server"
                    : "Settings must be changed in your hosting dashboard"
                }
                detail={
                  health.writable.env
                    ? `Whoever runs your server can edit ${health.writable.envPath} directly.`
                    : "This is normal on managed hosting and in containers. The settings named on this page go into your host's environment-variables screen instead of a file."
                }
              />
              <StatusLine
                tone={health.owner.exists ? "good" : "bad"}
                title={`Staff owners: ${health.owner.count}`}
                detail={
                  health.owner.exists
                    ? "Owners can change payment settings and manage the team."
                    : "No owner account exists, which should be impossible from this screen."
                }
              />
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}

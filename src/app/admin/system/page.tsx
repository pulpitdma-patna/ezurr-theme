"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { UpdatePanel } from "@/components/admin/UpdatePanel";
import { formatAdminDateTime } from "@/lib/adminFormat";
import { adminErrorMessage } from "@/lib/adminError";
import {
  api,
  ApiError,
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

/**
 * A command chip is only honest when the person reading it genuinely has to ask
 * somebody else. Anything the owner can now do himself gets a link to the screen
 * that does it, not the name of a setting on a machine he cannot reach.
 */
function AskYourServer({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12px] text-[#6E6E73]">
      Ask whoever runs your server for {children}
    </div>
  );
}

/**
 * The integration this gate belongs to. The API sends it, but `ApiSystemHealth`
 * in lib/apiClient.ts — another agent's file — does not carry it yet, so it is
 * read structurally and falls back to the list.
 */
function integrationKeyOf(item: { variable: string }): string | null {
  const key = (item as { key?: string | null }).key;
  return typeof key === "string" && key !== "" ? key : null;
}

function CardLink({ integrationKey }: { integrationKey: string | null }) {
  return (
    <Link
      href={integrationKey ? `/admin/integrations#${integrationKey}` : "/admin/integrations"}
      className="text-[12px] font-semibold text-[#1D1D1F] underline underline-offset-2"
    >
      Switch it on →
    </Link>
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
      setError("Practice shop. There is no real server to check yet.");
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
            "Only the shop's owner can see this page — it names server settings and the keys other companies gave you.",
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
        title="What's working"
        description="Which version of the shop you are on, and anything that is broken but does not say so."
        breadcrumbs={[{ label: "Setup", href: "/admin/settings" }, { label: "What's working" }]}
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
                label="Your version"
                value={health.version.installed ?? "not written down"}
                detail={
                  health.version.installed === health.version.code
                    ? "up to date"
                    : `the newer one is ${health.version.code}`
                }
              />
              {/* The tile under "Database" used to print `health.database.driver`
                  — the bare word "mysql" or "pgsql". He is not choosing one; he
                  needs to know whether his shop can reach where its records are
                  kept, which is the line above it. */}
              <StatTile
                label="Where your records are kept"
                value={health.database.connected ? "Reachable" : "Cannot be reached"}
                detail={
                  health.database.connected
                    ? "Orders and products are being saved."
                    : "Nothing can be saved until this is fixed."
                }
              />
              <StatTile
                label="Shop set up on"
                value={
                  health.version.installedAt
                    ? formatAdminDateTime(health.version.installedAt)
                    : "Not written down"
                }
              />
            </div>
          </section>

          {/* Was a dead end: it told him an update had not finished and then
              asked him to get somebody to run a command. He has nobody, so his
              shop stayed on the old release — including the releases that fix
              whatever he was complaining about. He can apply it himself now. */}
          <UpdatePanel />


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
                Work that happens on its own
              </h2>
              <p className="mt-1 max-w-2xl text-xs text-[#6E6E73]">
                Order messages, chasing baskets left behind, and pages set to go live later all
                happen here rather than while a customer waits.
              </p>
            </header>
            <ul>
              <StatusLine
                tone={health.queue.needsWorker ? "warn" : "good"}
                title={
                  health.queue.needsWorker
                    ? "Something has to be left running to send these"
                    : "Messages are sent straight away"
                }
                // This used to print the raw setting — `Queue is "sync"` — and
                // the word "webhooks". Neither is something he can act on; the
                // number of messages piling up is.
                detail={
                  health.queue.needsWorker
                    ? `${health.queue.pendingJobs} ${health.queue.pendingJobs === 1 ? "message is" : "messages are"} waiting to go out. If that number keeps climbing, nothing is sending them — order updates and anything you send to your own software are being written down and never sent.`
                    : "Messages go out while the customer waits instead of afterwards. Nothing extra has to be running, but checkout is a little slower."
                }
                action={
                  health.queue.needsWorker ? (
                    <AskYourServer>
                      <Command>php artisan queue:work</Command>
                    </AskYourServer>
                  ) : undefined
                }
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
                    ? "The timed jobs have never run"
                    : health.scheduler.healthy
                      ? "The timed jobs are running"
                      : "The timed jobs have stopped"
                }
                detail={
                  health.scheduler.lastRunAt
                    ? `Last ran ${formatAdminDateTime(health.scheduler.lastRunAt)}.${
                        health.scheduler.healthy
                          ? ""
                          : " Baskets left behind are not being chased, pages set to go live later will not, and unpaid orders are not being closed off."
                      }`
                    : "Nothing has ever run. Either this was never set up on your server, or the shop was updated moments ago — look again in five minutes."
                }
                action={
                  health.scheduler.healthy ? undefined : (
                    <AskYourServer>
                      <Command>php artisan schedule:run</Command>
                    </AskYourServer>
                  )
                }
              />
            </ul>
          </section>

          <section className={panelClass}>
            <header className="border-b border-black/[0.06] bg-[#FAFAFB] px-5 py-4 sm:px-6">
              <h2 className="text-[15px] font-semibold tracking-[-0.03em] text-[#1D1D1F]">
                Other companies
              </h2>
              {/*
                This paragraph used to say the opposite — that saving credentials
                here changed nothing and each of these needed a setting edited on
                the server — and every row printed a variable name as a command
                chip. Both were written before the switch moved into the database.
                They are now not merely jargon but false, and they were telling an
                owner who had just switched their payments on that they were still
                pretending.
              */}
              <p className="mt-1 max-w-2xl text-xs text-[#6E6E73]">
                Anything in practice mode writes down what it would have done and contacts
                nobody. You change that yourself, on that company&rsquo;s card.
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
                        ? "Sign-in codes and order updates are written down instead of being sent, so a customer cannot sign in."
                        : "Written down instead of sent."
                  }
                  action={<CardLink integrationKey={integrationKeyOf(item)} />}
                />
              ))}
              {live.map((item) => (
                <StatusLine key={item.variable} tone="good" title={`${item.name} — live`} detail="Doing it for real." />
              ))}
            </ul>
          </section>

          <section className={panelClass}>
            <header className="border-b border-black/[0.06] bg-[#FAFAFB] px-5 py-4 sm:px-6">
              <h2 className="text-[15px] font-semibold tracking-[-0.03em] text-[#1D1D1F]">
                Your server
              </h2>
            </header>
            <ul>
              <StatusLine
                tone={health.writable.storage ? "good" : "bad"}
                title={
                  health.writable.storage
                    ? "Pictures and invoices can be saved"
                    : "Pictures and invoices cannot be saved"
                }
                detail={
                  health.writable.storage
                    ? "Product photos you upload and invoices the shop makes both have somewhere to go."
                    : "The folder they go in is locked, so uploading a photo and printing an invoice will both fail."
                }
              />
              <StatusLine
                tone={health.writable.env ? "good" : "unknown"}
                title={
                  health.writable.env
                    ? "Server settings can be edited here"
                    : "Server settings live with your hosting company"
                }
                detail={
                  health.writable.env
                    ? `Whoever runs your server can edit ${health.writable.envPath} directly.`
                    : "This is normal, and nothing is wrong. Anything named on this page has to be changed in your hosting company's own control panel rather than in a file."
                }
              />
              <StatusLine
                tone={health.owner.exists ? "good" : "bad"}
                title={`${health.owner.count} ${health.owner.count === 1 ? "person is" : "people are"} an owner`}
                detail={
                  health.owner.exists
                    ? "An owner is the only one who can change payment settings and add people."
                    : "Nobody is an owner, which should not be possible — nobody can change payment settings."
                }
              />
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SettingsToggle } from "@/components/admin/settings/SettingsToggle";
import { useAdminToast } from "@/components/admin/AdminToast";
import { StatusBadge } from "@/components/admin/StatusBadge";

type PlatformTab = "api" | "sso" | "delivery" | "concurrency";

const TABS: { id: PlatformTab; label: string; hint: string }[] = [
  { id: "api", label: "API & persistence", hint: "Data layer" },
  { id: "sso", label: "Identity", hint: "SSO & sessions" },
  { id: "delivery", label: "Delivery", hint: "Queues & webhooks" },
  { id: "concurrency", label: "Concurrency", hint: "Locks & conflicts" },
];

const fieldClass =
  "h-10 w-full rounded-xl border border-black/[0.08] bg-[#F7F7F8] px-3 text-sm outline-none transition hover:border-black/[0.12] focus:border-black/[0.14] focus:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

const labelClass =
  "ez-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#86868B]";

const panelClass =
  "overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_8px_30px_rgba(17,17,19,0.04)]";

const panelHeaderClass =
  "flex flex-wrap items-start justify-between gap-3 border-b border-black/[0.06] bg-[#FAFAFB] px-5 py-4 sm:px-6";

const primaryBtnClass =
  "inline-flex h-9 items-center rounded-xl bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white transition hover:bg-[#2C2C2E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

const secondaryBtnClass =
  "inline-flex h-9 items-center rounded-xl border border-black/[0.08] bg-white px-3.5 text-xs font-semibold text-[#1D1D1F] shadow-[0_1px_2px_rgba(17,17,19,0.03)] transition hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-[#FAFAFB] px-3.5 py-3 shadow-[0_1px_2px_rgba(17,17,19,0.03)]">
      <div className={labelClass}>{label}</div>
      <div className="mt-1.5 text-sm font-semibold tracking-[-0.02em] text-[#1D1D1F]">{value}</div>
      {detail ? <div className="mt-0.5 text-[11px] text-[#86868B]">{detail}</div> : null}
    </div>
  );
}

function PanelHeader({
  title,
  description,
  badge,
}: {
  title: string;
  description?: string;
  badge?: ReactNode;
}) {
  return (
    <header className={panelHeaderClass}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold tracking-[-0.03em] text-[#1D1D1F]">{title}</h3>
        {description ? <p className="mt-1 max-w-xl text-xs text-[#6E6E73]">{description}</p> : null}
      </div>
      {badge}
    </header>
  );
}

export default function AdminPlatformPage() {
  const toast = useAdminToast();
  const [tab, setTab] = useState<PlatformTab>("api");
  const [apiBase, setApiBase] = useState("https://api.ezurr.example/v1");
  const [readReplica, setReadReplica] = useState(true);
  const [ssoEnforced, setSsoEnforced] = useState(false);
  const [scim, setScim] = useState(false);
  const [queuePaused, setQueuePaused] = useState(false);
  const [optimisticLock, setOptimisticLock] = useState(true);

  return (
    <div>
      <AdminPageHeader
        title="Platform"
        description="Infrastructure, identity, and delivery controls for your storefront stack."
        breadcrumbs={[
          { label: "System", href: "/admin/settings" },
          { label: "Platform" },
        ]}
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.06] bg-[#FAFAFB] px-2.5 py-1 ez-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[#86868B]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#AEAEB2]" aria-hidden />
            Preview
          </span>
        }
      />

      <div
        className="mb-5 inline-flex w-full max-w-full gap-1 overflow-x-auto rounded-xl border border-black/[0.06] bg-[#F0F0F2] p-1 shadow-[0_1px_2px_rgba(17,17,19,0.03)]"
        role="tablist"
        aria-label="Platform sections"
      >
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              id={`platform-tab-${item.id}`}
              aria-controls={`platform-panel-${item.id}`}
              onClick={() => setTab(item.id)}
              className={`inline-flex min-w-[9.5rem] shrink-0 flex-col rounded-lg px-3.5 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] ${
                active
                  ? "bg-white text-[#1D1D1F] shadow-[0_1px_2px_rgba(17,17,19,0.06)]"
                  : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              <span className="text-xs font-semibold tracking-[-0.01em]">{item.label}</span>
              <span
                className={`mt-0.5 ez-mono text-[8px] uppercase tracking-[0.12em] ${
                  active ? "text-[#86868B]" : "text-[#AEAEB2]"
                }`}
              >
                {item.hint}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "api" ? (
        <section
          id="platform-panel-api"
          role="tabpanel"
          aria-labelledby="platform-tab-api"
          className={panelClass}
        >
          <PanelHeader
            title="API endpoint"
            description="Primary connection to the storefront API and persistence layer."
            badge={
              <StatusBadge
                kind="custom"
                label="Not connected"
                className="bg-[#FFF1E5] text-[#9A3412]"
              />
            }
          />
          <div className="space-y-5 p-5 sm:p-6">
            <label className="block">
              <span className={labelClass}>Base URL</span>
              <input
                value={apiBase}
                onChange={(e) => setApiBase(e.target.value)}
                className={`mt-1.5 ${fieldClass}`}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatTile label="Primary DB" value="Postgres" detail="Provisioned on deploy" />
              <StatTile label="Store version" value="local v6" detail="Browser persistence" />
              <StatTile label="Migration status" value="Idle" detail="No pending changes" />
            </div>

            <div className="space-y-2.5">
              <div className={labelClass}>Routing</div>
              <SettingsToggle
                label="Read replica routing"
                description="Fan list queries to a read replica when enabled."
                checked={readReplica}
                onChange={setReadReplica}
              />
            </div>

            <div className="flex flex-wrap gap-2 border-t border-black/[0.06] pt-5">
              <button
                type="button"
                onClick={() => toast.push("Connection test simulated — no network call", "warning")}
                className={primaryBtnClass}
              >
                Test connection
              </button>
              <button
                type="button"
                onClick={() => toast.push("Migration dry-run queued (mock)", "success")}
                className={secondaryBtnClass}
              >
                Dry-run migrations
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "sso" ? (
        <section
          id="platform-panel-sso"
          role="tabpanel"
          aria-labelledby="platform-tab-sso"
          className={panelClass}
        >
          <PanelHeader
            title="Identity providers"
            description="Connect enterprise IdPs and enforce staff sign-in policies."
          />
          <div className="space-y-5 p-5 sm:p-6">
            <ul className="divide-y divide-black/[0.06] overflow-hidden rounded-xl border border-black/[0.06] bg-[#FAFAFB]">
              {[
                { name: "Google Workspace", status: "Ready to connect", tone: "bg-[#F0F0F2] text-[#6E6E73]" },
                { name: "Microsoft Entra ID", status: "Ready to connect", tone: "bg-[#F0F0F2] text-[#6E6E73]" },
                { name: "Okta SAML", status: "Certificate pending", tone: "bg-[#FFF1E5] text-[#9A3412]" },
              ].map((idp) => (
                <li
                  key={idp.name}
                  className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3.5 first:rounded-t-xl last:rounded-b-xl"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold tracking-[-0.02em] text-[#1D1D1F]">
                      {idp.name}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusBadge kind="custom" label={idp.status} className={idp.tone} />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toast.push(`${idp.name} OAuth mock — not connected`, "warning")}
                    className={secondaryBtnClass}
                  >
                    Configure
                  </button>
                </li>
              ))}
            </ul>

            <div className="space-y-2.5">
              <div className={labelClass}>Access policy</div>
              <SettingsToggle
                label="Enforce SSO for staff"
                description="Disable password OTP for admin accounts when live."
                checked={ssoEnforced}
                onChange={setSsoEnforced}
              />
              <SettingsToggle
                label="SCIM provisioning"
                description="Sync seats and roles from the IdP directory."
                checked={scim}
                onChange={setScim}
              />
            </div>
          </div>
        </section>
      ) : null}

      {tab === "delivery" ? (
        <section
          id="platform-panel-delivery"
          role="tabpanel"
          aria-labelledby="platform-tab-delivery"
          className={panelClass}
        >
          <PanelHeader
            title="Outbound delivery"
            description="Webhook retries, messaging queues, and dead-letter handling."
            badge={
              <StatusBadge
                kind="custom"
                label={queuePaused ? "Paused" : "Active"}
                className={
                  queuePaused ? "bg-[#FEE4E2] text-[#B42318]" : "bg-[#EAF6ED] text-[#2D6B3C]"
                }
              />
            }
          />
          <div className="space-y-5 p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatTile label="Webhook attempts (24h)" value="128" detail="Last 24 hours" />
              <StatTile label="Email / WhatsApp" value="Simulated" detail="Provider not wired" />
              <StatTile label="Dead-letter" value="0" detail="Awaiting replay" />
            </div>

            <div className="space-y-2.5">
              <div className={labelClass}>Queue control</div>
              <SettingsToggle
                label="Pause delivery queue"
                description="Stop retries to external providers until resumed."
                checked={queuePaused}
                onChange={setQueuePaused}
              />
            </div>

            <div className="border-t border-black/[0.06] pt-5">
              <button
                type="button"
                onClick={() => toast.push("Replay of last 10 webhooks mocked", "success")}
                className={secondaryBtnClass}
              >
                Replay failed webhooks
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "concurrency" ? (
        <section
          id="platform-panel-concurrency"
          role="tabpanel"
          aria-labelledby="platform-tab-concurrency"
          className={panelClass}
        >
          <PanelHeader
            title="Editing locks"
            description="Optimistic concurrency for products, orders, and shared records."
          />
          <div className="space-y-5 p-5 sm:p-6">
            <div className="space-y-2.5">
              <div className={labelClass}>Conflict handling</div>
              <SettingsToggle
                label="Optimistic locking on products & orders"
                description="Return 409 Conflict with a merge UI on stale writes."
                checked={optimisticLock}
                onChange={setOptimisticLock}
              />
            </div>

            <div className="overflow-hidden rounded-xl border border-black/[0.06] bg-[#FAFAFB]">
              <div className="border-b border-black/[0.06] px-4 py-3">
                <div className={labelClass}>Conflict preview</div>
                <p className="mt-1 text-xs text-[#6E6E73]">
                  Example resolution card shown to editors on version mismatch.
                </p>
              </div>
              <div className="p-4">
                <div className="rounded-xl border border-[#F5C2C0]/80 bg-[#FFF8F8] px-4 py-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold tracking-[-0.02em] text-[#912018]">
                        Version conflict on SKU EZ-CON-0001
                      </div>
                      <p className="mt-1 text-xs text-[#912018]/80">
                        Another editor saved stock 4 → 6 while you had 4 → 2. Choose theirs,
                        yours, or merge.
                      </p>
                    </div>
                    <StatusBadge
                      kind="custom"
                      label="409 Conflict"
                      className="bg-[#FEE4E2] text-[#B42318]"
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className={primaryBtnClass}>
                      Keep theirs
                    </button>
                    <button type="button" className={secondaryBtnClass}>
                      Keep yours
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

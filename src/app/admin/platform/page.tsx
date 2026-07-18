"use client";

import { useState } from "react";
import { Phase2PageShell } from "@/components/admin/Phase2PageShell";
import { SettingsToggle } from "@/components/admin/settings/SettingsToggle";
import { useAdminToast } from "@/components/admin/AdminToast";
import { StatusBadge } from "@/components/admin/StatusBadge";

type PlatformTab = "api" | "sso" | "delivery" | "concurrency";

const TABS: { id: PlatformTab; label: string; hint: string }[] = [
  { id: "api", label: "API & persistence", hint: "Replace localStorage" },
  { id: "sso", label: "Identity", hint: "SSO & sessions" },
  { id: "delivery", label: "Delivery", hint: "Queues & webhooks" },
  { id: "concurrency", label: "Concurrency", hint: "Locks & conflicts" },
];

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
    <Phase2PageShell
      title="Platform"
      description="Enterprise infrastructure surfaces — designed for a future API swap."
      breadcrumbs={[
        { label: "System", href: "/admin/settings" },
        { label: "Platform" },
      ]}
      planned={[
        "Replace localStorage with API persistence",
        "Server-enforced authZ / SSO",
        "Provider webhooks & delivery queues",
      ]}
    >
      <div className="mb-5 flex flex-wrap gap-1.5 rounded-2xl border border-black/[0.06] bg-white p-1.5">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-xl px-3.5 py-2 text-left transition ${
                active ? "bg-[#1D1D1F] text-white" : "text-[#6E6E73] hover:bg-[#F5F5F7]"
              }`}
            >
              <div className="text-xs font-semibold">{item.label}</div>
              <div
                className={`ez-mono text-[9px] uppercase tracking-[0.1em] ${
                  active ? "text-white/50" : "text-[#AEAEB2]"
                }`}
              >
                {item.hint}
              </div>
            </button>
          );
        })}
      </div>

      {tab === "api" ? (
        <section className="space-y-4 rounded-2xl border border-black/[0.06] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">API endpoint</h3>
            <StatusBadge
              kind="custom"
              label="Mock · disconnected"
              className="bg-[#FEF3C7] text-[#92400E]"
            />
          </div>
          <label className="block">
            <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
              Base URL
            </span>
            <input
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-xl border border-black/[0.08] bg-[#F7F7F8] px-3 text-sm"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Primary DB", value: "Postgres · planned" },
              { label: "Store version", value: "local v6" },
              { label: "Migration status", value: "Idle" },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-black/[0.06] bg-[#F7F7F8] px-3 py-3"
              >
                <div className="ez-mono text-[9px] uppercase tracking-[0.12em] text-[#86868B]">
                  {card.label}
                </div>
                <div className="mt-1 text-sm font-semibold">{card.value}</div>
              </div>
            ))}
          </div>
          <SettingsToggle
            label="Read replica routing"
            description="UI only — would fan list queries to a replica."
            checked={readReplica}
            onChange={setReadReplica}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => toast.push("Connection test simulated — no network call", "warning")}
              className="h-9 rounded-xl bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white"
            >
              Test connection
            </button>
            <button
              type="button"
              onClick={() => toast.push("Migration dry-run queued (mock)", "success")}
              className="h-9 rounded-xl border border-black/10 px-3.5 text-xs font-semibold"
            >
              Dry-run migrations
            </button>
          </div>
        </section>
      ) : null}

      {tab === "sso" ? (
        <section className="space-y-4 rounded-2xl border border-black/[0.06] bg-white p-5">
          <h3 className="text-sm font-semibold">Identity providers</h3>
          <ul className="space-y-2">
            {[
              { name: "Google Workspace", status: "Ready to connect" },
              { name: "Microsoft Entra ID", status: "Ready to connect" },
              { name: "Okta SAML", status: "Certificate pending" },
            ].map((idp) => (
              <li
                key={idp.name}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/[0.06] bg-[#F7F7F8] px-4 py-3"
              >
                <div>
                  <div className="text-sm font-semibold">{idp.name}</div>
                  <div className="text-xs text-[#86868B]">{idp.status}</div>
                </div>
                <button
                  type="button"
                  onClick={() => toast.push(`${idp.name} OAuth mock — not connected`, "warning")}
                  className="h-8 rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold"
                >
                  Configure
                </button>
              </li>
            ))}
          </ul>
          <SettingsToggle
            label="Enforce SSO for staff"
            description="Password OTP for admin mobiles would be disabled when live."
            checked={ssoEnforced}
            onChange={setSsoEnforced}
          />
          <SettingsToggle
            label="SCIM provisioning"
            description="Sync seats from the IdP directory."
            checked={scim}
            onChange={setScim}
          />
        </section>
      ) : null}

      {tab === "delivery" ? (
        <section className="space-y-4 rounded-2xl border border-black/[0.06] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Outbound delivery</h3>
            <StatusBadge
              kind="custom"
              label={queuePaused ? "Paused" : "Simulated"}
              className={
                queuePaused ? "bg-[#FEE4E2] text-[#B42318]" : "bg-[#EAF6ED] text-[#2D6B3C]"
              }
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Webhook attempts (24h)", value: "128" },
              { label: "Email / WhatsApp", value: "Simulated" },
              { label: "Dead-letter", value: "0" },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-black/[0.06] bg-[#F7F7F8] px-3 py-3"
              >
                <div className="ez-mono text-[9px] uppercase tracking-[0.12em] text-[#86868B]">
                  {card.label}
                </div>
                <div className="mt-1 text-sm font-semibold">{card.value}</div>
              </div>
            ))}
          </div>
          <SettingsToggle
            label="Pause delivery queue"
            description="Would stop retries to providers when the API exists."
            checked={queuePaused}
            onChange={setQueuePaused}
          />
          <button
            type="button"
            onClick={() => toast.push("Replay of last 10 webhooks mocked", "success")}
            className="h-9 rounded-xl border border-black/10 px-3.5 text-xs font-semibold"
          >
            Replay failed webhooks
          </button>
        </section>
      ) : null}

      {tab === "concurrency" ? (
        <section className="space-y-4 rounded-2xl border border-black/[0.06] bg-white p-5">
          <h3 className="text-sm font-semibold">Editing locks</h3>
          <SettingsToggle
            label="Optimistic locking on products & orders"
            description="Stale writes would return 409 Conflict with a merge UI."
            checked={optimisticLock}
            onChange={setOptimisticLock}
          />
          <div className="rounded-xl border border-dashed border-black/[0.1] bg-[#FAFAFB] px-4 py-3 text-xs text-[#6E6E73]">
            Preview conflict card
            <div className="mt-3 rounded-lg border border-[#F5C2C0] bg-[#FFF5F5] px-3 py-2.5 text-[#B42318]">
              <div className="text-sm font-semibold">Version conflict on SKU EZ-CON-0001</div>
              <p className="mt-1 text-xs opacity-80">
                Another editor saved stock 4 → 6 while you had 4 → 2. Choose theirs, yours, or merge.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="h-7 rounded-md bg-[#1D1D1F] px-2.5 text-[11px] font-semibold text-white"
                >
                  Keep theirs
                </button>
                <button
                  type="button"
                  className="h-7 rounded-md border border-black/10 bg-white px-2.5 text-[11px] font-semibold text-[#1D1D1F]"
                >
                  Keep yours
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </Phase2PageShell>
  );
}

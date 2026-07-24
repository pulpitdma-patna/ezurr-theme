"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { api, isApiEnabled, type ApiIntegration } from "@/lib/apiClient";
import { ListToolbar } from "@/components/admin/ListToolbar";
import {
  type AdminIntegration,
  type AdminIntegrationCategory,
  type AdminIntegrationStatus,
} from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useAutoBanner } from "@/hooks/useAutoBanner";
import { updateIntegration } from "@/lib/adminStore";

const categories: { id: AdminIntegrationCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "payments", label: "Payments" },
  { id: "shipping", label: "Shipping" },
  { id: "messaging", label: "Messaging" },
  { id: "analytics", label: "Analytics" },
  { id: "other", label: "Other" },
];

const statusOptions: { value: AdminIntegrationStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "connected", label: "Connected" },
  { value: "not_connected", label: "Not connected" },
  { value: "needs_attention", label: "Needs attention" },
];

const statusMeta: Record<AdminIntegrationStatus, { label: string; className: string }> = {
  connected: { label: "Connected", className: "bg-[#EAF6ED] text-[#2D6B3C]" },
  not_connected: { label: "Not connected", className: "bg-[#F0F0F2] text-[#6E6E73]" },
  needs_attention: { label: "Needs attention", className: "bg-[#FFF1E5] text-[#9A3412]" },
};

const categoryMeta: Record<AdminIntegrationCategory, { label: string; accent: string }> = {
  payments: { label: "Payments", accent: "bg-[#E8E8ED] text-[#1D1D1F]" },
  shipping: { label: "Shipping", accent: "bg-[#EAF6ED] text-[#2D6B3C]" },
  messaging: { label: "Messaging", accent: "bg-[#DBEAFE] text-[#1D4ED8]" },
  analytics: { label: "Analytics", accent: "bg-[#F3E8FF] text-[#6B21A8]" },
  other: { label: "Other", accent: "bg-[#F0F0F2] text-[#6E6E73]" },
};

const fieldClass =
  "w-full rounded-xl border border-black/[0.08] bg-[#F7F7F8] px-3 py-2.5 text-sm outline-none transition hover:border-black/[0.12] focus:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

function apiToIntegration(i: ApiIntegration): AdminIntegration {
  return {
    id: i.id,
    name: i.name,
    category: i.category as AdminIntegrationCategory,
    description: i.description ?? "",
    status: i.status as AdminIntegrationStatus,
    enabled: i.enabled,
    lastSync: i.lastSync ?? undefined,
    accountLabel: i.accountLabel ?? undefined,
    apiKeyMasked: i.apiKeyMasked ?? undefined,
    webhookUrl: i.webhookUrl ?? undefined,
  };
}

export default function AdminIntegrationsPage() {
  const store = useAdminStore();
  const apiOn = isApiEnabled();
  const [apiIntegrations, setApiIntegrations] = useState<AdminIntegration[]>([]);

  const loadIntegrations = useCallback(async () => {
    if (!apiOn) return;
    try {
      const res = await api.integrations();
      setApiIntegrations((res.data ?? []).map(apiToIntegration));
    } catch {
      setApiIntegrations([]);
    }
  }, [apiOn]);

  useEffect(() => {
    void loadIntegrations();
  }, [loadIntegrations]);

  const integrations = apiOn ? apiIntegrations : store.integrations;
  const [category, setCategory] = useState<AdminIntegrationCategory | "all">("all");
  const [status, setStatus] = useState<AdminIntegrationStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [credentialDraft, setCredentialDraft] = useState("");
  const [toast, setToast] = useAutoBanner(2800);

  const active = integrations.find((integration) => integration.id === activeId) ?? null;
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return integrations.filter((integration) => {
      if (category !== "all" && integration.category !== category) return false;
      if (status !== "all" && integration.status !== status) return false;
      return (
        !needle ||
        integration.name.toLowerCase().includes(needle) ||
        integration.description.toLowerCase().includes(needle) ||
        categoryMeta[integration.category].label.toLowerCase().includes(needle)
      );
    });
  }, [category, integrations, query, status]);

  const connectedCount = integrations.filter((integration) => integration.status === "connected").length;
  const attentionCount = integrations.filter(
    (integration) => integration.status === "needs_attention",
  ).length;

  function openManage(integration: AdminIntegration) {
    setActiveId(integration.id);
    setCredentialDraft("");
    setToast("");
  }

  async function connect(integration: AdminIntegration) {
    if (apiOn) {
      try {
        await api.connectIntegration(integration.id, {});
        await loadIntegrations();
        setToast(`${integration.name} connected`);
      } catch {
        setToast("Could not connect");
      }
      return;
    }
    updateIntegration(integration.id, {
      enabled: true,
      status: "connected",
      lastSync: new Date().toISOString(),
    });
    setToast(`${integration.name} connected`);
  }

  async function toggle(integration: AdminIntegration, enabled: boolean) {
    if (apiOn) {
      try {
        await api.updateIntegration(integration.id, { enabled });
        await loadIntegrations();
      } catch {
        setToast("Could not update");
      }
    } else {
      updateIntegration(integration.id, { enabled });
    }
    setToast(`${integration.name} ${enabled ? "enabled" : "paused"}`);
  }

  async function testConnection() {
    if (!active) return;
    if (apiOn) {
      try {
        const res = await api.testIntegration(active.id);
        setToast(`${active.name}: ${res.message}`);
      } catch {
        setToast("Test failed");
      }
      return;
    }
    updateIntegration(active.id, {
      status: "connected",
      lastSync: new Date().toISOString(),
      enabled: true,
    });
    setToast(`${active.name} test connection successful`);
  }

  async function copyWebhook() {
    if (!active?.webhookUrl) return;
    try {
      await navigator.clipboard.writeText(active.webhookUrl);
      setToast("Webhook URL copied");
    } catch {
      setToast("Copy unavailable — select the URL manually");
    }
  }

  async function saveCredentialAlias() {
    if (!active || !credentialDraft.trim()) return;
    if (apiOn) {
      try {
        await api.updateIntegration(active.id, {
          credentials: { api_key: credentialDraft.trim() },
        });
        await loadIntegrations();
        setCredentialDraft("");
        setToast("Credential saved (encrypted server-side)");
      } catch {
        setToast("Could not save credential");
      }
      return;
    }
    updateIntegration(active.id, { apiKeyMasked: "••••••••••••••••" });
    setCredentialDraft("");
    setToast("Masked credential saved");
  }

  return (
    <div>
      <AdminPageHeader
        title="Integrations"
        description="Connect the services that keep checkout, fulfillment, and customer updates moving."
        actions={
          <div className="flex items-center gap-2">
            <span className="hidden rounded-lg border border-black/[0.08] bg-white px-3 py-2 ez-mono text-[10px] text-[#6E6E73] sm:inline">
              {connectedCount} live · {attentionCount} attention
            </span>
          </div>
        }
      />

      {apiOn ? (
        <AdminNotice tone="info">
          Connections and credentials are saved to the server (secrets are stored
          encrypted and shown masked). Provider test-calls report the connected state.
        </AdminNotice>
      ) : null}

      <ListToolbar
        resultLabel={`${rows.length} integrations`}
        search={{
          value: query,
          onChange: setQuery,
          placeholder: "Search services and categories…",
        }}
        filters={
          <>
            <AdminSelect
              label="Category"
              value={category}
              onChange={(value) => setCategory(value as AdminIntegrationCategory | "all")}
              options={categories.map((item) => ({
                value: item.id,
                label: item.label,
              }))}
            />
            <AdminSelect
              label="Status"
              value={status}
              onChange={(value) => setStatus(value as AdminIntegrationStatus | "all")}
              options={statusOptions}
            />
          </>
        }
      />

      {rows.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onManage={() => openManage(integration)}
              onConnect={() => connect(integration)}
              onToggle={(enabled) => toggle(integration, enabled)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-black/[0.12] bg-white px-5 py-14 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#F0F0F2] text-[#6E6E73]">
            <PlugIcon />
          </div>
          <h2 className="mt-4 text-sm font-semibold text-[#1D1D1F]">No integrations found</h2>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[#86868B]">
            Try another category, status, or search term.
          </p>
          <button
            type="button"
            onClick={() => {
              setCategory("all");
              setStatus("all");
              setQuery("");
            }}
            className="mt-4 h-9 rounded-lg border border-black/[0.1] bg-[#F7F7F8] px-3.5 text-xs font-semibold text-[#1D1D1F]"
          >
            Clear filters
          </button>
        </div>
      )}

      <AdminDrawer
        open={Boolean(active)}
        title={active?.name ?? "Integration"}
        subtitle={active ? `${categoryMeta[active.category].label} · ${statusMeta[active.status].label}` : undefined}
        onClose={() => setActiveId(null)}
        widthClassName="max-w-lg sm:max-w-xl"
      >
        {active ? (
          <IntegrationDrawer
            integration={active}
            credentialDraft={credentialDraft}
            toastMessage={toast}
            onCredentialDraft={setCredentialDraft}
            onSaveCredential={saveCredentialAlias}
            onPatch={(patch) => {
              if (apiOn) {
                void api.updateIntegration(active.id, patch).then(loadIntegrations);
              } else {
                updateIntegration(active.id, patch);
              }
            }}
            onTest={testConnection}
            onCopyWebhook={copyWebhook}
            onToggle={(enabled) => toggle(active, enabled)}
          />
        ) : null}
      </AdminDrawer>
    </div>
  );
}

function IntegrationCard({
  integration,
  onManage,
  onConnect,
  onToggle,
}: {
  integration: AdminIntegration;
  onManage: () => void;
  onConnect: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  const meta = categoryMeta[integration.category];
  const status = statusMeta[integration.status];
  return (
    <article className="group flex min-h-[230px] flex-col rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(17,17,19,0.03)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(17,17,19,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold ${meta.accent}`}>
          {integration.name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)}
        </div>
        <span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>
          {status.label}
        </span>
      </div>
      <div className="mt-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-[-0.02em] text-[#1D1D1F]">{integration.name}</h2>
          <span className="ez-mono text-[8px] uppercase tracking-[0.12em] text-[#AEAEB2]">{meta.label}</span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-[#6E6E73]">{integration.description}</p>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-black/[0.06] pt-3.5">
        <div className="min-w-0">
          <div className="ez-mono text-[8px] uppercase tracking-[0.12em] text-[#AEAEB2]">Last sync</div>
          <div className="mt-0.5 truncate text-[11px] font-medium text-[#6E6E73]">
            {formatSync(integration.lastSync)}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {integration.status === "not_connected" ? (
            <button type="button" onClick={onConnect} className="h-8 rounded-lg bg-[#1D1D1F] px-3 text-[11px] font-semibold text-white">
              Connect
            </button>
          ) : (
            <Toggle checked={integration.enabled} onChange={onToggle} label={`Toggle ${integration.name}`} />
          )}
          <button type="button" onClick={onManage} className="h-8 rounded-lg border border-black/[0.1] px-3 text-[11px] font-semibold text-[#1D1D1F]">
            Manage
          </button>
        </div>
      </div>
    </article>
  );
}

function IntegrationDrawer({
  integration,
  credentialDraft,
  toastMessage,
  onCredentialDraft,
  onSaveCredential,
  onPatch,
  onTest,
  onCopyWebhook,
  onToggle,
}: {
  integration: AdminIntegration;
  credentialDraft: string;
  toastMessage: string;
  onCredentialDraft: (value: string) => void;
  onSaveCredential: () => void;
  onPatch: (patch: Partial<AdminIntegration>) => void;
  onTest: () => void;
  onCopyWebhook: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  const meta = categoryMeta[integration.category];
  const status = statusMeta[integration.status];
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-black/[0.06] bg-[#FAFAFB] p-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold ${meta.accent}`}>
            {integration.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>{status.label}</span>
              <span className="ez-mono text-[8px] uppercase tracking-[0.12em] text-[#86868B]">{meta.label}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#6E6E73]">{integration.description}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-black/[0.06] pt-3">
          <span className="text-xs font-semibold text-[#424245]">Enable integration</span>
          <Toggle checked={integration.enabled} onChange={onToggle} label={`Enable ${integration.name}`} />
        </div>
      </div>

      <Field label="Account label">
        <input value={integration.accountLabel ?? ""} onChange={(event) => onPatch({ accountLabel: event.target.value })} className={fieldClass} placeholder="Live workspace" />
      </Field>

      {integration.apiKeyMasked ? (
        <Field label="API key · demo masked">
          <div className="flex gap-2">
            <input value={credentialDraft || integration.apiKeyMasked} onChange={(event) => onCredentialDraft(event.target.value)} className={`${fieldClass} ez-mono`} placeholder="Paste a test key" />
            <button type="button" onClick={onSaveCredential} disabled={!credentialDraft.trim()} className="h-10 shrink-0 rounded-xl bg-[#1D1D1F] px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
              Mask
            </button>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-[#86868B]">Credentials are never retained in this demo; only a masked marker is stored locally.</p>
        </Field>
      ) : null}

      {integration.webhookUrl ? (
        <Field label="Webhook URL">
          <div className="flex gap-2">
            <input value={integration.webhookUrl} onChange={(event) => onPatch({ webhookUrl: event.target.value })} className={`${fieldClass} ez-mono text-xs`} />
            <button type="button" onClick={onCopyWebhook} className="h-10 shrink-0 rounded-xl border border-black/[0.1] bg-white px-3 text-xs font-semibold text-[#1D1D1F]">
              Copy
            </button>
          </div>
        </Field>
      ) : null}

      <div className="rounded-xl border border-dashed border-black/[0.12] bg-[#FAFAFB] p-4">
        <div className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">Connection health</div>
        <p className="mt-1.5 text-xs leading-relaxed text-[#6E6E73]">
          Last verified {formatSync(integration.lastSync)}. Test calls are simulated locally and do not contact a provider.
        </p>
        <button type="button" onClick={onTest} className="mt-3 h-9 rounded-lg border border-black/[0.1] bg-white px-3.5 text-xs font-semibold text-[#1D1D1F]">
          Test connection
        </button>
        {toastMessage ? (
          <div role="status" aria-live="polite" className="mt-3 rounded-lg bg-[#EAF6ED] px-3 py-2 text-[11px] font-semibold text-[#2D6B3C]">
            {toastMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="ez-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#86868B]">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-6 w-10 rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] ${checked ? "bg-[#1D1D1F]" : "bg-[#D1D1D6]"}`}>
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${checked ? "left-5" : "left-1"}`} />
    </button>
  );
}

function formatSync(value?: string) {
  if (!value) return "Not synced yet";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function PlugIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 3v5M16 3v5M6 8h12v2a6 6 0 0 1-12 0V8ZM12 16v5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

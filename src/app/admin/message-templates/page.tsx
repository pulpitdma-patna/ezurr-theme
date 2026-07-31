"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  IconButton,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/admin/IconButton";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useAdminToast } from "@/components/admin/AdminToast";
import { api, isApiEnabled, type ApiMessageTemplate } from "@/lib/apiClient";

const EMPTY: ApiMessageTemplate = {
  event_key: "",
  channel: "whatsapp",
  name: "",
  provider_template_name: "",
  provider_template_id: "",
  namespace: "",
  language: "en",
  variables: [],
  body_preview: "",
  status: "draft",
  enabled: true,
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  approved: { label: "Approved", className: "bg-[#EAF6ED] text-[#2D6B3C]" },
  pending: { label: "Pending", className: "bg-[#FEF6E7] text-[#8A5A00]" },
  draft: { label: "Draft", className: "bg-[#F0F0F2] text-[#6E6E73]" },
};

const CHANNEL_OPTIONS = [
  { value: "all", label: "All channels" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "draft", label: "Draft" },
];

const primaryBtnClass =
  "inline-flex h-9 items-center gap-2 rounded-xl bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#2C2C2E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

const compactSelectClass = "h-9 rounded-lg shadow-none";

const fieldClass =
  "h-10 w-full rounded-xl border border-black/[0.08] bg-[#F7F7F8] px-3 text-sm outline-none transition hover:border-black/[0.12] focus:border-black/[0.14] focus:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

const labelClass = "ez-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#86868B]";

export default function AdminMessageTemplatesPage() {
  const apiOn = isApiEnabled();
  const toast = useAdminToast();
  const [templates, setTemplates] = useState<ApiMessageTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ApiMessageTemplate | null>(null);
  const [varsText, setVarsText] = useState("[]");
  const [preview, setPreview] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    if (!apiOn) return;
    setError(null);
    try {
      const res = await api.messageTemplates();
      setTemplates(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load templates");
    }
  }, [apiOn]);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(() => {
    return {
      total: templates.length,
      approved: templates.filter((t) => t.status === "approved").length,
      pending: templates.filter((t) => t.status === "pending").length,
      draft: templates.filter((t) => t.status === "draft").length,
      enabled: templates.filter((t) => t.enabled).length,
    };
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (channelFilter !== "all" && t.channel !== channelFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        t.event_key.toLowerCase().includes(needle) ||
        t.name.toLowerCase().includes(needle) ||
        (t.provider_template_name ?? "").toLowerCase().includes(needle)
      );
    });
  }, [templates, query, channelFilter, statusFilter]);

  const hasActiveFilters =
    query.trim().length > 0 || channelFilter !== "all" || statusFilter !== "all";

  function openEdit(tpl: ApiMessageTemplate) {
    setEditing({ ...tpl });
    setVarsText(JSON.stringify(tpl.variables ?? [], null, 2));
    setPreview(null);
  }

  function openNew() {
    setEditing({ ...EMPTY });
    setVarsText("[]");
    setPreview(null);
  }

  function clearFilters() {
    setQuery("");
    setChannelFilter("all");
    setStatusFilter("all");
  }

  async function save() {
    if (!editing) return;
    let variables: ApiMessageTemplate["variables"];
    try {
      variables = JSON.parse(varsText);
      if (!Array.isArray(variables)) throw new Error();
    } catch {
      toast.push("Variables must be a JSON array", "warning");
      return;
    }
    try {
      await api.upsertMessageTemplate({ ...editing, variables });
      toast.push(editing.id ? "Template updated" : "Template created", "success");
      setEditing(null);
      await load();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : "Could not save", "warning");
    }
  }

  async function runPreview() {
    if (!editing?.id) {
      toast.push("Save the template first to preview", "warning");
      return;
    }
    try {
      const res = await api.previewTemplate(editing.id, {
        customer: { name: "Asha", mobile: "9876500000" },
        order: { public_id: "EZ-SAMPLE", total: 4999, tracking: "TRK-1" },
        resume_url: "https://store/checkout/gta-vi-preorder",
        retry_url: "https://store/checkout?order=EZ-SAMPLE",
      });
      setPreview(JSON.stringify(res.variables, null, 2));
    } catch (e) {
      setPreview(null);
      toast.push(e instanceof Error ? e.message : "Missing required variable", "warning");
    }
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Message templates"
        description="Map events to MSG91 WhatsApp/SMS templates. Only approved templates send live."
        breadcrumbs={[
          { label: "System", href: "/admin/settings" },
          { label: "Message templates" },
        ]}
        actions={
          <button type="button" onClick={openNew} className={primaryBtnClass}>
            <PlusIcon />
            New template
          </button>
        }
      />

      {!apiOn ? (
        <AdminNotice tone="demo">Message templates require the live store API.</AdminNotice>
      ) : null}
      {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}

      <section className="overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(17,17,19,0.03)]">
        <div className="border-b border-black/[0.05] bg-[#FAFAFB]">
          {apiOn ? (
            <p className="border-b border-black/[0.04] px-3.5 py-2 text-[11px] leading-relaxed text-[#6E6E73] sm:px-4">
              Set <code className="rounded bg-white px-1 py-0.5 text-[10px]">provider_template_name</code>{" "}
              to your Meta-approved name and flip status to <strong>approved</strong> to enable live
              sends for that event.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 px-3.5 py-2.5 sm:px-4">
            <MetricPill label="Total" value={metrics.total} accent />
            <MetricPill label="Approved" value={metrics.approved} />
            <MetricPill label="Pending" value={metrics.pending} />
            <MetricPill label="Draft" value={metrics.draft} />
            <MetricPill label="Enabled" value={metrics.enabled} />
          </div>
        </div>

        <div className="flex flex-col gap-2.5 border-b border-black/[0.05] bg-[#FAFAFB] px-3 py-2.5 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="relative min-w-0 flex-1 lg:max-w-sm">
              <span
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#AEAEB2]"
                aria-hidden
              >
                <SearchGlyph />
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search event, name, provider template…"
                className="h-9 w-full rounded-lg border border-black/[0.07] bg-white pl-8 pr-3 text-sm shadow-[0_1px_2px_rgba(17,17,19,0.03)] outline-none placeholder:text-[#AEAEB2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
              />
            </div>
            <span className="hidden shrink-0 ez-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[#86868B] sm:inline">
              {filteredTemplates.length} templates
            </span>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <AdminSelect
              label="Channel"
              value={channelFilter}
              onChange={setChannelFilter}
              options={CHANNEL_OPTIONS}
              className={compactSelectClass}
            />
            <AdminSelect
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTIONS}
              className={compactSelectClass}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-black/[0.05] bg-[#FAFAFB] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#86868B]">
              <tr>
                <th className="px-3.5 py-2 sm:px-4">Event</th>
                <th className="px-3.5 py-2 sm:px-4">Channel</th>
                <th className="px-3.5 py-2 sm:px-4">Provider template</th>
                <th className="px-3.5 py-2 sm:px-4">Status</th>
                <th className="px-3.5 py-2 text-right sm:px-4">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {filteredTemplates.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <AdminEmptyState
                      compact
                      title={templates.length === 0 ? "No templates yet" : "No templates match"}
                      description={
                        templates.length === 0
                          ? "Create a mapping between store events and MSG91 provider templates."
                          : "Try another channel, status, or search term."
                      }
                      action={
                        templates.length === 0 ? (
                          <button type="button" onClick={openNew} className={primaryBtnClass}>
                            <PlusIcon />
                            New template
                          </button>
                        ) : hasActiveFilters ? (
                          <button
                            type="button"
                            onClick={clearFilters}
                            className="h-9 rounded-xl border border-black/[0.1] bg-[#F7F7F8] px-3.5 text-xs font-semibold"
                          >
                            Clear filters
                          </button>
                        ) : null
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredTemplates.map((t) => {
                  const statusMeta = STATUS_META[t.status] ?? STATUS_META.draft;
                  return (
                    <tr
                      key={t.id}
                      className="transition hover:bg-[#FAFAFB]/80"
                    >
                      <td className="px-3.5 py-2.5 sm:px-4">
                        <div className="font-medium tracking-[-0.01em] text-[#1D1D1F]">
                          {t.event_key}
                        </div>
                        {t.name ? (
                          <div className="mt-0.5 truncate text-[11px] text-[#86868B]">{t.name}</div>
                        ) : null}
                      </td>
                      <td className="px-3.5 py-2.5 sm:px-4">
                        <span className="inline-flex items-center rounded-lg border border-black/[0.06] bg-[#FAFAFB] px-2 py-0.5 text-[11px] font-medium capitalize text-[#424245]">
                          {t.channel}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 sm:px-4">
                        <span className="ez-mono text-[11px] text-[#6E6E73]">
                          {t.provider_template_name || "—"}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 sm:px-4">
                        <StatusBadge
                          kind="custom"
                          label={statusMeta.label}
                          className={statusMeta.className}
                        />
                        {!t.enabled ? (
                          <span className="ml-1.5 inline-flex items-center rounded-lg bg-[#F0F0F2] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#86868B]">
                            Off
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3.5 py-2.5 text-right sm:px-4">
                        <div className="flex items-center justify-end gap-1">
                          <IconButton label={`Edit ${t.event_key}`} onClick={() => openEdit(t)}>
                            <PencilIcon />
                          </IconButton>
                          <IconButton
                            label={`Delete ${t.event_key}`}
                            onClick={() => t.id && setDeleteId(t.id)}
                            className="border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50 hover:text-red-800"
                          >
                            <TrashIcon />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <AdminDrawer
        open={editing !== null}
        title={editing?.id ? "Edit template" : "New template"}
        onClose={() => setEditing(null)}
      >
        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Event key</span>
                <input
                  className={fieldClass}
                  value={editing.event_key}
                  onChange={(e) => setEditing({ ...editing, event_key: e.target.value })}
                  placeholder="order_confirmed"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Channel</span>
                <select
                  className={fieldClass}
                  value={editing.channel}
                  onChange={(e) => setEditing({ ...editing, channel: e.target.value })}
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Name</span>
              <input
                className={fieldClass}
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Provider template name (Meta-approved)</span>
              <input
                className={fieldClass}
                value={editing.provider_template_name ?? ""}
                onChange={(e) => setEditing({ ...editing, provider_template_name: e.target.value })}
                placeholder="ezurr_login_verification"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Template namespace</span>
              <input
                className={fieldClass}
                value={editing.namespace ?? ""}
                onChange={(e) => setEditing({ ...editing, namespace: e.target.value })}
                placeholder="Falls back to Integrations → WhatsApp default"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Status</span>
                <select
                  className={fieldClass}
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                >
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Language</span>
                <input
                  className={fieldClass}
                  value={editing.language ?? "en"}
                  onChange={(e) => setEditing({ ...editing, language: e.target.value })}
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Variables (JSON: {`[{key, source, required}]`})</span>
              <textarea
                className={`${fieldClass} min-h-[120px] bg-white font-mono text-[12px]`}
                value={varsText}
                onChange={(e) => setVarsText(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Body preview (reference copy)</span>
              <textarea
                className={`${fieldClass} min-h-[64px] bg-white`}
                value={editing.body_preview ?? ""}
                onChange={(e) => setEditing({ ...editing, body_preview: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={editing.enabled}
                onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })}
                className="accent-[#1D1D1F]"
              />
              Enabled
            </label>

            {preview ? (
              <div className="rounded-xl border border-[#A6D5B0] bg-[#EAF6ED] p-3">
                <div className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#2D6B3C]">
                  Bound variables
                </div>
                <pre className="mt-1 overflow-x-auto text-[11px] text-[#2D6B3C]">{preview}</pre>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={() => void save()} className={primaryBtnClass}>
                {editing.id ? "Save changes" : "Create template"}
              </button>
              <button
                type="button"
                onClick={() => void runPreview()}
                className="inline-flex h-9 items-center rounded-xl border border-black/[0.08] bg-white px-4 text-xs font-semibold shadow-[0_1px_2px_rgba(17,17,19,0.03)] transition hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
              >
                Preview binding
              </button>
            </div>
          </div>
        ) : null}
      </AdminDrawer>

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete template?"
        description="Removing the mapping means this event will record as blocked until re-mapped."
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            void api
              .deleteMessageTemplate(deleteId)
              .then(load)
              .catch(() => toast.push("Could not delete", "warning"));
          }
          setDeleteId(null);
        }}
      />
    </div>
  );
}

function MetricPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${
        accent ? "border-black/[0.06] bg-white" : "border-black/[0.05] bg-white/70"
      }`}
    >
      <span className="ez-mono text-[8px] font-medium uppercase tracking-[0.12em] text-[#86868B]">
        {label}
      </span>
      <span className="text-[13px] font-semibold tabular-nums tracking-[-0.03em] text-[#1D1D1F]">
        {value}
      </span>
    </span>
  );
}

function SearchGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9.2 9.2L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

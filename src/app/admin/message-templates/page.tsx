"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
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

const STATUS_TONE: Record<string, string> = {
  approved: "bg-[#EAF6ED] text-[#2D6B3C]",
  pending: "bg-[#FEF6E7] text-[#8A5A00]",
  draft: "bg-[#F0F0F2] text-[#6E6E73]",
};

const fieldClass =
  "w-full rounded-lg border border-black/[0.1] bg-white px-3 py-2 text-sm outline-none focus:border-[#1D1D1F]";
const labelClass = "ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]";

export default function AdminMessageTemplatesPage() {
  const apiOn = isApiEnabled();
  const toast = useAdminToast();
  const [templates, setTemplates] = useState<ApiMessageTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ApiMessageTemplate | null>(null);
  const [varsText, setVarsText] = useState("[]");
  const [preview, setPreview] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

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
    <div>
      <AdminPageHeader
        title="Message templates"
        description="Map events to MSG91 WhatsApp/SMS templates. Only approved templates send live."
        actions={
          <button
            type="button"
            onClick={openNew}
            className="h-9 rounded-lg bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white"
          >
            New template
          </button>
        }
      />

      {!apiOn ? (
        <AdminNotice tone="demo">Message templates require the live store API.</AdminNotice>
      ) : null}
      {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}
      {apiOn ? (
        <AdminNotice tone="info">
          Set <code>provider_template_name</code> to your Meta-approved name and flip status to
          <strong> approved</strong> to enable live sends for that event.
        </AdminNotice>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-black/[0.07] bg-white">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-black/[0.06] bg-[#F8F8FA] text-[11px] uppercase tracking-[0.1em] text-[#86868B]">
            <tr>
              <th className="px-4 py-2.5">Event</th>
              <th className="px-4 py-2.5">Channel</th>
              <th className="px-4 py-2.5">Provider template</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.05]">
            {templates.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#86868B]">
                  No templates yet.
                </td>
              </tr>
            ) : (
              templates.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2.5 font-medium">{t.event_key}</td>
                  <td className="px-4 py-2.5 text-[#6E6E73]">{t.channel}</td>
                  <td className="ez-mono px-4 py-2.5 text-[11px] text-[#6E6E73]">
                    {t.provider_template_name || "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`ez-mono rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] ${
                        STATUS_TONE[t.status] ?? STATUS_TONE.draft
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(t)}
                      className="h-7 rounded-md border border-black/10 px-2.5 text-[11px] font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => t.id && setDeleteId(t.id)}
                      className="ml-2 h-7 rounded-md border border-red-200 px-2.5 text-[11px] font-semibold text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
                placeholder="order_confirmed_v1"
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
                className={`${fieldClass} min-h-[120px] font-mono text-[12px]`}
                value={varsText}
                onChange={(e) => setVarsText(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Body preview (reference copy)</span>
              <textarea
                className={`${fieldClass} min-h-[64px]`}
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
              <div className="rounded-lg border border-[#A6D5B0] bg-[#EAF6ED] p-3">
                <div className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#2D6B3C]">
                  Bound variables
                </div>
                <pre className="mt-1 overflow-x-auto text-[11px] text-[#2D6B3C]">{preview}</pre>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => void save()}
                className="h-9 rounded-lg bg-[#1D1D1F] px-4 text-xs font-semibold text-white"
              >
                {editing.id ? "Save changes" : "Create template"}
              </button>
              <button
                type="button"
                onClick={() => void runPreview()}
                className="h-9 rounded-lg border border-black/10 px-4 text-xs font-semibold"
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

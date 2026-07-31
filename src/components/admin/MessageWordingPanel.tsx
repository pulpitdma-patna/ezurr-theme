"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  PlaceholderEditor,
  previewBody,
  usedPlaceholders,
  type MessagePlaceholder,
} from "@/components/admin/PlaceholderEditor";
import { api, apiFetch, isApiEnabled, type ApiMessageTemplate } from "@/lib/apiClient";

/**
 * The wording of every automatic message, on the second tab of the screen that
 * sends them.
 *
 * It used to be its own nav item, one route away from the rules that point at
 * it. That split is why "held back — the wording isn't approved yet" was
 * incomprehensible: the rule said it was on, and the thing that was off lived
 * somewhere he had no reason to open. A rule points at a wording by key; they
 * belong on one screen.
 *
 * Deleted from the old screen: five metric pills, a search box, two filter
 * selects, a raw JSON textarea for the variables, and a `<pre>` dump of the
 * bound values. All five metrics were counts of a list of nine rows.
 */

const STATUS_META: Record<string, { label: string; className: string }> = {
  approved: { label: "Approved — can send", className: "bg-[#EAF6ED] text-[#2D6B3C]" },
  pending: { label: "Waiting for WhatsApp to approve", className: "bg-[#FEF6E7] text-[#8A5A00]" },
  draft: { label: "Not sent for approval yet", className: "bg-[#F0F0F2] text-[#6E6E73]" },
};

const CHANNEL_WORDS: Record<string, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
  in_app: "In the app",
};

const fieldClass =
  "h-10 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-sm outline-none transition hover:border-black/[0.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

const labelClass = "text-[11px] font-semibold text-[#1D1D1F]";

const primaryBtnClass =
  "inline-flex h-9 items-center gap-2 rounded-xl bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#2C2C2E] disabled:cursor-not-allowed disabled:bg-[#C7C7CC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

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

type PlaceholderMap = {
  data: Record<string, MessagePlaceholder[]>;
  fallback: MessagePlaceholder[];
};

export function MessageWordingPanel({
  templates,
  onReload,
}: {
  templates: ApiMessageTemplate[];
  onReload: () => void | Promise<void>;
}) {
  const apiOn = isApiEnabled();
  const [placeholders, setPlaceholders] = useState<PlaceholderMap>({ data: {}, fallback: [] });
  const [editing, setEditing] = useState<ApiMessageTemplate | null>(null);
  const [body, setBody] = useState("");
  const [checked, setChecked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  /**
   * The details each message is allowed to carry, from the server.
   *
   * Deliberately not a copy in this file: the moment the admin's idea of what a
   * shipped-order event carries drifts from the emit, the chip menu offers a
   * detail that binds to nothing and the send is written down as blocked.
   */
  const loadPlaceholders = useCallback(async () => {
    if (!apiOn) return;
    try {
      const res = await apiFetch<PlaceholderMap>("/admin/message-templates/placeholders");
      setPlaceholders({ data: res.data ?? {}, fallback: res.fallback ?? [] });
    } catch {
      // The editor still works; the menu is just empty and says so.
      setPlaceholders({ data: {}, fallback: [] });
    }
  }, [apiOn]);

  useEffect(() => {
    void loadPlaceholders();
  }, [loadPlaceholders]);

  const knownEventKeys = useMemo(() => Object.keys(placeholders.data).sort(), [placeholders]);

  const available = useMemo(() => {
    if (!editing) return [];
    return placeholders.data[editing.event_key] ?? placeholders.fallback;
  }, [editing, placeholders]);

  function open(template: ApiMessageTemplate) {
    setEditing({ ...template });
    setBody(template.body_preview ?? "");
    setChecked(null);
    setError(null);
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      // The variables the server stores are derived from the chips in the text,
      // in the order they appear. They cannot disagree with the message,
      // because there is no second place to type them.
      await api.upsertMessageTemplate({
        ...editing,
        body_preview: body,
        variables: usedPlaceholders(body, available),
      });
      setEditing(null);
      await onReload();
    } catch (e) {
      // Stays in the drawer, with his wording still in it.
      setError(e instanceof Error ? e.message : "Could not save this wording.");
    } finally {
      setSaving(false);
    }
  }

  async function checkAgainstAnOrder() {
    if (!editing?.id) {
      setError("Save this wording first, then it can be checked against an order.");
      return;
    }
    setError(null);
    try {
      const res = await api.previewTemplate(editing.id, {
        customer: { name: "Asha", mobile: "9876500000" },
        order: { public_id: "EZ-SAMPLE", total: 4999, tracking: "TRK-1", carrier_name: "Bluedart" },
        resume_url: "https://store/cart",
        retry_url: "https://store/checkout?order=EZ-SAMPLE",
      });
      // The server resolved every value; we only put them where his words say.
      let out = body;
      Object.entries(res.variables ?? {}).forEach(([key, value]) => {
        out = out.split(`{{${key}}}`).join(String(value));
      });
      setChecked(out);
    } catch (e) {
      setChecked(null);
      setError(
        e instanceof Error
          ? e.message
          : "One of the details in this message could not be filled in.",
      );
    }
  }

  const approvedCount = templates.filter((t) => t.status === "approved" && t.enabled).length;

  return (
    <div className="space-y-3">
      {/* Not a block and not a redirect — he may genuinely need this at 11pm on
          a phone. It just says which one is the easier way. */}
      <p className="text-[11px] text-[#86868B] sm:hidden">
        Writing the wording is easier on a computer.
      </p>
      {apiOn && approvedCount === 0 ? (
        <AdminNotice tone="demo">
          Nothing is approved yet, so every automatic message is being held back. WhatsApp has to
          approve the wording before it can go out.
        </AdminNotice>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(17,17,19,0.03)]">
        {templates.length === 0 ? (
          <AdminEmptyState
            compact
            title="No wording yet"
            description="Write what each automatic message should say."
            action={
              <button
                type="button"
                onClick={() => open({ ...EMPTY })}
                className={primaryBtnClass}
                disabled={!apiOn}
              >
                Write one
              </button>
            }
          />
        ) : (
          <ul className="divide-y divide-black/[0.05]">
            {templates.map((template) => {
              const meta = STATUS_META[template.status] ?? STATUS_META.draft;
              return (
                <li
                  key={`${template.event_key}-${template.channel}`}
                  className="flex flex-col gap-2 px-3.5 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold tracking-[-0.02em] text-[#1D1D1F]">
                        {template.name || template.event_key}
                      </span>
                      <span className="text-[11px] text-[#86868B]">
                        by {CHANNEL_WORDS[template.channel] ?? template.channel}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-[#6E6E73]">
                      {previewBody(
                        template.body_preview ?? "",
                        placeholders.data[template.event_key] ?? placeholders.fallback,
                      ) || "Nothing written yet."}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <StatusBadge kind="custom" label={meta.label} className={meta.className} />
                    {!template.enabled ? (
                      <StatusBadge
                        kind="custom"
                        label="Off"
                        className="bg-[#F0F0F2] text-[#6E6E73]"
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => open(template)}
                      className="h-8 rounded-lg px-2.5 text-[11px] font-semibold text-[#424245] transition hover:bg-[#F0F0F2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
                    >
                      Change the wording
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {templates.length > 0 ? (
        <button
          type="button"
          onClick={() => open({ ...EMPTY })}
          className={primaryBtnClass}
          disabled={!apiOn}
        >
          Write another one
        </button>
      ) : null}

      <AdminDrawer
        open={editing !== null}
        title={editing?.id ? "Change the wording" : "New wording"}
        subtitle="What the customer reads."
        onClose={() => setEditing(null)}
        widthClassName="max-w-lg sm:max-w-xl"
      >
        {editing ? (
          <div className="space-y-4">
            {error ? (
              <div
                role="alert"
                className="rounded-xl border border-[#F5C2C0] bg-[#FDECEC] px-3 py-2 text-[12px] font-medium text-[#B42318]"
              >
                {error}
              </div>
            ) : null}

            <label className="block">
              <span className={labelClass}>What to call it</span>
              <input
                className={`${fieldClass} mt-1`}
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Order on the way"
              />
              <span className="mt-1 block text-[11px] text-[#86868B]">
                This is the name you pick when you set up an automatic message.
              </span>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>When it&rsquo;s used</span>
                {/* A dropdown, not a text box. The value is the key the server
                    looks the wording up by; a typo here is a message that is
                    never found and never sent. */}
                <select
                  className={`${fieldClass} mt-1`}
                  value={editing.event_key}
                  onChange={(e) => setEditing({ ...editing, event_key: e.target.value })}
                >
                  <option value="">Choose when this is used…</option>
                  {knownEventKeys.map((key) => (
                    <option key={key} value={key}>
                      {key.split("_").join(" ")}
                    </option>
                  ))}
                  {editing.event_key && !knownEventKeys.includes(editing.event_key) ? (
                    <option value={editing.event_key}>
                      {editing.event_key.split("_").join(" ")}
                    </option>
                  ) : null}
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>Sent by</span>
                <select
                  className={`${fieldClass} mt-1`}
                  value={editing.channel}
                  onChange={(e) => setEditing({ ...editing, channel: e.target.value })}
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                  <option value="in_app">In the app</option>
                </select>
              </label>
            </div>

            <div>
              <span className={labelClass}>What the customer reads</span>
              <div className="mt-1">
                <PlaceholderEditor
                  body={body}
                  placeholders={available}
                  onChange={setBody}
                />
              </div>
            </div>

            {checked ? (
              <div className="rounded-xl border border-[#A6D5B0] bg-[#EAF6ED] px-3 py-2">
                <div className="text-[11px] font-semibold text-[#2D6B3C]">
                  Checked against a sample order
                </div>
                <p className="mt-0.5 text-[12px] leading-relaxed text-[#2D6B3C]">{checked}</p>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>Can it send?</span>
                <select
                  className={`${fieldClass} mt-1`}
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                >
                  <option value="draft">Not sent for approval yet</option>
                  <option value="pending">Waiting for WhatsApp to approve</option>
                  <option value="approved">Approved — can send</option>
                </select>
              </label>
              <label className="mt-6 flex items-center gap-2 text-[13px] font-medium text-[#1D1D1F]">
                <input
                  type="checkbox"
                  checked={editing.enabled}
                  onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })}
                  className="accent-[#1D1D1F]"
                />
                Use this one
              </label>
            </div>

            {editing.channel === "whatsapp" ? (
              <details className="rounded-xl border border-black/[0.06] bg-[#FAFAFB] px-3 py-2">
                <summary className="cursor-pointer text-[12px] font-semibold text-[#1D1D1F]">
                  Only if someone told you to
                </summary>
                <div className="mt-2 space-y-3">
                  <label className="block">
                    {/* Named the way Meta names it, and the company is named —
                        our plain-English rule stops at the edge of somebody
                        else's dashboard. */}
                    <span className={labelClass}>Template name (from your Meta account)</span>
                    <input
                      className={`${fieldClass} mt-1`}
                      value={editing.provider_template_name ?? ""}
                      onChange={(e) =>
                        setEditing({ ...editing, provider_template_name: e.target.value })
                      }
                      placeholder="ezurr_login_verification"
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Your WhatsApp account number (namespace)</span>
                    <input
                      className={`${fieldClass} mt-1`}
                      value={editing.namespace ?? ""}
                      onChange={(e) => setEditing({ ...editing, namespace: e.target.value })}
                      placeholder="Leave blank to use the one on the WhatsApp card"
                    />
                  </label>
                </div>
              </details>
            ) : null}

            {editing.channel === "sms" ? (
              <label className="block">
                <span className={labelClass}>Flow template id (from your MSG91 dashboard)</span>
                <input
                  className={`${fieldClass} mt-1`}
                  value={editing.provider_template_id ?? ""}
                  onChange={(e) => setEditing({ ...editing, provider_template_id: e.target.value })}
                />
              </label>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button type="button" onClick={() => void save()} disabled={saving} className={primaryBtnClass}>
                {saving ? "Saving…" : editing.id ? "Save the wording" : "Add this wording"}
              </button>
              <button
                type="button"
                onClick={() => void checkAgainstAnOrder()}
                className="inline-flex h-9 items-center rounded-xl border border-black/[0.08] bg-white px-4 text-xs font-semibold shadow-[0_1px_2px_rgba(17,17,19,0.03)] transition hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
              >
                Check it against a real order
              </button>
              {editing.id ? (
                <button
                  type="button"
                  onClick={() => setDeleteId(editing.id ?? null)}
                  className="ml-auto h-9 rounded-xl px-3 text-xs font-semibold text-[#B42318] transition hover:bg-[#FFF5F5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B42318]"
                >
                  Delete this wording
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </AdminDrawer>

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete this wording?"
        description="Any automatic message that sends it will stop sending — it will be held back instead, and the customer will get nothing. Nothing that has already gone out is affected."
        confirmLabel="Delete the wording"
        cancelLabel="Keep it"
        danger
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          const id = deleteId;
          setDeleteId(null);
          if (!id) return;
          void api
            .deleteMessageTemplate(id)
            .then(() => {
              setEditing(null);
              return onReload();
            })
            .catch((e: unknown) =>
              setError(e instanceof Error ? e.message : "Could not delete this wording."),
            );
        }}
      />
    </div>
  );
}

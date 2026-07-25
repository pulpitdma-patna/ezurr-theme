"use client";

import { useMemo, useState } from "react";
import type { AdminIntegration, AdminIntegrationField } from "@/data/admin";

export type IntegrationConfigSubmit = {
  config: Record<string, string>;
  credentials: Record<string, string>;
};

/**
 * Renders `integration.fields` — the API's per-provider schema — generically.
 *
 * Three rules the previous drawer broke:
 *  - secret fields are write-only: the box starts empty and shows whether a
 *    value is already stored, so a save can never echo a secret back;
 *  - an untouched field is not submitted at all, so the server leaves the
 *    stored value alone (a blank must never blank a credential);
 *  - one explicit Save, not a patch per keystroke.
 */
export function IntegrationConfigForm({
  integration,
  saving,
  onSave,
}: {
  integration: AdminIntegration;
  saving: boolean;
  onSave: (patch: IntegrationConfigSubmit) => void;
}) {
  const fields = integration.fields;
  // Only the keys the admin actually typed into — never the whole schema.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  const editable = useMemo(() => (fields ?? []).filter((f) => !f.readOnly), [fields]);
  const dirty = Object.keys(draft).length > 0;

  if (!fields) {
    return (
      <div className="rounded-xl border border-dashed border-black/[0.12] bg-[#FAFAFB] p-4">
        <div className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
          Configuration
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-[#6E6E73]">
          The field schema is served by the API, so there is nothing to configure in
          demo mode. Point the admin at a running API to edit credentials.
        </p>
      </div>
    );
  }

  if (!fields.length) {
    return (
      <div className="rounded-xl border border-dashed border-black/[0.12] bg-[#FAFAFB] p-4">
        <div className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
          Configuration
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-[#6E6E73]">
          This integration has no configurable fields.
        </p>
      </div>
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const patch: IntegrationConfigSubmit = { config: {}, credentials: {} };
    for (const field of editable) {
      const value = draft[field.key];
      if (value === undefined || value.trim() === "") continue;
      if (field.scope === "credential") patch.credentials[field.key] = value.trim();
      else patch.config[field.key] = value.trim();
    }
    onSave(patch);
    setDraft({});
    setReveal({});
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
          Configuration
        </div>
        {integration.missingRequired?.length ? (
          <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-[#9A3412]">
            {integration.missingRequired.length} required field
            {integration.missingRequired.length === 1 ? "" : "s"} missing
          </span>
        ) : null}
      </div>

      {fields.map((field) => (
        <FieldRow
          key={field.key}
          field={field}
          value={draft[field.key] ?? ""}
          revealed={Boolean(reveal[field.key])}
          onChange={(next) =>
            setDraft((prev) => {
              // Clearing the box means "untouched again", not "blank it".
              if (next === "") {
                const { [field.key]: _dropped, ...rest } = prev;
                return rest;
              }
              return { ...prev, [field.key]: next };
            })
          }
          onToggleReveal={() =>
            setReveal((prev) => ({ ...prev, [field.key]: !prev[field.key] }))
          }
        />
      ))}

      <div className="flex items-center gap-3 border-t border-black/[0.06] pt-3">
        <button
          type="submit"
          disabled={!dirty || saving || !editable.length}
          className="h-9 rounded-lg bg-[#1D1D1F] px-4 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save configuration"}
        </button>
        <p className="text-[11px] leading-relaxed text-[#86868B]">
          {editable.length
            ? "Secrets are encrypted server-side and never sent back to this page. Fields left blank keep their stored value."
            : "Every field here is resolved from the server environment."}
        </p>
      </div>
    </form>
  );
}

function FieldRow({
  field,
  value,
  revealed,
  onChange,
  onToggleReveal,
}: {
  field: AdminIntegrationField;
  value: string;
  revealed: boolean;
  onChange: (value: string) => void;
  onToggleReveal: () => void;
}) {
  const inputId = `integration-field-${field.key}`;
  const isPassword = field.type === "password";
  const caption = fieldCaption(field);

  return (
    <label className="flex flex-col gap-1.5" htmlFor={inputId}>
      <span className="flex items-center gap-2">
        <span className="ez-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#86868B]">
          {field.label}
        </span>
        {field.required ? (
          <span className="ez-mono text-[8px] uppercase tracking-[0.12em] text-[#AEAEB2]">
            required
          </span>
        ) : null}
        <StateChip field={field} />
      </span>

      <div className="flex gap-2">
        {field.type === "select" && field.options ? (
          <select
            id={inputId}
            disabled={field.readOnly}
            value={value || field.value || ""}
            onChange={(event) => onChange(event.target.value)}
            className={controlClass}
          >
            <option value="">Select…</option>
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={inputId}
            type={isPassword && !revealed ? "password" : "text"}
            inputMode={field.type === "url" ? "url" : undefined}
            autoComplete="off"
            disabled={field.readOnly}
            // Secrets never round-trip, so a secret input starts empty and the
            // placeholder — not the value — says whether one is already stored.
            value={field.secret ? value : value || field.value || ""}
            placeholder={secretPlaceholder(field)}
            onChange={(event) => onChange(event.target.value)}
            className={`${controlClass} ${field.secret || field.type === "url" ? "ez-mono text-xs" : ""}`}
          />
        )}
        {isPassword && !field.readOnly ? (
          <button
            type="button"
            onClick={onToggleReveal}
            disabled={!value}
            aria-label={revealed ? "Hide typed value" : "Show typed value"}
            className="h-10 shrink-0 rounded-xl border border-black/[0.1] bg-white px-3 text-[11px] font-semibold text-[#1D1D1F] disabled:opacity-40"
          >
            {revealed ? "Hide" : "Show"}
          </button>
        ) : null}
      </div>

      {caption ? (
        <p className="text-[11px] leading-relaxed text-[#86868B]">{caption}</p>
      ) : null}
    </label>
  );
}

function StateChip({ field }: { field: AdminIntegrationField }) {
  if (!field.secret) return null;
  return field.configured ? (
    <span className="inline-flex rounded bg-[#EAF6ED] px-1.5 py-0.5 text-[10px] font-semibold text-[#2D6B3C]">
      Configured{field.hint ? ` · ${field.hint}` : ""}
    </span>
  ) : (
    <span className="inline-flex rounded bg-[#F0F0F2] px-1.5 py-0.5 text-[10px] font-semibold text-[#6E6E73]">
      Not set
    </span>
  );
}

function secretPlaceholder(field: AdminIntegrationField) {
  if (field.readOnly) return field.configured ? "Set on the server" : "Not set";
  if (!field.secret) return field.type === "url" ? "https://example.com/hooks/ezurr" : "";
  return field.configured ? "Leave blank to keep the stored value" : "Paste the value";
}

function fieldCaption(field: AdminIntegrationField) {
  if (field.readOnly) {
    const source = field.envVar ? `Set via ${field.envVar}` : "Set on the server";
    return field.help ? `${source}. ${field.help}` : `${source}.`;
  }
  return field.help ?? undefined;
}

const controlClass =
  "w-full rounded-xl border border-black/[0.08] bg-[#F7F7F8] px-3 py-2.5 text-sm outline-none transition hover:border-black/[0.12] focus:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] disabled:cursor-not-allowed disabled:opacity-60";

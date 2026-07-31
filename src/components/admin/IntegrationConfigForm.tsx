"use client";

import { useMemo, useState } from "react";
import type { AdminIntegration, AdminIntegrationField } from "@/data/admin";

export type IntegrationConfigSubmit = {
  config: Record<string, string | null>;
  credentials: Record<string, string | null>;
};

/**
 * Renders `integration.fields` — the API's per-provider schema — generically.
 *
 * Rules:
 *  - secret fields are write-only;
 *  - an untouched field is not submitted (blank ≠ clear);
 *  - JSON null clears an optional stored value;
 *  - draft is kept until save succeeds.
 */
export function IntegrationConfigForm({
  integration,
  saving,
  onSave,
}: {
  integration: AdminIntegration;
  saving: boolean;
  onSave: (patch: IntegrationConfigSubmit) => void | Promise<void>;
}) {
  const fields = integration.fields;
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [clearKeys, setClearKeys] = useState<Record<string, true>>({});
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const editable = useMemo(() => (fields ?? []).filter((f) => !f.readOnly), [fields]);
  const dirty =
    Object.keys(draft).some((key) => draft[key].trim() !== "") || Object.keys(clearKeys).length > 0;
  const busy = saving || submitting;

  const missingLabels = useMemo(() => {
    if (!integration.missingRequired?.length || !fields) return [];
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f.label]));
    return integration.missingRequired.map((key) => byKey[key] ?? key);
  }, [fields, integration.missingRequired]);

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

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!dirty || busy) return;

    const patch: IntegrationConfigSubmit = { config: {}, credentials: {} };
    for (const field of editable) {
      if (clearKeys[field.key]) {
        if (field.scope === "credential") patch.credentials[field.key] = null;
        else patch.config[field.key] = null;
        continue;
      }
      const value = draft[field.key];
      if (value === undefined || value.trim() === "") continue;
      if (field.scope === "credential") patch.credentials[field.key] = value.trim();
      else patch.config[field.key] = value.trim();
    }

    if (
      Object.keys(patch.config).length === 0 &&
      Object.keys(patch.credentials).length === 0
    ) {
      return;
    }

    setSubmitting(true);
    try {
      await onSave(patch);
      setDraft({});
      setClearKeys({});
      setReveal({});
    } catch {
      // Parent shows the toast; keep the draft so secrets are not lost.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
          Configuration
        </div>
        {missingLabels.length ? (
          <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-[#9A3412]">
            Missing: {missingLabels.join(", ")}
          </span>
        ) : null}
      </div>

      {fields.map((field) => (
        <FieldRow
          key={field.key}
          field={field}
          value={draft[field.key] ?? ""}
          clearing={Boolean(clearKeys[field.key])}
          revealed={Boolean(reveal[field.key])}
          onChange={(next) =>
            setDraft((prev) => {
              setClearKeys((keys) => {
                if (!keys[field.key]) return keys;
                const { [field.key]: _dropped, ...rest } = keys;
                return rest;
              });
              if (next === "") {
                const { [field.key]: _dropped, ...rest } = prev;
                return rest;
              }
              return { ...prev, [field.key]: next };
            })
          }
          onClear={() => {
            setClearKeys((prev) => ({ ...prev, [field.key]: true }));
            setDraft((prev) => {
              const { [field.key]: _dropped, ...rest } = prev;
              return rest;
            });
          }}
          onUndoClear={() =>
            setClearKeys((prev) => {
              const { [field.key]: _dropped, ...rest } = prev;
              return rest;
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
          disabled={!dirty || busy || !editable.length}
          className="h-9 rounded-lg bg-[#1D1D1F] px-4 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save configuration"}
        </button>
        <p className="text-[11px] leading-relaxed text-[#86868B]">
          {editable.length
            ? "Secrets are encrypted server-side and never sent back. Leave a box blank to keep the stored value; use Clear to remove an optional one."
            : "Every field here is resolved from the server environment."}
        </p>
      </div>
    </form>
  );
}

function FieldRow({
  field,
  value,
  clearing,
  revealed,
  onChange,
  onClear,
  onUndoClear,
  onToggleReveal,
}: {
  field: AdminIntegrationField;
  value: string;
  clearing: boolean;
  revealed: boolean;
  onChange: (value: string) => void;
  onClear: () => void;
  onUndoClear: () => void;
  onToggleReveal: () => void;
}) {
  const inputId = `integration-field-${field.key}`;
  const isPassword = field.type === "password";
  const caption = fieldCaption(field);
  const canClear = !field.readOnly && !field.required && (field.configured || clearing);

  return (
    <label className="flex flex-col gap-1.5" htmlFor={inputId}>
      <span className="flex flex-wrap items-center gap-2">
        <span className="ez-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#86868B]">
          {field.label}
        </span>
        {field.required ? (
          <span className="ez-mono text-[8px] uppercase tracking-[0.12em] text-[#AEAEB2]">
            required
          </span>
        ) : null}
        <StateChip field={field} clearing={clearing} />
      </span>

      {clearing ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-[#B45309]/40 bg-[#FFF7ED] px-3 py-2.5">
          <p className="text-xs text-[#9A3412]">Will clear the stored value on save.</p>
          <button
            type="button"
            onClick={onUndoClear}
            className="text-[11px] font-semibold text-[#1D1D1F] underline-offset-2 hover:underline"
          >
            Undo
          </button>
        </div>
      ) : (
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
          {canClear ? (
            <button
              type="button"
              onClick={onClear}
              className="h-10 shrink-0 rounded-xl border border-black/[0.1] bg-white px-3 text-[11px] font-semibold text-[#9A3412]"
            >
              Clear
            </button>
          ) : null}
        </div>
      )}

      {caption ? (
        <p className="text-[11px] leading-relaxed text-[#86868B]">{caption}</p>
      ) : null}
    </label>
  );
}

function StateChip({ field, clearing }: { field: AdminIntegrationField; clearing: boolean }) {
  if (clearing) {
    return (
      <span className="inline-flex rounded bg-[#FFF7ED] px-1.5 py-0.5 text-[10px] font-semibold text-[#9A3412]">
        Clearing
      </span>
    );
  }
  if (field.viaFallback && !field.configured) {
    return (
      <span className="inline-flex rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-semibold text-[#92400E]">
        Using server env
      </span>
    );
  }
  if (!field.secret && !field.configured) return null;
  return field.configured ? (
    <span className="inline-flex rounded bg-[#EAF6ED] px-1.5 py-0.5 text-[10px] font-semibold text-[#2D6B3C]">
      Configured{field.hint ? ` · ${field.hint}` : ""}
    </span>
  ) : field.secret ? (
    <span className="inline-flex rounded bg-[#F0F0F2] px-1.5 py-0.5 text-[10px] font-semibold text-[#6E6E73]">
      Not set
    </span>
  ) : null;
}

function secretPlaceholder(field: AdminIntegrationField) {
  if (field.readOnly) return field.configured ? "Set on Settings → Store" : "Not set";
  if (!field.secret) return field.type === "url" ? "https://example.com/hooks/ezurr" : "";
  if (field.configured) return "Leave blank to keep the stored value";
  if (field.viaFallback) return "Using server env (not stored yet) — paste to store in DB";
  return "Paste the value";
}

function fieldCaption(field: AdminIntegrationField) {
  if (field.readOnly) {
    const source = field.envVar ? `Set via ${field.envVar}` : "Edited on Settings → Store";
    return field.help ? `${source}. ${field.help}` : `${source}.`;
  }
  if (field.viaFallback && !field.configured) {
    const note = "Using a server env fallback — Connect or Save to store it in the database.";
    return field.help ? `${note} ${field.help}` : note;
  }
  return field.help ?? undefined;
}

const controlClass =
  "w-full rounded-xl border border-black/[0.08] bg-[#F7F7F8] px-3 py-2.5 text-sm outline-none transition hover:border-black/[0.12] focus:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] disabled:cursor-not-allowed disabled:opacity-60";

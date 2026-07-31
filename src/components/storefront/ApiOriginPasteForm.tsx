"use client";

import { useState, type FormEvent } from "react";
import {
  clearApiUrlOverride,
  getApiUrlOverride,
  normalizeApiOrigin,
  setApiUrlOverride,
} from "@/lib/apiOrigin";

const inputClass =
  "mt-1.5 h-12 w-full rounded-[10px] border border-[var(--ez-border)] bg-white px-3.5 text-[15px] text-[var(--ez-ink)] outline-none transition placeholder:text-[var(--ez-subtle)] focus:border-[var(--ez-ink)]";

/**
 * One-time paste of the Laravel API origin when same-origin proxy / env fails.
 * Persists to localStorage and calls onSaved so the parent can re-probe.
 */
export function ApiOriginPasteForm({ onSaved }: { onSaved: () => void }) {
  const existing = typeof window !== "undefined" ? getApiUrlOverride() : null;
  const [value, setValue] = useState(existing ?? "");
  const [error, setError] = useState("");

  function save(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeApiOrigin(value);
    if (!normalized) {
      setError("Paste the API origin, for example https://api.yourdomain.com");
      return;
    }
    try {
      // Absolute http(s) only — relative paths are not an API host.
      const u = new URL(normalized);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        setError("Use an http or https URL.");
        return;
      }
    } catch {
      setError("That does not look like a URL.");
      return;
    }
    setApiUrlOverride(normalized);
    setError("");
    onSaved();
  }

  function forget() {
    clearApiUrlOverride();
    setValue("");
    onSaved();
  }

  return (
    <form onSubmit={save} className="mt-6 space-y-3">
      <label className="block">
        <span className="ez-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ez-subtle)]">
          API origin
        </span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://api.yourdomain.com"
          className={inputClass}
          autoComplete="url"
          inputMode="url"
        />
      </label>
      <p className="text-[12px] leading-relaxed text-[var(--ez-subtle)]">
        No <code className="ez-mono">/api</code> suffix. Saved in this browser only — the API
        must allow this storefront in <code className="ez-mono">CORS_ORIGINS</code>.
      </p>
      {error ? (
        <p role="alert" className="text-[13px] text-[#B42318]">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="inline-flex min-h-[2.75rem] items-center justify-center rounded-[10px] bg-[var(--ez-ink)] px-5 text-sm font-semibold text-white"
        >
          Save &amp; retry
        </button>
        {existing ? (
          <button
            type="button"
            onClick={forget}
            className="inline-flex min-h-[2.75rem] items-center justify-center rounded-[10px] px-4 text-sm font-semibold text-[var(--ez-muted)]"
          >
            Forget saved API URL
          </button>
        ) : null}
      </div>
    </form>
  );
}

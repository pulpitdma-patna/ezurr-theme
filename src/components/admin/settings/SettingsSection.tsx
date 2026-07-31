"use client";

import type { ReactNode } from "react";

export function SettingsSection({
  id,
  title,
  description,
  children,
  danger,
  active,
  status,
  disabled,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  danger?: boolean;
  active: boolean;
  /**
   * Whether what is on this tab is on the server. It lives in the header
   * because that is the scope of the thing being edited — these tabs save as
   * one settings object, so a per-field answer would be thirty copies of one
   * fact — and it stays there permanently rather than passing through a toast.
   */
  status?: ReactNode;
  /**
   * Renders every control inside as unusable. A `fieldset` rather than a prop
   * threaded through thirty inputs, so a control added later cannot forget:
   * the server refuses a settings write from anyone but the owner, and offering
   * a box that will be rejected is worse than not offering it.
   */
  disabled?: boolean;
}) {
  if (!active) return null;

  return (
    <section
      id={`settings-panel-${id}`}
      role="tabpanel"
      aria-labelledby={`settings-tab-${id}`}
      className="min-w-0"
    >
      <header
        className={`flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-b px-3.5 py-2.5 sm:px-4 ${
          danger ? "border-[#F5C2C0]/60 bg-[#FFF8F8]" : "border-black/[0.05] bg-white"
        }`}
      >
        <div className="min-w-0">
          <h2
            className={`text-[13px] font-semibold tracking-[-0.02em] ${
              danger ? "text-[#B42318]" : "text-[#1D1D1F]"
            }`}
          >
            {title}
          </h2>
          {description ? (
            <p
              className={`mt-0.5 max-w-xl text-[11px] leading-relaxed ${
                danger ? "text-[#912018]/80" : "text-[#6E6E73]"
              }`}
            >
              {description}
            </p>
          ) : null}
        </div>
        {status ? (
          <div className="max-w-full shrink-0 sm:max-w-sm sm:text-right">{status}</div>
        ) : null}
      </header>
      <fieldset disabled={disabled} className="min-w-0">
        <div className="space-y-3.5 p-3.5 sm:space-y-4 sm:p-4">{children}</div>
      </fieldset>
    </section>
  );
}

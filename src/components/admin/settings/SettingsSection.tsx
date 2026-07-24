"use client";

import type { ReactNode } from "react";

export function SettingsSection({
  id,
  title,
  description,
  children,
  danger,
  active,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  danger?: boolean;
  active: boolean;
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
        className={`border-b px-3.5 py-2.5 sm:px-4 ${
          danger ? "border-[#F5C2C0]/60 bg-[#FFF8F8]" : "border-black/[0.05] bg-white"
        }`}
      >
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
      </header>
      <div className="space-y-3.5 p-3.5 sm:space-y-4 sm:p-4">{children}</div>
    </section>
  );
}

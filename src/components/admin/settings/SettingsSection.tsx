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
      className={`overflow-hidden rounded-2xl border bg-white shadow-[0_8px_30px_rgba(17,17,19,0.04)] ${
        danger ? "border-[#F5C2C0]" : "border-black/[0.06]"
      }`}
    >
      <header
        className={`border-b px-5 py-4 sm:px-6 ${
          danger ? "border-[#F5C2C0]/80 bg-[#FFF8F8]" : "border-black/[0.06] bg-[#FAFAFB]"
        }`}
      >
        <h2
          className={`text-[17px] font-semibold tracking-[-0.03em] ${
            danger ? "text-[#B42318]" : "text-[#1D1D1F]"
          }`}
        >
          {title}
        </h2>
        {description ? (
          <p className={`mt-1 max-w-xl text-sm ${danger ? "text-[#912018]/80" : "text-[#6E6E73]"}`}>
            {description}
          </p>
        ) : null}
      </header>
      <div className="space-y-5 p-5 sm:p-6">{children}</div>
    </section>
  );
}
